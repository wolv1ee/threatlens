'use client'

import { useState, useRef, useEffect } from 'react'
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

interface Stats {
  total: number
  threats: number
  safe: number
}

const riskConfig = {
  safe:       { icon: CheckCircle,   label: 'SAFE',       cls: 'badge-safe' },
  suspicious: { icon: AlertTriangle, label: 'SUSPICIOUS', cls: 'badge-suspicious' },
  dangerous:  { icon: XCircle,       label: 'DANGEROUS',  cls: 'badge-dangerous' },
}

export default function Home() {
  const [tab, setTab]         = useState<'url' | 'file'>('url')
  const [url, setUrl]         = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<ScanResult | null>(null)
  const [error, setError]     = useState('')
  const [stats, setStats]     = useState<Stats>({ total: 0, threats: 0, safe: 0 })
  const fileRef               = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(d => {
        const scans = d.scans ?? []
        setStats({
          total: scans.length,
          threats: scans.filter((s: { risk: string }) => s.risk === 'dangerous' || s.risk === 'suspicious').length,
          safe: scans.filter((s: { risk: string }) => s.risk === 'safe').length,
        })
      })
      .catch(() => {})
  }, [result])

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
          <span className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#000' }}>
            <Terminal size={14} /> SCAN
          </span>
          <Link href="/history" className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all"
            style={{ color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Clock size={14} /> HISTORY
          </Link>
        </nav>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6" style={{ position: 'relative', zIndex: 1 }}>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'TOTAL SCANS', value: stats.total, color: 'var(--accent)' },
            { label: 'THREATS FOUND', value: stats.threats, color: 'var(--danger)' },
            { label: 'SAFE', value: stats.safe, color: 'var(--accent)' },
          ].map((stat, i) => (
            <div key={stat.label}
              className={`p-4 text-center stat-animate delay-${i + 1}`}
              style={{
                background: 'rgba(14, 20, 32, 0.5)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
              }}>
              <div className="font-mono text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="animate-fade-in-up delay-2">
          <h1 className="font-mono text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
            &gt;_ ANALYZE THREAT
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Scan URLs for phishing or upload files for malware detection.
          </p>
        </div>

        <div className="animate-fade-in-up delay-3 p-6 space-y-4" style={{
          background: 'rgba(14, 20, 32, 0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
        }}>
          <div className="flex gap-2">
            {(['url', 'file'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); reset() }}
                className="px-4 py-2 rounded font-mono text-sm font-semibold transition-all"
                style={tab === t
                  ? { background: 'var(--accent)', color: '#000' }
                  : { color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)' }} />
              <button onClick={handleScan} disabled={loading}
                className="px-6 py-3 rounded-lg font-mono font-bold text-sm disabled:opacity-50 animate-pulse-glow"
                style={{ background: 'var(--accent)', color: '#000' }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'SCAN'}
              </button>
            </div>
          )}

          {tab === 'file' && (
            <div className="space-y-3">
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer"
                style={{ borderColor: 'rgba(0,245,160,0.2)', color: 'var(--muted)', background: 'rgba(0,0,0,0.2)' }}>
                <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                <p className="font-mono text-sm">{file ? file.name : 'DROP FILE OR CLICK TO BROWSE'}</p>
                {file && <p className="font-mono text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); reset() }} />
              </div>
              <button onClick={handleScan} disabled={loading || !file}
                className="w-full py-3 rounded-lg font-mono font-bold text-sm disabled:opacity-50 animate-pulse-glow"
                style={{ background: 'var(--accent)', color: '#000' }}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />ANALYZING...</span>
                  : 'SCAN FILE'}
              </button>
            </div>
          )}

          {error && <p className="font-mono text-sm" style={{ color: 'var(--danger)' }}>Warning: {error}</p>}
        </div>

        {result && Cfg && (
          <div className="animate-slide-in p-6 space-y-5" style={{
            background: 'rgba(14, 20, 32, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${result.risk === 'safe' ? 'rgba(0,245,160,0.3)' : result.risk === 'dangerous' ? 'rgba(255,59,92,0.3)' : 'rgba(255,184,0,0.3)'}`,
            borderRadius: 16,
          }}>
            <div className="flex items-center gap-3">
              <Cfg.icon size={28} className={result.risk} />
              <div>
                <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${Cfg.cls}`}>{Cfg.label}</span>
                <p className="font-mono text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>{result.target}</p>
              </div>
            </div>

            {result.risk === 'dangerous' && (
              <div className="flex gap-3 p-4 rounded-lg" style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)' }}>
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

      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(8,11,18,0.6)',
        backdropFilter: 'blur(10px)',
        position: 'relative', zIndex: 1,
      }} className="py-4 text-center font-mono text-xs">
        <span style={{ color: 'var(--muted)' }}>Powered by VirusTotal and Google Safe Browsing</span>
        <span style={{ color: 'var(--muted)', margin: '0 8px' }}>·</span>
        <a href="https://saadmahmud.dev" target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Built by Saad Mahmud
        </a>
      </footer>
    </div>
  )
}

function DetailRow({ label, value, ok, mono }: { label: string; value: string; ok?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="font-mono text-xs shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono break-all' : ''}`}
        style={{ color: ok === undefined ? 'var(--text)' : ok ? 'var(--accent)' : 'var(--danger)' }}>
        {value}
      </span>
    </div>
  )
}