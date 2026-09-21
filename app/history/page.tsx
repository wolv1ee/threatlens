'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Link2, FileText, Loader2 } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'

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
  safe:       { icon: CheckCircle,   cls: 'badge-safe',       label: 'Safe' },
  suspicious: { icon: AlertTriangle, cls: 'badge-suspicious', label: 'Suspicious' },
  dangerous:  { icon: XCircle,       cls: 'badge-dangerous',  label: 'Dangerous' },
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
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-6 md:px-10 py-12 max-w-5xl mx-auto w-full">
        <div className="max-w-xl">
          <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            Scan history
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--ink-dim)' }}>
            The last 50 scans across all users. Records are cleared automatically every 24 hours.
          </p>
        </div>

        {loading && (
          <div className="mt-8 flex items-center gap-2.5 text-sm" style={{ color: 'var(--ink-dim)' }}>
            <Loader2 size={15} className="animate-spin" /> Loading records
          </div>
        )}

        {error && <p className="mt-8 text-sm" style={{ color: 'var(--danger)' }}>Couldn&apos;t load history: {error}</p>}

        {!loading && !error && scans.length === 0 && (
          <div className="mt-8 panel p-10 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>
            No scans yet. Run one from the Scan tab.
          </div>
        )}

        {!loading && scans.length > 0 && (
          <div className="mt-8 panel">
            {scans.map((scan, i) => {
              const Cfg = riskConfig[scan.risk]
              const Icon = scan.type === 'url' ? Link2 : FileText
              const isLast = i === scans.length - 1
              return (
                <div
                  key={scan.id}
                  className="px-5 py-4 flex items-center gap-4"
                  style={{ borderBottom: isLast ? 'none' : '1px solid var(--line-soft)' }}
                >
                  <Icon size={15} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-data truncate" style={{ color: 'var(--ink)' }}>{scan.target}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                      {new Date(scan.scanned_at).toLocaleString()} · {scan.vt_detections}/{scan.vt_total} VirusTotal detections
                    </p>
                  </div>
                  <span className={`badge ${Cfg.cls} shrink-0`}>
                    <Cfg.icon size={12} /> {Cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
