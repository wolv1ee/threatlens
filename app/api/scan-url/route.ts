import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function checkGoogleSafeBrowsing(url: string) {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY
  if (!key) return { safe: true, threats: [], skipped: true }

  const res = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'threatlens', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    }
  )
  const data = await res.json()
  const matches = data.matches ?? []
  return {
    safe: matches.length === 0,
    threats: matches.map((m: { threatType: string }) => m.threatType),
  }
}

async function checkVirusTotal(url: string) {
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) return { safe: true, detections: 0, total: 0, skipped: true }

  const encoded = Buffer.from(url).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

  const res = await fetch(`https://www.virustotal.com/api/v3/urls/${encoded}`, {
    headers: { 'x-apikey': key },
  })

  if (res.ok) {
    const data = await res.json()
    const stats = data.data.attributes.last_analysis_stats
    return {
      safe: stats.malicious === 0 && stats.suspicious === 0,
      detections: (stats.malicious ?? 0) + (stats.suspicious ?? 0),
      total: Object.values(stats).reduce((a: number, b) => a + (b as number), 0),
    }
  }

  // Submit for scanning
  await fetch('https://www.virustotal.com/api/v3/urls', {
    method: 'POST',
    headers: { 'x-apikey': key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `url=${encodeURIComponent(url)}`,
  })
  return { safe: true, detections: 0, total: 0, pending: true }
}

export async function POST(req: NextRequest) {
  try {
    let { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
    if (!url.startsWith('http')) url = 'https://' + url

    const [gsb, vt] = await Promise.all([
      checkGoogleSafeBrowsing(url),
      checkVirusTotal(url),
    ])

    const risk = !gsb.safe || (vt.detections ?? 0) > 5
      ? 'dangerous'
      : (vt.detections ?? 0) > 0 ? 'suspicious' : 'safe'

    await supabase.from('scans').insert({
      type: 'url',
      target: url,
      risk,
      gsb_threats: gsb.threats ?? [],
      vt_detections: vt.detections ?? 0,
      vt_total: vt.total ?? 0,
    })

    return NextResponse.json({ url, risk, google_safe_browsing: gsb, virustotal: vt })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
