export interface InquiryPayload {
  name: string
  email: string
  company: string
  budget: string
  message: string
}

export async function submitInquiry(payload: InquiryPayload): Promise<void> {
  const res = await fetch('/api/inquiries/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail ? JSON.stringify(detail) : `Request failed: ${res.status}`)
  }
}

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'inconclusive' | 'skip' | 'coming_soon'

export interface ScanFinding {
  check: string
  status: CheckStatus
  explanation: string
}

export interface ScanLayer {
  layer: number
  name: string
  summary: string
  findings: ScanFinding[]
}

export interface ScanResult {
  tier: 'free' | 'premium'
  target: string
  domain: string
  layers: ScanLayer[]
  upsell?: string
  code_remaining?: number
}

export class ScanError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function postScan(path: string, body: Record<string, string | boolean>): Promise<ScanResult> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ScanError(data.error ?? `Request failed: ${res.status}`, res.status)
  }
  return data as ScanResult
}

export const runFreeScan = (target: string, emailOnly: boolean) =>
  postScan('/api/scanner/free-scan/', { target, email_only: emailOnly })

export const runDeepScan = (target: string, code: string, emailOnly: boolean) =>
  postScan('/api/scanner/deep-scan/', { target, code, email_only: emailOnly })
