import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// use this in server components, route handlers, and middleware
// has to be async because cookies() is async in Next.js 15+
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        //setAll(cookiesToSet) 
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {{
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // can't set cookies in a server component render — that's fine,
            // middleware handles refreshing the session instead
          }
        },
      },
    }
  )
}
