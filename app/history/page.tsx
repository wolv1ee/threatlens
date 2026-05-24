'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, Terminal, Clock, CheckCircle, AlertTriangle, XCircle, Link2, FileText, Loader2 } from 'lucide-react'

interface Scan {
  id: string
  type: 'url' | 'file'
  target: string
  risk: 'safe' | 'suspicious' | 'dangerous'
  vt_detections: number
  vt_total: number
  scanned_at: string
}

const riskConfig = {
  safe:       { icon: CheckCircle,   cls: 'badge-safe',       label: 'SAFE' },
  suspicious: { icon: AlertTriangle, cls: 'badge-suspicious', label: 'SUSPICIOUS' },
  dangerous:  { icon: XCircle,       cls: 'badge-dangerous',  label: 'DANGEROUS' },
}

export default function HistoryPage() {
  const [scans, setScans]     = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(d => setScans(d.scans ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'radial-gradient(ellipse at top left, #0d1f3c 0%, #080b12 50%, #0a0f1a 100%)',
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,245,160,0.06) 0%, transparent 70%)',
          top: '-200px', left: '-100px',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,100,255,0.05) 0%, transparent 70%)',
          bottom: '-100px', right: '-100px',
        }} />
      </div>

      <header style={{
        background: 'rgba(14, 20, 32, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 245, 160, 0.1)',
        position: 'relative', zIndex: 10,
      }} className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            color: 'var(--accent)',
            background: 'rgba(0, 245, 160, 0.1)',
            border: '1px solid rgba(0, 245, 160, 0.2)',
          }} className="p-2 rounded-lg">
            <Shield size={22} />
          </div>
          <div>
            <span className="font-mono font-bold text-lg tracking-tight" style={{ color: 'var(--accent)' }}>
              THREAT<span style={{ color: 'var(--text)' }}>LENS</span>
            </span>
            <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>malware and phishing analyzer</div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all nav-hover"
            style={{ color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Terminal size={14} /> SCAN
          </Link>
          <span className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#000' }}>
            <Clock size={14} /> HISTORY
          </span>
        </nav>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6" style={{ position: 'relative', zIndex: 1 }}>
        <div className="animate-fade-in-up delay-1">
          <h1 className="font-mono text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
            &gt;_ SCAN HISTORY
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Recent scans stored in Supabase.</p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 font-mono text-sm" style={{ color: 'var(--muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading records...
          </div>
        )}

        {error && <p className="font-mono text-sm" style={{ color: 'var(--danger)' }}>Error: {error}</p>}

        {!loading && scans.length === 0 && (
          <div className="rounded-xl p-10 text-center font-mono text-sm animate-fade-in-up delay-2" style={{
            background: 'rgba(14, 20, 32, 0.5)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'var(--muted)',
          }}>
            No scans yet. Go scan something!
          </div>
        )}

        <div className="space-y-2 animate-fade-in-up delay-2">
          {scans.map(scan => {
            const Cfg = riskConfig[scan.risk]
            const Icon = scan.type === 'url' ? Link2 : FileText
            return (
              <div key={scan.id} className="rounded-lg px-5 py-4 flex items-center gap-4 card-hover" style={{
                background: 'rgba(14, 20, 32, 0.5)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <Cfg.icon size={18} className={scan.risk} style={{ flexShrink: 0 }} />
                <Icon size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate" style={{ color: 'var(--text)' }}>{scan.target}</p>
                  <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {new Date(scan.scanned_at).toLocaleString()} · {scan.vt_detections}/{scan.vt_total} VT detections
                  </p>
                </div>
                <span className={`font-mono text-xs px-2 py-1 rounded shrink-0 ${Cfg.cls}`}>{Cfg.label}</span>
              </div>
            )
          })}
        </div>
      </main>

      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(8,11,18,0.6)',
        backdropFilter: 'blur(10px)',
        position: 'relative', zIndex: 1,
      }} className="py-4 text-center font-mono text-xs">
        <span style={{ color: 'var(--muted)' }}>Powered by VirusTotal and Google Safe Browsing</span>
        <span style={{ color: 'var(--muted)', margin: '0 8px' }}>·</span>
        <a href="https://saadmahmud.dev" target="_blank" rel="noopener noreferrer"
          className="link-hover" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Built by Saad Mahmud
        </a>
      </footer>
    </div>
  )
}