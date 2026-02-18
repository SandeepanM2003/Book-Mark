'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()

  // user loggged in skip login
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        console.log('user already logged in, redirecting to bookmarks')
        router.push('/bookmarks')
      }
    })
  }, [])

  const handleGoogleLogin = async () => {
    //console.log('starting google oauth flow...')

    console.log('starting google oauth flow...')

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // after google redirects back, /auth/callback will exchange the code for a session
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* background glow blobs — pure decoration */}
      <div className="orb w-[500px] h-[500px] bg-purple-600/20 top-[-100px] right-[-100px]" />
      <div className="orb w-[400px] h-[400px] bg-pink-600/10 bottom-[-100px] left-[-100px]" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full animate-fade-in">

        {/* app icon 
        //<div className="mb-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-900/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            
        </svg>
        </div>*/}
{/* app icon */}
        <div className="mb-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-900/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-3">
          Book-mark
        </h1>
        <p className="text-gray-400 text-lg mb-10 leading-relaxed">
          Save ur valued URLs here
        </p>

        {/* feature tags — just showing off what it does */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {['Real-time', 'Private', 'Google Sign-in', 'Modern UI'].map(feature => (
            <span key={feature} className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300">
              {feature}
            </span>
          ))}
        </div>

        <button
          onClick={handleGoogleLogin}
          className="group flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white text-gray-900 font-medium text-sm hover:bg-gray-100 transition-all duration-200 shadow-xl shadow-black/30 hover:shadow-black/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* google logo svg */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-8 text-xs text-gray-600">
          Private to u
        </p>
      </div>
    </div>
  )
}
