import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseClient } from '@/lib/supabase'
import { scanBufferWithYara, severityRank, MAX_YARA_SCAN_BYTES, type YaraMatch } from '@/lib/yara'

const MAX_UPLOAD_BYTES = MAX_YARA_SCAN_BYTES

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

function riskFromFindings(vt: Awaited<ReturnType<typeof checkVirusTotalFile>>, yara: YaraMatch[]) {
  const worstYara = yara.reduce<number>((max, m) => Math.max(max, severityRank(m.severity)), -1)
  if (!vt.safe || worstYara >= severityRank('high')) return 'dangerous'
  if (worstYara >= severityRank('low')) return 'suspicious'
  return 'safe'
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB scan limit` }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const hash = createHash('sha256').update(buffer).digest('hex')

    const vt = await checkVirusTotalFile(hash)
    const yaraMatches = scanBufferWithYara(buffer)
    const risk = riskFromFindings(vt, yaraMatches)

    const supabase = getSupabaseClient()
    const baseRow = {
      type: 'file',
      target: file.name,
      file_hash: hash,
      file_size: buffer.length,
      risk,
      vt_detections: vt.detections ?? 0,
      vt_total: vt.total ?? 0,
    }
    const { error: insertError } = await supabase.from('scans').insert({ ...baseRow, yara_matches: yaraMatches })
    if (insertError) await supabase.from('scans').insert(baseRow)

    return NextResponse.json({
      filename: file.name,
      sha256: hash,
      size_bytes: buffer.length,
      risk,
      virustotal: vt,
      yara: { matched: yaraMatches.length > 0, rules: yaraMatches },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
