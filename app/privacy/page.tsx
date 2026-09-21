import Header from '../components/Header'
import Footer from '../components/Footer'

const SECTIONS = [
  {
    title: 'Overview',
    body: 'ThreatLens is a free security tool built by Saad Mahmud for scanning URLs and files for potential malware and phishing threats. This policy explains what data is collected, how it is used, and how it is stored.',
  },
  {
    title: 'Data we collect',
    body: 'When you submit a URL or file, we store the submitted URL or filename, the risk result (safe, suspicious, or dangerous), detection counts from VirusTotal, any matched YARA rule names, and the scan timestamp. We do not store the contents of uploaded files - files are only used to compute a SHA-256 hash and run the local YARA rule check, both in memory during the request.',
  },
  {
    title: 'Third-party services',
    body: 'Scans are checked against VirusTotal (virustotal.com) for URL and file hash reputation, and Google Safe Browsing for phishing and malware URL detection. Submitted URLs and file hashes may be sent to these services - review their respective privacy policies for details. YARA rule matching runs entirely within this application and is not sent anywhere.',
  },
  {
    title: 'Scan history',
    body: 'All scans are stored in a shared database and are not tied to an individual account. Scan history is visible to anyone using the application. Do not submit sensitive or private URLs or files.',
  },
  {
    title: 'Cookies',
    body: 'ThreatLens does not use cookies or any tracking technologies.',
  },
  {
    title: 'Data retention',
    body: 'Scan records are deleted automatically every 24 hours. Data is not sold or shared with third parties beyond the scanning services listed above.',
  },
  {
    title: 'Contact',
    body: 'Questions about this policy can be sent through saadmahmud.dev.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-6 md:px-10 py-12 max-w-2xl mx-auto w-full">
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
          Privacy policy
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-faint)' }}>Last updated September 21, 2026</p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section, i) => (
            <div
              key={section.title}
              className="pb-8"
              style={{ borderBottom: i === SECTIONS.length - 1 ? 'none' : '1px solid var(--line-soft)' }}
            >
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>{section.title}</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>{section.body}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
