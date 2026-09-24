'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Link2, Upload, AlertTriangle, CheckCircle, XCircle, Loader2, ShieldAlert, FileWarning,
} from 'lucide-react'
import Header from './components/Header'
import Footer from './components/Footer'
import ScanningPanel from './components/ScanningPanel'

const URL_SCAN_STEPS = ['Checking Google Safe Browsing', 'Checking VirusTotal', 'Compiling verdict']
const FILE_SCAN_STEPS = ['Hashing file (SHA-256)', 'Checking VirusTotal', 'Running YARA rules', 'Compiling verdict']

type Risk = 'safe' | 'suspicious' | 'dangerous'
type YaraSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

interface YaraRuleMatch {
  rule: string
  description: string
  severity: YaraSeverity
  tags: string[]
}

interface ScanResult {
  type: 'url' | 'file'
  risk: Risk
  target: string
  google_safe_browsing?: { safe: boolean; threats: string[]; skipped?: boolean }
  virustotal?: { safe: boolean; detections: number; total: number; skipped?: boolean; pending?: boolean }
  yara?: { matched: boolean; rules: YaraRuleMatch[] }
  sha256?: string
  size_bytes?: number
  error?: string
}

interface Stats {
  total: number
  threats: number
  safe: number
}

const riskConfig: Record<Risk, { icon: typeof CheckCircle; label: string; cls: string; dot: string }> = {
  safe:       { icon: CheckCircle,   label: 'Safe',       cls: 'badge-safe',       dot: 'var(--safe)' },
  suspicious: { icon: AlertTriangle, label: 'Suspicious', cls: 'badge-suspicious', dot: 'var(--warn)' },
  dangerous:  { icon: XCircle,       label: 'Dangerous',  cls: 'badge-dangerous',  dot: 'var(--danger)' },
}

const severityColor: Record<YaraSeverity, string> = {
  critical: 'var(--danger)',
  high: 'var(--danger)',
  medium: 'var(--warn)',
  low: 'var(--ink-dim)',
  info: 'var(--ink-faint)',
}

