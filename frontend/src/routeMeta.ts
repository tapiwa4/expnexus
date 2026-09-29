import { useEffect } from 'react'

export interface RouteMeta {
  title: string
  description: string
}

// Single source of truth for per-route title/description: entry-server.tsx uses this
// to bake real <title>/<meta> tags into each prerendered HTML file (what crawlers see),
// and usePageMeta below keeps document.title in sync during client-side navigation
// (when a visitor clicks a Link instead of loading the URL fresh).
export const routeMeta: Record<string, RouteMeta> = {
  '/': {
    title: 'ExpNexus — Web Design & Development',
    description:
      'ExpNexus designs and builds fast, modern websites for growing businesses — ' +
      'from first impression to online store.',
  },
  '/security-scan': {
    title: 'Security Check — SecureMail Sentinel | ExpNexus',
    description:
      'Check any email address or domain for the warning signs scammers exploit — ' +
      'SPF, DKIM, DMARC, blacklist status, and more. Free basic check, deep scan available.',
  },
  '/security-scan/email': {
    title: 'Email Scan — SecureMail Sentinel | ExpNexus',
    description:
      'Check any email address, including Gmail and professional inboxes, for the ' +
      'security warning signs scammers exploit.',
  },
}

export function usePageMeta(path: string) {
  useEffect(() => {
    const meta = routeMeta[path]
    if (meta) document.title = meta.title
  }, [path])
}
