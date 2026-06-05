export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at top left, #0d1f3c 0%, #080b12 50%, #0a0f1a 100%)',
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,245,160,0.06) 0%, transparent 70%)',
          top: '-200px', left: '-100px',
        }} />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12" style={{ position: 'relative', zIndex: 1 }}>
        <a href="/" className="font-mono text-sm mb-8 inline-block"
          style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          &larr; Back to ThreatLens
        </a>

        <h1 className="font-mono text-3xl font-bold mb-2" style={{ color: 'var(--accent)' }}>
          Privacy Policy
        </h1>
        <p className="font-mono text-xs mb-10" style={{ color: 'var(--muted)' }}>
          Last updated: May 24, 2026
        </p>

        {[
          {
            title: '1. Overview',
            body: 'ThreatLens is a free security tool built by Saad Mahmud that allows users to scan URLs and files for potential malware and phishing threats. This Privacy Policy explains what data we collect, how it is used, and how it is stored.',
          },
          {
            title: '2. Data We Collect',
            body: 'When you submit a URL or file for scanning, we store the following information in our database: the URL or filename you submitted, the risk result (safe, suspicious, or dangerous), the number of detections from VirusTotal, and the timestamp of the scan. We do not store the contents of uploaded files. Files are only used to compute a SHA-256 hash, which is then checked against VirusTotal.',
          },
          {
            title: '3. Third-Party Services',
            body: 'ThreatLens uses the following third-party APIs to perform scans: VirusTotal (virustotal.com) for URL and file hash analysis, and Google Safe Browsing for phishing and malware URL detection. By using ThreatLens, your submitted URLs and file hashes may be sent to these services. Please review their respective privacy policies for more information.',
          },
          {
            title: '4. Scan History',
            body: 'All scans are stored in a shared database and are not tied to any individual user account. Scan history is visible to all users of the application. Do not submit sensitive or private URLs or files.',
          },
          {
            title: '5. Cookies',
            body: 'ThreatLens does not use cookies or any tracking technologies.',
          },
          {
            title: '6. Data Retention',
            body: 'Scan records may be retained indefinitely for the purpose of displaying scan history and statistics. We do not sell or share this data with third parties beyond the scanning APIs mentioned above.',
          },
          {
            title: '7. Contact',
            body: 'If you have any questions about this Privacy Policy, you can reach out via saadmahmud.dev.',
          },
        ].map(section => (
          <div key={section.title} className="mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2rem' }}>
            <h2 className="font-mono font-bold text-sm mb-3" style={{ color: 'var(--accent)' }}>
              {section.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              {section.body}
            </p>
          </div>
        ))}
      </div>

      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(8,11,18,0.6)',
      }} className="py-4 text-center font-mono text-xs">
        <span style={{ color: 'var(--muted)' }}>ThreatLens</span>
        <span style={{ color: 'var(--muted)', margin: '0 8px' }}>·</span>
        <a href="https://saadmahmud.dev" target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Built by Saad Mahmud
        </a>
      </footer>
    </div>
  )
}