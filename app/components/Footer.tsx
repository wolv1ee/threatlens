export default function Footer() {
  return (
    <footer className="px-6 md:px-10 py-6" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
        <span>Detection by VirusTotal, Google Safe Browsing, and a static YARA rule engine</span>
        <span aria-hidden>·</span>
        <a href="/privacy" className="hover:underline" style={{ color: 'var(--ink-dim)' }}>
          Privacy policy
        </a>
        <span aria-hidden>·</span>
        <a href="https://saadmahmud.dev" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--ink-dim)' }}>
          Built by Saad Mahmud
        </a>
      </div>
    </footer>
  )
}
