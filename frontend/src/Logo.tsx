import { useId } from 'react'

interface LogoProps {
  className?: string
}

// Rendered inline (not via <img src>) so the browser actually runs the
// CSS keyframe animations defined in App.css — SVGs loaded through <img>
// (including data: URIs) are frozen to a static frame in most browsers.
export function Logo({ className }: LogoProps) {
  const gradientId = useId()

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 240"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradientId} cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#5b8bef" />
          <stop offset="60%" stopColor="#3a63c9" />
          <stop offset="100%" stopColor="#274a9e" />
        </radialGradient>
      </defs>

      <g className="logo-orbit">
        <circle
          className="logo-ring"
          cx="120"
          cy="120"
          r="104"
          fill="none"
          stroke="#e51e2b"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="0.1 15"
        />
        <g strokeWidth="4" strokeLinecap="round">
          <line className="logo-spoke" x1="120" y1="16" x2="120" y2="50" stroke="#e51e2b" />
          <line className="logo-spoke logo-alt" x1="21.1" y1="87.9" x2="53.4" y2="98.4" stroke="#e51e2b" />
          <line className="logo-spoke logo-alt" x1="218.9" y1="87.9" x2="186.6" y2="98.4" stroke="#e51e2b" />
          <line className="logo-spoke" x1="58.8" y1="204.1" x2="78.8" y2="176.6" stroke="#e51e2b" />
          <line className="logo-spoke" x1="181.2" y1="204.1" x2="161.2" y2="176.6" stroke="#e51e2b" />
        </g>
        <g>
          <circle className="logo-node" cx="120" cy="16" r="11" fill="#e51e2b" />
          <circle className="logo-node logo-alt" cx="21.1" cy="87.9" r="11" fill="#e51e2b" />
          <circle className="logo-node logo-alt" cx="218.9" cy="87.9" r="11" fill="#e51e2b" />
          <circle className="logo-node" cx="58.8" cy="204.1" r="11" fill="#e51e2b" />
          <circle className="logo-node" cx="181.2" cy="204.1" r="11" fill="#e51e2b" />
        </g>
      </g>

      <circle cx="120" cy="120" r="64" fill={`url(#${gradientId})`} />
      <g fill="none" stroke="#ffffff" strokeWidth="2.4" strokeOpacity="0.92">
        <circle cx="120" cy="120" r="64" />
        <ellipse cx="120" cy="120" rx="44" ry="64" />
        <ellipse cx="120" cy="120" rx="20" ry="64" />
        <ellipse cx="120" cy="120" rx="64" ry="44" />
        <ellipse cx="120" cy="120" rx="64" ry="20" />
        <line x1="120" y1="56" x2="120" y2="184" />
        <line x1="56" y1="120" x2="184" y2="120" />
      </g>
    </svg>
  )
}
