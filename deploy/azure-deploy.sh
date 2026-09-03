#!/usr/bin/env bash
# Provisions ExpNexus on Azure: Container Apps (backend + frontend + self-hosted
# Postgres), Azure Container Registry, and a Storage Account (Postgres volume + media).
#
# Run from Cloud Shell, from the root of a clone of this repo:
#   git clone https://github.com/tapiwa4/expnexus.git
#   cd expnexus
#   bash deploy/azure-deploy.sh
set -euo pipefail

RESOURCE_GROUP="expnexus-rg"
LOCATION="southafricanorth"
# `od -N` reads a bounded number of bytes and exits on its own, unlike piping an
# infinite /dev/urandom stream into `head -c` — that pattern kills the upstream
# process with SIGPIPE the instant `head` stops reading, which `set -o pipefail`
# (correctly) treats as a fatal error even though the captured output is fine.
SUFFIX=$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
ACR_NAME="expnexusacr${SUFFIX}"
STORAGE_ACCOUNT="expnexusst${SUFFIX}"
ENV_NAME="expnexus-env"
PG_PASSWORD=$(od -An -N18 -tx1 /dev/urandom | tr -d ' \n')
DJANGO_SECRET=$(od -An -N37 -tx1 /dev/urandom | tr -d ' \n')

echo "== Resource group =="
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

echo "== Container Apps extension + resource providers =="
az extension add --name containerapp --upgrade -o none 2>/dev/null || true
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait

echo "== Container Registry =="
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true -o none

echo "== Building backend image (this takes a few minutes) =="
# --file is relative to the source directory (the last argument), not the cwd.
az acr build --registry "$ACR_NAME" --image expnexus-backend:latest --file Dockerfile ./backend

echo "== Building frontend image =="
az acr build --registry "$ACR_NAME" --image expnexus-frontend:latest --file Dockerfile ./frontend

ACR_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USER=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASS=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

echo "== Storage account (Postgres volume + media blobs) =="
az storage account create --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" --sku Standard_LRS -o none
STORAGE_KEY=$(az storage account keys list --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" --query "[0].value" -o tsv)

az storage share-rm create --resource-group "$RESOURCE_GROUP" --storage-account "$STORAGE_ACCOUNT" \
  --name postgres-data --quota 10 -o none
az storage container create --name media --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" --public-access blob -o none

echo "== Container Apps environment =="
az containerapp env create --name "$ENV_NAME" --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" -o none

az containerapp env storage set --name "$ENV_NAME" --resource-group "$RESOURCE_GROUP" \
  --storage-name postgres-data-storage --azure-file-account-name "$STORAGE_ACCOUNT" \
  --azure-file-account-key "$STORAGE_KEY" --azure-file-share-name postgres-data \
  --access-mode ReadWrite -o none

ENV_ID=$(az containerapp env show --name "$ENV_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)

echo "== Deploying Postgres (internal only, pinned to 1 replica) =="
cat > /tmp/db-app.yaml <<EOF
location: ${LOCATION}
resourceGroup: ${RESOURCE_GROUP}
type: Microsoft.App/containerApps
name: expnexus-db
properties:
  managedEnvironmentId: ${ENV_ID}
  configuration:
    ingress:
      external: false
      targetPort: 5432
      transport: tcp
    secrets:
      - name: pg-password
        value: ${PG_PASSWORD}
  template:
    containers:
      - name: postgres
        image: postgres:16-alpine
        resources:
          cpu: 0.5
          memory: 1Gi
        env:
          - name: POSTGRES_DB
            value: expnexus
          - name: POSTGRES_USER
            value: expnexus
          - name: POSTGRES_PASSWORD
            secretRef: pg-password
          - name: PGDATA
            value: /var/lib/postgresql/data/pgdata
        volumeMounts:
          - volumeName: postgres-data
            mountPath: /var/lib/postgresql/data
    volumes:
      - name: postgres-data
        storageType: AzureFile
        storageName: postgres-data-storage
    scale:
      minReplicas: 1
      maxReplicas: 1
EOF
az containerapp create --yaml /tmp/db-app.yaml -o none

DB_FQDN=$(az containerapp show --name expnexus-db --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "== Deploying backend =="
az containerapp create \
  --name expnexus-backend --resource-group "$RESOURCE_GROUP" --environment "$ENV_NAME" \
  --image "${ACR_SERVER}/expnexus-backend:latest" \
  --registry-server "$ACR_SERVER" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --target-port 8000 --ingress external \
  --min-replicas 0 --max-replicas 2 \
  --secrets pg-password="$PG_PASSWORD" django-secret="$DJANGO_SECRET" storage-key="$STORAGE_KEY" \
  --env-vars \
    POSTGRES_HOST="$DB_FQDN" POSTGRES_PORT=5432 POSTGRES_DB=expnexus POSTGRES_USER=expnexus \
    POSTGRES_PASSWORD=secretref:pg-password \
    DJANGO_SECRET_KEY=secretref:django-secret DJANGO_DEBUG=False \
    AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT" AZURE_STORAGE_ACCOUNT_KEY=secretref:storage-key \
    AZURE_STORAGE_CONTAINER=media \
  -o none

BACKEND_FQDN=$(az containerapp show --name expnexus-backend --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "== Deploying frontend =="
az containerapp create \
  --name expnexus-frontend --resource-group "$RESOURCE_GROUP" --environment "$ENV_NAME" \
  --image "${ACR_SERVER}/expnexus-frontend:latest" \
  --registry-server "$ACR_SERVER" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --target-port 80 --ingress external \
  --min-replicas 0 --max-replicas 2 \
  --env-vars BACKEND_ORIGIN="https://${BACKEND_FQDN}" \
  -o none

FRONTEND_FQDN=$(az containerapp show --name expnexus-frontend --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "== Wiring backend to trust/allow the frontend's URL =="
az containerapp update --name expnexus-backend --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    DJANGO_ALLOWED_HOSTS="$BACKEND_FQDN" \
    DJANGO_CORS_ALLOWED_ORIGINS="https://${FRONTEND_FQDN}" \
    DJANGO_CSRF_TRUSTED_ORIGINS="https://${FRONTEND_FQDN},https://${BACKEND_FQDN}" \
  -o none

echo ""
echo "=============================================="
echo "Done."
echo "Frontend:  https://${FRONTEND_FQDN}"
echo "Backend:   https://${BACKEND_FQDN}"
echo "Admin:     https://${BACKEND_FQDN}/admin/"
echo ""
echo "Resource group: ${RESOURCE_GROUP}"
echo "Container Registry: ${ACR_NAME}"
echo "Storage account: ${STORAGE_ACCOUNT}"
echo ""
echo "Postgres password (save this, shown only once): ${PG_PASSWORD}"
echo "Django secret key (save this, shown only once): ${DJANGO_SECRET}"
echo "=============================================="
