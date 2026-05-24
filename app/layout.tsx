import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ThreatLens - Malware and Phishing Analyzer',
  description: 'Scan URLs for phishing and files for malware',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
