import { useState } from 'react'
import type { FormEvent } from 'react'
import { runFreeScan, runDeepScan, ScanError } from './api'
import type { CheckStatus, ScanLayer, ScanResult } from './api'
import { Header } from './Header'
import { Footer } from './Footer'
import { downloadScanReportPdf } from './report'
import './App.css'
import './ScannerPage.css'

const STATUS_META: Record<CheckStatus, { icon: string; label: string; className: string }> = {
  pass: { icon: '✓', label: 'Looks good', className: 'status-pass' },
  warn: { icon: '!', label: 'Worth a look', className: 'status-warn' },
  fail: { icon: '✕', label: 'Needs attention', className: 'status-fail' },
  inconclusive: { icon: '?', label: 'Inconclusive', className: 'status-neutral' },
  skip: { icon: '–', label: 'Skipped', className: 'status-neutral' },
  coming_soon: { icon: '★', label: 'Coming soon', className: 'status-neutral' },
}

const EMAIL_ONLY_ERROR =
  'Email Scan checks a specific inbox, so it needs a full email address (e.g. you@gmail.com) — ' +
  'not just a domain. For domain-only checks, use Security Check instead.'

interface ScannerPageProps {
  mode?: 'both' | 'email'
}

function ResultLayers({ layers }: { layers: ScanLayer[] }) {
  return (
    <div className="scan-layers">
      {layers.map((layer) => (
        <div key={layer.layer} className="scan-layer">
          <div className="scan-layer-head">
            <h3>Layer {layer.layer}: {layer.name}</h3>
            <span className="muted">{layer.summary}</span>
          </div>
          <ul className="finding-list">
            {layer.findings.map((f) => {
              const meta = STATUS_META[f.status]
              return (
                <li key={f.check} className={`finding ${meta.className}`}>
                  <span className="finding-icon" aria-hidden="true">{meta.icon}</span>
                  <div>
                    <p className="finding-check">
                      {f.check} <span className="finding-tag">{meta.label}</span>
                    </p>
                    <p className="finding-explanation">{f.explanation}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function ScannerPage({ mode = 'both' }: ScannerPageProps) {
  const emailOnly = mode === 'email'

  const [target, setTarget] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dailyLimitHit, setDailyLimitHit] = useState(false)
  const [loading, setLoading] = useState(false)

  const [code, setCode] = useState('')
  const [deepLoading, setDeepLoading] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)

  async function handleFreeScan(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setDailyLimitHit(false)

    if (emailOnly && !target.includes('@')) {
      setError(EMAIL_ONLY_ERROR)
      return
    }

    setLoading(true)
    try {
      const data = await runFreeScan(target, emailOnly)
      setResult(data)
    } catch (err) {
      if (err instanceof ScanError && err.status === 429) {
        setDailyLimitHit(true)
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDeepScan(event: FormEvent) {
    event.preventDefault()
    setDeepError(null)

    const deepTarget = target || result?.target || ''
    if (emailOnly && !deepTarget.includes('@')) {
      setDeepError(EMAIL_ONLY_ERROR)
      return
    }

    setDeepLoading(true)
    try {
      const data = await runDeepScan(deepTarget, code, emailOnly)
      setResult(data)
    } catch (err) {
      setDeepError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setDeepLoading(false)
    }
  }

  return (
    <div className="app">
      <Header />

      <section className="scanner-hero">
        <div className="container narrow">
          <span className="eyebrow">SecureMail Sentinel</span>
          {emailOnly ? (
            <>
              <h1>Is your email safe from hackers?</h1>
              <p className="lede">
                Enter any email address — Gmail, a professional inbox, or your company's own — and
                we'll check it for the warning signs scammers exploit.
              </p>
            </>
          ) : (
            <>
              <h1>Is your email or domain safe from hackers?</h1>
              <p className="lede">
                Enter any email address or domain — Gmail, a professional inbox, or your company's own
                domain — and we'll check it for the warning signs scammers exploit.
              </p>
            </>
          )}

          <form className="scan-form" onSubmit={handleFreeScan}>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={emailOnly ? 'you@gmail.com' : 'you@company.com or company.com'}
              required
            />
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Scanning…' : 'Run free check'}
            </button>
          </form>
          {error && <p className="form-error">{error}</p>}
          {dailyLimitHit && (
            <p className="scan-notice">
              You've used today's free check. Come back tomorrow, or unlock a full 4-layer scan below.
            </p>
          )}
        </div>
      </section>

      {result && (
        <section className="section">
          <div className="container">
            <div className="results-head">
              <h2>Results for {result.target}</h2>
              <button type="button" className="btn small" onClick={() => downloadScanReportPdf(result)}>
                Download PDF report
              </button>
            </div>
            <ResultLayers layers={result.layers} />
            {result.tier === 'free' && result.upsell && (
              <p className="muted center upsell-note">{result.upsell}</p>
            )}
            {result.tier === 'premium' && (
              <p className="muted center upsell-note">
                Full 4-layer scan complete. Access code uses remaining: {result.code_remaining}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="section alt" id="upgrade">
        <div className="container narrow">
          <h2>Get the full 4-layer scan</h2>
          <p className="muted center">
            A deep scan also checks email authentication (SPF/DKIM/DMARC), server reputation and
            encryption, and domain risk — a one-time $9 check, no subscription.
          </p>

          <form className="scan-form" onSubmit={handleDeepScan}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your access code"
              required
            />
            <button type="submit" className="btn primary" disabled={deepLoading}>
              {deepLoading ? 'Scanning…' : 'Unlock deep scan'}
            </button>
          </form>
          {deepError && <p className="form-error">{deepError}</p>}

          <p className="muted center scan-checkout-note">
            Don't have a code yet? Online checkout is being set up —{' '}
            <a href="/#contact">contact us</a> and we'll arrange your deep scan directly.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
