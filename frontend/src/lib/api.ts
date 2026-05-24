const BASE = '/api'

export async function scanUrl(url: string) {
  const res = await fetch(`${BASE}/scan/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function scanFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/scan/file`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getHistory(limit = 20) {
  const res = await fetch(`${BASE}/scans/history?limit=${limit}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
