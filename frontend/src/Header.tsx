import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

const SERVICES_LINKS = [
  { to: '/security-scan', label: 'Security Check' },
  { to: '/security-scan/email', label: 'Email Scan' },
]

export function Header() {
  const [servicesOpen, setServicesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!servicesOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setServicesOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setServicesOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [servicesOpen])

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <Logo className="brand-mark" />
          <span className="brand-text">Exp<span className="brand-accent">Nexus</span></span>
        </Link>

        <nav className="nav">
          <div className="nav-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="nav-dropdown-toggle"
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              onClick={() => setServicesOpen((open) => !open)}
            >
              Services
              <span className={servicesOpen ? 'chevron open' : 'chevron'} aria-hidden="true">▾</span>
            </button>

            <div className={servicesOpen ? 'nav-dropdown-menu open' : 'nav-dropdown-menu'}>
              {SERVICES_LINKS.map((link) => (
                <Link key={link.label} to={link.to} onClick={() => setServicesOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <a href="/#contact" className="btn small">Get a quote</a>
        </nav>
      </div>
    </header>
  )
}
