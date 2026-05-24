import { Outlet, NavLink } from 'react-router-dom'
import { Shield, Clock, Terminal } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ color: 'var(--accent)', animation: 'pulse-glow 3s infinite' }}
            className="p-2 rounded-lg" >
            <Shield size={22} />
          </div>
          <div>
            <span className="font-mono font-bold text-lg tracking-tight" style={{ color: 'var(--accent)' }}>
              THREAT<span style={{ color: 'var(--text)' }}>LENS</span>
            </span>
            <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              malware &amp; phishing analyzer
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all ${
              isActive
                ? 'text-black font-semibold'
                : 'hover:bg-white/5'
            }`
          } style={({ isActive }) => isActive ? { background: 'var(--accent)', color: '#000' } : { color: 'var(--muted)' }}>
            <Terminal size={14} />
            SCAN
          </NavLink>
          <NavLink to="/history" className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all ${
              isActive ? 'font-semibold' : 'hover:bg-white/5'
            }`
          } style={({ isActive }) => isActive ? { background: 'var(--accent)', color: '#000' } : { color: 'var(--muted)' }}>
            <Clock size={14} />
            HISTORY
          </NavLink>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center font-mono text-xs" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
        Powered by VirusTotal &amp; Google Safe Browsing
      </footer>
    </div>
  )
}
