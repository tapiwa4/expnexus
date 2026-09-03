import { useState } from 'react'
import type { FormEvent } from 'react'
import { submitInquiry } from './api'
import { Logo } from './Logo'
import { Header } from './Header'
import { Footer } from './Footer'
import './App.css'

const BUDGET_OPTIONS = [
  { value: 'unsure', label: 'Not sure yet' },
  { value: 'under_500', label: 'Under $500' },
  { value: '500_2000', label: '$500 – $2,000' },
  { value: '2000_5000', label: '$2,000 – $5,000' },
  { value: 'over_5000', label: 'Over $5,000' },
]

function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('sending')
    try {
      await submitInquiry({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        company: String(data.get('company') ?? ''),
        budget: String(data.get('budget') ?? 'unsure'),
        message: String(data.get('message') ?? ''),
      })
      form.reset()
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p className="form-success">
        Thanks — your message is in. We’ll get back to you within one business day.
      </p>
    )
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Name
          <input name="name" required maxLength={100} placeholder="Your name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required placeholder="you@company.com" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Company <span className="optional">(optional)</span>
          <input name="company" maxLength={100} placeholder="Company or project name" />
        </label>
        <label>
          Budget
          <select name="budget" defaultValue="unsure">
            {BUDGET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        What do you need?
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Tell us about your project — what it's for, any deadlines, sites you like…"
        />
      </label>
      <button type="submit" className="btn primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send inquiry'}
      </button>
      {status === 'error' && (
        <p className="form-error">Something went wrong — please try again in a moment.</p>
      )}
    </form>
  )
}

export function HomePage() {
  return (
    <div className="app">
      <Header />

      <section className="hero" id="top">
        <div className="container">
          <Logo className="hero-logo" />
          <h1>
            Websites that win you <span className="brand-accent">customers.</span>
          </h1>
          <p className="lede">
            ExpNexus designs and builds fast, modern websites for growing businesses —
            from first impression to online store.
          </p>
          <div className="hero-actions">
            <a href="#contact" className="btn primary">Get a quote</a>
          </div>
        </div>
      </section>

      <section className="section alt" id="contact">
        <div className="container narrow">
          <h2>Let’s build yours</h2>
          <p className="muted center">
            Tell us about your project and we’ll reply with a free, no-obligation quote.
          </p>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </div>
  )
}
