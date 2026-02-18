import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// runs on every request that matches the config below
// mainly used to protect the /bookmarks route from unauthenticated users
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // have to create the client manually here since we don't have access to cookies() helper
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // first write to the request so the cookies are available downstream
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // then write to the response so the browser gets updated cookies
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as object)
          )
        },
      },
    }
  )

  // check if the user has a valid session
  const { data: { user } } = await supabase.auth.getUser()

  // if no session and they're trying to access /bookmarks, kick them to login
  if (!user && request.nextUrl.pathname.startsWith('/bookmarks')) {
    console.log('no session found, redirecting to login')
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

// only run middleware on these routes — no point running it on static assets etc
export const config = {
  matcher: ['/bookmarks/:path*'],
}
