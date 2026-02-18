import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// google oauth redirecting  here after logiin
// we swap the one-time code for an actual session, then send the user to their bookmarks
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    console.log('got oauth code, exchanging for session...')
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/bookmarks`)
}
