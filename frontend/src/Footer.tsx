import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} ExpNexus. Web design &amp; development.</span>
        <Link to="/security-scan" className="footer-link">
          🔒 Check your email &amp; domain security
        </Link>
      </div>
    </footer>
  )
}
