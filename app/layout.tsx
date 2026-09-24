import type { Metadata } from 'next'
import './globals.css'
import MatrixRain from './components/MatrixRain'
import BootScreen from './components/BootScreen'

export const metadata: Metadata = {
  title: 'ThreatLens - URL & File Threat Analysis',
  description: 'Scan URLs for phishing and files for malware using VirusTotal, Google Safe Browsing, and a static YARA rule engine.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <BootScreen />
        <MatrixRain />
        <div className="crt-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
