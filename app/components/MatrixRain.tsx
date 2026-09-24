'use client'

import { useEffect, useRef } from 'react'

const GLYPHS = 'アイウエオカキクケコサシスセソ01アイウエオ$#*+ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fontSize = 15
    let columns = 0
    let drops: number[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      columns = Math.ceil(canvas.width / fontSize)
      drops = Array.from({ length: columns }, () => Math.random() * -100)
    }
    resize()
    window.addEventListener('resize', resize)

    let frame = 0
    let raf: number
    const draw = () => {
      raf = requestAnimationFrame(draw)
      frame++
      if (frame % 2 !== 0) return // half-speed - keeps it ambient, not frantic

      ctx.fillStyle = 'rgba(3, 8, 5, 0.09)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px 'IBM Plex Mono', monospace`
      for (let i = 0; i < columns; i++) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize

        ctx.fillStyle = '#e8ffee'
        ctx.fillText(glyph, x, y)
        ctx.fillStyle = '#00ff6a'
        ctx.fillText(glyph, x, y - fontSize)

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="matrix-rain" aria-hidden="true" />
}
