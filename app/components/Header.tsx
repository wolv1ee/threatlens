'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldHalf } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Scan' },
  { href: '/history', label: 'History' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-20 px-6 md:px-10"
      style={{ background: 'rgba(3,8,5,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 group">
          <ShieldHalf size={20} strokeWidth={2} style={{ color: 'var(--signal)', filter: 'drop-shadow(0 0 4px var(--signal-dim))' }} />
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            ThreatLens
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm rounded-md transition-colors"
                style={{
                  color: active ? 'var(--ink)' : 'var(--ink-dim)',
                  background: active ? 'var(--panel-raised)' : 'transparent',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
