'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

export default function ScanningPanel({ label, steps }: { label: string; steps: string[] }) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setStepIndex(0)
    const id = setInterval(() => {
      setStepIndex(i => (i < steps.length - 1 ? i + 1 : i))
    }, 700)
    return () => clearInterval(id)
  }, [steps])

  return (
    <div className="mt-8 panel p-6 md:p-8 flex flex-col sm:flex-row items-center gap-8">
      <div className="radar shrink-0" aria-hidden="true">
        <span className="radar-ring ring-1" />
        <span className="radar-ring ring-2" />
        <span className="radar-blip" style={{ top: '28%', left: '64%', animationDelay: '0.2s' }} />
        <span className="radar-blip" style={{ top: '58%', left: '32%', animationDelay: '1.3s' }} />
        <span className="radar-sweep" />
      </div>

      <div className="min-w-0 w-full">
        <p className="text-sm font-data truncate" style={{ color: 'var(--ink-dim)' }}>
          <span style={{ color: 'var(--signal)' }}>{'>'}</span> analyzing {label}
          <span className="caret" aria-hidden="true" />
        </p>
        <div className="mt-4 space-y-2.5">
          {steps.map((step, i) => {
            const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending'
            return (
              <div key={step} className="flex items-center gap-2.5 text-sm">
                <span className="w-3.5 flex justify-center shrink-0">
                  {state === 'done' && <Check size={13} style={{ color: 'var(--safe)' }} />}
                  {state === 'active' && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--signal)' }} />}
                  {state === 'pending' && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ink-faint)' }} />
                  )}
                </span>
                <span style={{ color: state === 'pending' ? 'var(--ink-faint)' : 'var(--ink)' }}>{step}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
