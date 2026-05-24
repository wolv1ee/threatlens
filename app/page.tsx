'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Shield, Terminal, Clock, Link2, Upload, AlertTriangle, CheckCircle, XCircle, Loader2, ShieldAlert } from 'lucide-react'

type Risk = 'safe' | 'suspicious' | 'dangerous'
interface ScanResult {
  type: 'url' | 'file'
  risk: Risk
  target: string
  google_safe_browsing?: { safe: boolean; threats: string[]; skipped?: boolean }
  virustotal?: { safe: boolean; detections: number; total: number; skipped?: boolean; pending?: boolean }
  sha256?: string
  size_bytes?: number
}

const riskConfig = {
  safe:       { icon: CheckCircle,   label: 'SAFE',      cls: 'badge-safe' },
  suspicious: { icon: AlertTriangle, label: 'SUSPICIOUS', cls: 'badge-suspicious' },
  dangerous:  { icon: XCircle,       label: 'DANGEROUS', cls: 'badge-dangerous' },
}

export default function Home() {
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
        const res = await fetch('/api/scan-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })
        const data = await res.json()
        setResult({ ...data, type: 'url', target: data.url })
      } else {
        if (!file) { setError('Please select a file'); setLoading(false); return }
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/scan-file', { method: 'POST', body: form })
        const data = await res.json()
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ color: 'var(--accent)' }} className="p-2 rounded-lg">
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
          <span className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#000' }}>
            <Terminal size={14} /> SCAN
          </span>
          <Link href="/history" className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm hover:bg-white/5 transition-all"
            style={{ color: 'var(--muted)' }}>
            <Clock size={14} /> HISTORY
          </Link>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
            &gt;_ ANALYZE THREAT
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Scan URLs for phishing or upload files for malware detection.
          </p>
        </div>

        {/* Input card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            {(['url', 'file'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); reset() }}
                className="px-4 py-2 rounded font-mono text-sm font-semibold transition-all"
                style={tab === t
                  ? { background: 'var(--accent)', color: '#000' }
                  : { color: 'var(--muted)', border: '1px solid var(--border)' }}>
                {t === 'url'
                  ? <span className="flex items-center gap-2"><Link2 size={14} />URL</span>
                  : <span className="flex items-center gap-2"><Upload size={14} />FILE</span>}
              </button>
            ))}
          </div>

          {tab === 'url' && (
            <div className="flex gap-3">
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="https://suspicious-site.com"
                className="flex-1 px-4 py-3 rounded-lg font-mono text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <button onClick={handleScan} disabled={loading}
                className="px-6 py-3 rounded-lg font-mono font-bold text-sm disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#000' }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'SCAN'}
              </button>
            </div>
          )}

          {tab === 'file' && (
            <div className="space-y-3">
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                <p className="font-mono text-sm">{file ? file.name : 'DROP FILE OR CLICK TO BROWSE'}</p>
                {file && <p className="font-mono text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); reset() }} />
              </div>
              <button onClick={handleScan} disabled={loading || !file}
                className="w-full py-3 rounded-lg font-mono font-bold text-sm disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#000' }}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />ANALYZING...</span>
                  : 'SCAN FILE'}
              </button>
            </div>
          )}

          {error && <p className="font-mono text-sm" style={{ color: 'var(--danger)' }}>Warning: {error}</p>}
        </div>

        {/* Result */}
        {result && Cfg && (
          <div style={{
            background: 'var(--surface)',
            border: `1px solid ${result.risk === 'safe' ? 'var(--accent)' : result.risk === 'dangerous' ? 'var(--danger)' : 'var(--warn)'}`,
          }} className="rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Cfg.icon size={28} className={result.risk} />
              <div>
                <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${Cfg.cls}`}>{Cfg.label}</span>
                <p className="font-mono text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>{result.target}</p>
              </div>
            </div>

            {result.risk === 'dangerous' && (
              <div className="flex gap-3 p-4 rounded-lg" style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)' }}>
                <ShieldAlert size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-mono font-bold text-sm" style={{ color: 'var(--danger)' }}>DO NOT VISIT THIS SITE</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>
                    This {result.type === 'url' ? 'URL' : 'file'} has been flagged as dangerous. Avoid interacting with it.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {result.google_safe_browsing && !result.google_safe_browsing.skipped && (
                <DetailRow label="Google Safe Browsing"
                  value={result.google_safe_browsing.safe ? 'No threats detected' : `Threats: ${result.google_safe_browsing.threats.join(', ')}`}
                  ok={result.google_safe_browsing.safe} />
              )}
              {result.virustotal && !result.virustotal.skipped && (
                <DetailRow label="VirusTotal"
                  value={result.virustotal.pending ? 'Submitted for analysis' : `${result.virustotal.detections} / ${result.virustotal.total} engines flagged`}
                  ok={result.virustotal.detections === 0} />
              )}
              {result.sha256 && <DetailRow label="SHA-256" value={result.sha256} mono />}
              {result.size_bytes !== undefined && (
                <DetailRow label="File Size" value={`${(result.size_bytes / 1024).toFixed(2)} KB`} />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center font-mono text-xs" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
        Powered by VirusTotal and Google Safe Browsing
      </footer>
    </div>
  )
}

function DetailRow({ label, value, ok, mono }: { label: string; value: string; ok?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="font-mono text-xs shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono break-all' : ''}`}
        style={{ color: ok === undefined ? 'var(--text)' : ok ? 'var(--accent)' : 'var(--danger)' }}>
        {value}
      </span>
    </div>
  )
}
