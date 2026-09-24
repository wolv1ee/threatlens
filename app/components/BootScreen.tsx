'use client'

import { useEffect, useState } from 'react'

const LOG = [
  'booting threatlens core...',
  'mounting signature database... OK',
  'establishing secure uplink to virustotal... OK',
  'establishing secure uplink to google safe browsing... OK',
  'loading static yara rule set... OK',
  'access granted',
]

const LINE_DELAY = 220

export default function BootScreen() {
  const [mounted, setMounted] = useState(false)
  const [fading, setFading] = useState(false)
  const [lineCount, setLineCount] = useState(0)

  useEffect(() => {
    if (sessionStorage.getItem('threatlens-booted')) return
    sessionStorage.setItem('threatlens-booted', '1')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    setMounted(true)
    const timers = LOG.map((_, i) =>
      setTimeout(() => setLineCount(i + 1), LINE_DELAY * i + 150)
    )
    const fade = setTimeout(() => setFading(true), LINE_DELAY * LOG.length + 700)
    const unmount = setTimeout(() => setMounted(false), LINE_DELAY * LOG.length + 1200)
    return () => { timers.forEach(clearTimeout); clearTimeout(fade); clearTimeout(unmount) }
  }, [])

  if (!mounted) return null

  return (
    <div className={`boot-screen ${fading ? 'boot-fading' : ''}`} role="status" aria-label="Loading ThreatLens">
      <div className="boot-lines">
        {LOG.slice(0, lineCount).map((line, i) => (
          <p key={line} className="boot-line" style={i === LOG.length - 1 ? { color: 'var(--ink)', fontWeight: 600 } : undefined}>
            {i === LOG.length - 1 ? line : <><span className="boot-ok">$</span> {line}</>}
          </p>
        ))}
        {lineCount < LOG.length && <span className="caret" />}
      </div>
    </div>
  )
}
