# ExpNexus

Web design agency website. React (TypeScript, Vite) frontend + Django REST Framework backend.
All site content (services, portfolio projects, testimonials) is managed in the Django admin —
no code changes needed to update the site.

## Structure

```
expnexus/
├── backend/          # Django 6 + DRF API
│   ├── config/       # Settings & root URLs
│   ├── accounts/     # Custom User model (future-proofing for client portal)
│   ├── portfolio/    # Service, Project, Testimonial models + read-only API
│   ├── inquiries/    # Contact-form submissions (Inquiry model, POST-only API)
│   └── scanner/      # SecureMail Sentinel — email/domain security scan API
└── frontend/         # React 19 + Vite + TypeScript, three routes (react-router)
    ├── HomePage.tsx      # Hero + contact form ("/")
    ├── ScannerPage.tsx   # SecureMail Sentinel — "Security Check" ("/security-scan",
    │                     #   accepts email or domain) and "Email Scan"
    │                     #   ("/security-scan/email", email addresses only)
    └── report.ts         # Client-side PDF report generation (jsPDF)
```

## Running locally

Backend (API + admin on http://127.0.0.1:8000):

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py runserver
```

Frontend (http://localhost:5173 — proxies `/api` and `/media` to Django):

```powershell
cd frontend
npm run dev
```

## Managing content

Log into http://127.0.0.1:8000/admin/ — username `admin`, password `expnexus-admin-123`
(**change this before deploying**: `manage.py changepassword admin`).

- **Projects** — portfolio items; upload an image, tick "featured", drag order
- **Services** — what you offer, with optional "from" pricing
- **Testimonials** — client quotes, optionally linked to a project
- **Inquiries** — contact-form submissions land here (read-only; mark as read)
- **Premium access codes** (Scanner) — issue one to a customer who's paid for a deep
  scan outside Stripe (bank transfer, invoice, etc.); each code is single- or
  multi-use and unlocks the full 4-layer scan for that many runs

## API endpoints

- `GET /api/services/` · `GET /api/projects/` (`?featured=true`) · `GET /api/testimonials/`
- `POST /api/inquiries/` — contact form (throttled to 10/hour per IP)
- `POST /api/scanner/free-scan/` — Layer 1 only (DNS/MX validation), throttled to 1/day per IP
- `POST /api/scanner/deep-scan/` — all 4 layers, requires a valid `PremiumAccessCode`

Both accept an optional `email_only: true` field — when set, the target must be a full
email address (used by the "Email Scan" page); otherwise a domain or email is accepted
(used by "Security Check"). Enforced both client-side (immediate feedback) and
server-side (`scanner/views.py::validate_target`, defense in depth).

## SecureMail Sentinel (email & domain security scanner)

Real checks, no fabricated results — every finding comes from an actual DNS/SMTP/RDAP
lookup against the target (see `backend/scanner/checks.py`):

- **Layer 1 — Basic DNS Validation** (free): domain resolves, MX record present
- **Layer 2 — Email Authentication**: SPF, DKIM (common selectors only — this is
  best-effort, many providers use custom selectors we can't guess), DMARC + policy
- **Layer 3 — Reputation & Transport Security**: Spamhaus ZEN blacklist check, STARTTLS support
- **Layer 4 — Domain Risk**: domain age via RDAP. **Breach exposure is not implemented** —
  it needs a paid third-party subscription (e.g. HaveIBeenPwned's API); the UI shows it
  as "coming soon" rather than faking data

**Known limitation, not a bug:** the Spamhaus blacklist check can show "inconclusive" in
sandboxed/containerized environments whose default DNS resolver doesn't work — the code
falls back to a public resolver (8.8.8.8), but Spamhaus's free tier blocks queries that
arrive via well-known public resolvers and returns an error code, which is correctly
detected and reported as inconclusive (not a false "blacklisted"). This should resolve
itself on normal hosting with a working default resolver — verify once deployed.

**PDF report**: both scan pages show a "Download PDF report" button on results, generated
entirely client-side (`frontend/src/report.ts`, using jsPDF) from the same findings shown
on screen — no server round-trip, no stored copy.

**Payment**: Stripe isn't wired in yet. Deep scans are unlocked with a `PremiumAccessCode`
issued manually via the admin, as a stand-in until Stripe Checkout is connected. To wire
real payment: create a Stripe account, get the API keys from Developers → API keys, and
have Claude wire a Checkout session for the $9 deep-scan purchase that creates an access
code via webhook on success.

**Gotcha for any new public endpoint**: set `authentication_classes = []` on it. DRF's
default `SessionAuthentication` enforces CSRF the moment it recognizes a logged-in session
cookie — so a visitor who happens to be logged into `/admin/` in the same browser gets a
403 on an otherwise-anonymous endpoint. Hit this while building the scanner and contact
form; both are fixed.

## Before deploying

- Swap SQLite for Postgres in `config/settings.py` (`DATABASES`)
- Move `SECRET_KEY` to an environment variable; set `DEBUG = False` and `ALLOWED_HOSTS`
- Change the admin password
- Serve `media/` (uploaded project images) from proper storage, e.g. Azure Blob
- Configure a shared cache (e.g. Redis) for `CACHES` — the free-scan daily rate limit
  uses Django's cache framework, which defaults to per-process memory and won't work
  correctly across multiple worker processes/replicas without one
- Deploys to a separate Azure account (not the ClinSCo subscription)
