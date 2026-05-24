import { useState, useRef } from 'react'
import { Link2, Upload, AlertTriangle, CheckCircle, XCircle, Loader2, ShieldAlert } from 'lucide-react'
import { scanUrl, scanFile } from '../lib/api'

type RiskLevel = 'safe' | 'suspicious' | 'dangerous'

interface ScanResult {
  type: 'url' | 'file'
  risk: RiskLevel
  target: string
  google_safe_browsing?: { safe: boolean; threats: string[]; skipped?: boolean }
  virustotal?: { safe: boolean; detections: number; total: number; skipped?: boolean; pending?: boolean }
  sha256?: string
  size_bytes?: number
  scanned_at: string
}

const riskConfig = {
  safe:       { icon: CheckCircle,   label: 'SAFE',       cls: 'badge-safe' },
  suspicious: { icon: AlertTriangle, label: 'SUSPICIOUS',  cls: 'badge-suspicious' },
  dangerous:  { icon: XCircle,       label: 'DANGEROUS',  cls: 'badge-dangerous' },
}

export default function ScanPage() {
  const [tab, setTab]         = useState<'url' | 'file'>('url')
  const [url, setUrl]         = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<ScanResult | null>(null)
  const [error, setError]     = useState('')
  const fileRef               = useRef<HTMLInputElement>(null)

  const reset = () => { setResult(null); setError('') }

  const handleScan = async () => {
    reset()
    setLoading(true)
    try {
      if (tab === 'url') {
        if (!url.trim()) { setError('Please enter a URL'); setLoading(false); return }
        const data = await scanUrl(url.trim())
        setResult({ ...data, type: 'url', target: data.url })
      } else {
        if (!file) { setError('Please select a file'); setLoading(false); return }
        const data = await scanFile(file)
        setResult({ ...data, type: 'file', target: data.filename })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  const Cfg = result ? riskConfig[result.risk] : null

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="font-mono text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
          &gt;_ ANALYZE THREAT
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Scan URLs for phishing or upload files for malware detection.
        </p>
      </div>

      {/* Input card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="rounded-xl p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {(['url', 'file'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); reset() }}
              className="px-4 py-2 rounded font-mono text-sm font-semibold transition-all"
              style={tab === t
                ? { background: 'var(--accent)', color: '#000' }
                : { color: 'var(--muted)', border: '1px solid var(--border)' }}>
              {t === 'url' ? <span className="flex items-center gap-2"><Link2 size={14} />URL</span>
                           : <span className="flex items-center gap-2"><Upload size={14} />FILE</span>}
            </button>
          ))}
        </div>

        {/* URL input */}
        {tab === 'url' && (
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="https://suspicious-site.com"
              className="flex-1 px-4 py-3 rounded-lg font-mono text-sm outline-none transition-all"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            <button onClick={handleScan} disabled={loading}
              className="px-6 py-3 rounded-lg font-mono font-bold text-sm transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#000' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'SCAN'}
            </button>
          </div>
        )}

        {/* File input */}
        {tab === 'file' && (
          <div className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all hover:border-current"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
              <p className="font-mono text-sm">{file ? file.name : 'DROP FILE OR CLICK TO BROWSE'}</p>
              {file && <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>}
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => { setFile(e.target.files?.[0] ?? null); reset() }} />
            </div>
            <button onClick={handleScan} disabled={loading || !file}
              className="w-full py-3 rounded-lg font-mono font-bold text-sm transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#000' }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />ANALYZING...</span>
                       : 'SCAN FILE'}
            </button>
          </div>
        )}

        {error && (
          <p className="font-mono text-sm" style={{ color: 'var(--danger)' }}>⚠ {error}</p>
        )}
      </div>

      {/* Result card */}
      {result && Cfg && (
        <div style={{
          background: 'var(--surface)',
          border: `1px solid ${result.risk === 'safe' ? 'var(--accent)' : result.risk === 'dangerous' ? 'var(--danger)' : 'var(--warn)'}`,
        }} className="rounded-xl p-6 space-y-5">

          {/* Risk banner */}
          <div className="flex items-center gap-3">
            <Cfg.icon size={28} className={result.risk} />
            <div>
              <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${Cfg.cls}`}>{Cfg.label}</span>
              <p className="font-mono text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>{result.target}</p>
            </div>
          </div>

          {/* Warning box for dangerous */}
          {result.risk === 'dangerous' && (
            <div className="flex gap-3 p-4 rounded-lg" style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)' }}>
              <ShieldAlert size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="font-mono font-bold text-sm" style={{ color: 'var(--danger)' }}>⚠ DO NOT VISIT THIS SITE</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>
                  This {result.type === 'url' ? 'URL' : 'file'} has been flagged as dangerous by security engines. Avoid interacting with it.
                </p>
              </div>
            </div>
          )}

          {/* Detail rows */}
          <div className="space-y-3">
            {result.google_safe_browsing && !result.google_safe_browsing.skipped && (
              <DetailRow
                label="Google Safe Browsing"
                value={result.google_safe_browsing.safe
                  ? 'No threats detected'
                  : `Threats: ${result.google_safe_browsing.threats.join(', ')}`}
                ok={result.google_safe_browsing.safe}
              />
            )}
            {result.virustotal && !result.virustotal.skipped && (
              <DetailRow
                label="VirusTotal"
                value={result.virustotal.pending
                  ? 'Submitted for analysis (check back soon)'
                  : `${result.virustotal.detections} / ${result.virustotal.total} engines flagged`}
                ok={result.virustotal.detections === 0}
              />
            )}
            {result.sha256 && (
              <DetailRow label="SHA-256" value={result.sha256} mono />
            )}
            {result.size_bytes !== undefined && (
              <DetailRow label="File Size" value={`${(result.size_bytes / 1024).toFixed(2)} KB`} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, ok, mono }: { label: string; value: string; ok?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="font-mono text-xs shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono break-all' : ''}`}
        style={{ color: ok === undefined ? 'var(--text)' : ok ? 'var(--accent)' : 'var(--danger)' }}>
        {value}
      </span>
    </div>
  )
}
