import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Link2, FileText, Loader2 } from 'lucide-react'
import { getHistory } from '../lib/api'

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
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getHistory(50)
      .then(d => setScans(d.scans))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
          &gt;_ SCAN HISTORY
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Recent scans stored in Supabase.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 font-mono text-sm" style={{ color: 'var(--muted)' }}>
          <Loader2 size={16} className="animate-spin" /> Loading records...
        </div>
      )}

      {error && <p className="font-mono text-sm" style={{ color: 'var(--danger)' }}>⚠ {error}</p>}

      {!loading && scans.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          className="rounded-xl p-10 text-center font-mono text-sm" style2={{ color: 'var(--muted)' }}>
          No scans yet. Go scan something!
        </div>
      )}

      <div className="space-y-2">
        {scans.map(scan => {
          const Cfg = riskConfig[scan.risk]
          const Icon = scan.type === 'url' ? Link2 : FileText
          return (
            <div key={scan.id}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              className="rounded-lg px-5 py-4 flex items-center gap-4">
              <Cfg.icon size={18} className={scan.risk} style={{ flexShrink: 0 }} />
              <Icon size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm truncate" style={{ color: 'var(--text)' }}>{scan.target}</p>
                <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {new Date(scan.scanned_at).toLocaleString()} &middot; {scan.vt_detections}/{scan.vt_total} VT detections
                </p>
              </div>
              <span className={`font-mono text-xs px-2 py-1 rounded shrink-0 ${Cfg.cls}`}>{Cfg.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
