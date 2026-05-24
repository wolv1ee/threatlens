import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseClient } from '@/lib/supabase'

async function checkVirusTotalFile(hash: string) {
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) return { safe: true, detections: 0, total: 0, skipped: true }

  const res = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
    headers: { 'x-apikey': key },
  })

  if (res.ok) {
    const data = await res.json()
    const stats = data.data.attributes.last_analysis_stats
    return {
      safe: stats.malicious === 0,
      detections: stats.malicious ?? 0,
      total: Object.values(stats).reduce((a: number, b) => a + (b as number), 0),
      file_type: data.data.attributes.type_description ?? 'unknown',
    }
  }
  return { safe: true, detections: 0, total: 0, not_found: true }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const hash = createHash('sha256').update(buffer).digest('hex')

    const vt = await checkVirusTotalFile(hash)
    const risk = vt.safe ? 'safe' : 'dangerous'

    const supabase = getSupabaseClient()
    await supabase.from('scans').insert({
      type: 'file',
      target: file.name,
      file_hash: hash,
      file_size: buffer.length,
      risk,
      vt_detections: vt.detections ?? 0,
      vt_total: vt.total ?? 0,
    })

    return NextResponse.json({
      filename: file.name,
      sha256: hash,
      size_bytes: buffer.length,
      risk,
      virustotal: vt,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
