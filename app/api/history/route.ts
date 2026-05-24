import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ scans: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