export default function Home() {
  const [tab, setTab]         = useState<'url' | 'file'>('url')
  const [url, setUrl]         = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
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
        if (!url.trim()) { setError('Enter a URL to scan.'); setLoading(false); return }
        const res = await fetch('/api/scan-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Scan failed.'); setLoading(false); return }
        setResult({ ...data, type: 'url', target: data.url })
      } else {
        if (!file) { setError('Choose a file to scan.'); setLoading(false); return }
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/scan-file', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Scan failed.'); setLoading(false); return }
        setResult({ ...data, type: 'file', target: data.filename })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed.')
    } finally {
      setLoading(false)
    }
  }

  const Cfg = result ? riskConfig[result.risk] : null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-6 md:px-10 py-12 max-w-5xl mx-auto w-full">
        <div className="max-w-xl">
          <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            <span style={{ color: 'var(--signal)' }}>{'>'}</span> Analyze a URL or file
            <span className="caret" aria-hidden="true" />
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
            Checks reputation against VirusTotal and Google Safe Browsing, and runs uploaded
            files through a static YARA rule engine for known malicious patterns.
          </p>
        </div>

        <div className="mt-8 panel p-5 md:p-6">
          <div className="flex gap-1 p-1 rounded-md w-fit" style={{ background: 'var(--panel-raised)' }}>
            {(['url', 'file'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); reset() }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={tab === t
                  ? { background: 'var(--signal)', color: '#02150c' }
                  : { color: 'var(--ink-dim)' }}
              >
                {t === 'url' ? <Link2 size={14} /> : <Upload size={14} />}
                {t === 'url' ? 'URL' : 'File'}
              </button>
            ))}
          </div>

          {tab === 'url' && (
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="example.com/path"
                className="flex-1 px-4 py-2.5 rounded-md text-sm outline-none font-data"
                style={{ background: 'var(--panel-raised)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
              <ScanButton loading={loading} onClick={handleScan} label="Scan URL" />
            </div>
          )}

          {tab === 'file' && (
            <div className="mt-5 space-y-3">
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(false)
                  const dropped = e.dataTransfer.files?.[0]
                  if (dropped) { setFile(dropped); reset() }
                }}
                className="rounded-md p-8 text-center cursor-pointer transition-colors"
                style={{
                  border: `1px dashed ${dragOver ? 'var(--signal)' : 'var(--line)'}`,
                  background: dragOver ? 'var(--signal-dim)' : 'var(--panel-raised)',
                }}
              >
                <Upload size={22} className="mx-auto mb-2.5" style={{ color: 'var(--ink-faint)' }} />
                <p className="text-sm" style={{ color: 'var(--ink)' }}>
                  {file ? file.name : 'Drop a file here, or click to browse'}
                </p>
                {file && (
                  <p className="text-xs mt-1 font-data" style={{ color: 'var(--ink-faint)' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); reset() }}
                />
              </div>
              <ScanButton loading={loading} onClick={handleScan} label="Scan file" disabled={!file} full />
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm flex items-center gap-2" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={14} /> {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-6 text-sm">
          <StatItem label="Total scans" value={stats.total} />
          <StatItem label="Threats found" value={stats.threats} tone="var(--danger)" />
          <StatItem label="Clean" value={stats.safe} tone="var(--safe)" />
        </div>

        {loading && (
          <ScanningPanel
            label={tab === 'url' ? (url.trim() || 'target') : (file?.name ?? 'file')}
            steps={tab === 'url' ? URL_SCAN_STEPS : FILE_SCAN_STEPS}
          />
        )}

        {result && Cfg && (
          <div
            className="mt-8 panel overflow-hidden"
            style={{ borderColor: result.risk === 'safe' ? 'var(--line)' : Cfg.dot, borderLeftWidth: 3, borderLeftColor: Cfg.dot }}
          >
            <div className="p-5 md:p-6 flex items-start justify-between gap-4 divider">
              <div>
                <span className={`badge ${Cfg.cls}`}>
                  <Cfg.icon size={13} /> {Cfg.label}
                </span>
                <p className="mt-2 text-sm font-data break-all" style={{ color: 'var(--ink-dim)' }}>{result.target}</p>
              </div>
            </div>

            {result.risk === 'dangerous' && (
              <div className="mx-5 md:mx-6 mt-5 flex gap-3 p-4 rounded-md" style={{ background: 'var(--danger-dim)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}>
                <ShieldAlert size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                    {result.type === 'url' ? "Don't visit this site" : "Don't open this file"}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                    This {result.type === 'url' ? 'URL' : 'file'} was flagged as dangerous by one or more detection sources below.
                  </p>
                </div>
              </div>
            )}

            <div className="p-5 md:p-6 space-y-1">
              {result.google_safe_browsing && !result.google_safe_browsing.skipped && (
                <DetailRow
                  label="Google Safe Browsing"
                  value={result.google_safe_browsing.safe ? 'No threats detected' : `Flagged: ${result.google_safe_browsing.threats.join(', ')}`}
                  ok={result.google_safe_browsing.safe}
                />
              )}
              {result.virustotal && !result.virustotal.skipped && (
                <DetailRow
                  label="VirusTotal"
                  value={result.virustotal.pending ? 'Submitted for analysis' : `${result.virustotal.detections} / ${result.virustotal.total} engines flagged`}
                  ok={result.virustotal.detections === 0}
                />
              )}
              {result.sha256 && <DetailRow label="SHA-256" value={result.sha256} mono />}
              {result.size_bytes !== undefined && (
                <DetailRow label="File size" value={`${(result.size_bytes / 1024).toFixed(2)} KB`} />
              )}
            </div>

            {result.yara && (
              <div className="p-5 md:p-6" style={{ borderTop: '1px solid var(--line-soft)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <FileWarning size={14} style={{ color: 'var(--ink-faint)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    YARA rules
                  </span>
                  <span className="text-xs font-data" style={{ color: 'var(--ink-faint)' }}>
                    {result.yara.matched ? `${result.yara.rules.length} matched` : 'no matches'}
                  </span>
                </div>
                {result.yara.matched ? (
                  <div className="space-y-3">
                    {result.yara.rules.map(r => (
                      <div key={r.rule} className="flex items-start gap-3">
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: severityColor[r.severity] }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-data" style={{ color: 'var(--ink)' }}>{r.rule}</span>
                            <span className="text-[11px] font-data" style={{ color: severityColor[r.severity] }}>{r.severity}</span>
                          </div>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>{r.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                    No known malicious patterns matched against the current rule set.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function ScanButton({ loading, onClick, label, disabled, full }: { loading: boolean; onClick: () => void; label: string; disabled?: boolean; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`${full ? 'w-full' : ''} ${loading ? 'scan-sweep' : ''} px-5 py-2.5 rounded-md text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-shadow`}
      style={{ background: 'var(--signal)', color: '#02150c', boxShadow: loading || disabled ? 'none' : '0 0 16px var(--signal-dim)' }}
    >
      {loading
        ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Scanning</span>
        : label}
    </button>
  )
}

function StatItem({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-data text-base font-medium" style={{ color: tone ?? 'var(--ink)' }}>{value}</span>
      <span style={{ color: 'var(--ink-faint)' }}>{label}</span>
    </div>
  )
}

function DetailRow({ label, value, ok, mono }: { label: string; value: string; ok?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm shrink-0" style={{ color: 'var(--ink-faint)' }}>{label}</span>
      <span
        className={`text-sm text-right ${mono ? 'font-data break-all' : ''}`}
        style={{ color: ok === undefined ? 'var(--ink)' : ok ? 'var(--safe)' : 'var(--danger)' }}
      >
        {value}
      </span>
    </div>
  )
}
