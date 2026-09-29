import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { submitInquiry } from './api'
import { Logo } from './Logo'
import { Header } from './Header'
import { Footer } from './Footer'
import { usePageMeta } from './routeMeta'
import './App.css'

const BUDGET_OPTIONS = [
  { value: 'unsure', label: 'Not sure yet' },
  { value: 'under_500', label: 'Under $500' },
  { value: '500_2000', label: '$500 – $2,000' },
  { value: '2000_5000', label: '$2,000 – $5,000' },
  { value: 'over_5000', label: 'Over $5,000' },
]

const AI_BENEFITS = [
  {
    title: 'Faster builds, lower cost',
    description: 'AI-assisted coding and content drafting cuts build time, which can mean lower prices or faster turnaround for you.',
  },
  {
    title: 'AI built into your site',
    description: 'Chatbots, smart search, personalized content, auto-generated product descriptions — AI features baked into what we build for you.',
  },
  {
    title: 'Better copy, faster',
    description: "AI-drafted headlines and descriptions you can refine, instead of staring at a blank page.",
  },
]

const PROCESS_STEPS = [
  {
    title: 'Discovery',
    description: 'A short call to understand your business, your customers, and what the site actually needs to do.',
  },
  {
    title: 'Design',
    description: "You'll see real mockups of your site before any code is written, so there are no surprises.",
  },
  {
    title: 'Build',
    description: 'We build it fast, test it thoroughly, and keep you updated as it comes together.',
  },
  {
    title: 'Launch & support',
    description: "We launch, make sure everything works, and stick around for fixes and updates after.",
  },
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
  usePageMeta('/')

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

      <section className="section" id="web-development">
        <div className="container center">
          <span className="section-eyebrow">AI-Powered Web Development</span>
          <h2>Smarter builds. Better results.</h2>
          <div className="grid ai-benefits-grid">
            {AI_BENEFITS.map((benefit) => (
              <div key={benefit.title} className="ai-benefit">
                <h3>{benefit.title}</h3>
                <p className="muted">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt" id="process">
        <div className="container">
          <h2>How we work</h2>
          <div className="grid process-grid">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.title} className="process-step">
                <span className="process-number">{i + 1}</span>
                <h3>{step.title}</h3>
                <p className="muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="capability">
        <div className="container narrow center">
          <span className="section-eyebrow">Beyond websites</span>
          <h2>We don't just design sites — we build real tools</h2>
          <p className="muted center">
            SecureMail Sentinel is a live security scanner we built and run ourselves — real
            DNS, SPF/DKIM/DMARC, and blacklist checks, not a mockup. It's proof of the kind of
            engineering that goes into everything we ship.
          </p>
          <p className="proof-statement">
            “We build sites that both people and AI can actually find.”
          </p>
          <Link to="/security-scan" className="btn primary">Try SecureMail Sentinel</Link>
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
