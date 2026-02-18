//'use client'''
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

// ---- types ----

type Bookmark = {
  id: string
  title: string
  url: string
  created_at: string
  user_id: string
}

type User = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

// ---- helper functions ----

// strips www. so we just show e.g. "github.com" not "www.github.com"
function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

// uses google's favicon service — works for basically every site
function getFavicon(url: string) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return null
  }
}

// converts a date string to a readable relative time like "3m ago" or "2d ago"
function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`

  return `${Math.floor(hours / 24)}d ago`
}

// ---- main component ----

export default function BookmarksPage() {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // add bookmark form state
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // tracks which bookmark row is being deleted so we can show a spinner on it
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // keep track of ids we deleted from this tab so realtime doesn't double-remove them
  // using a ref here because we don't want this to cause re-renders
  const locallyDeletedIds = useRef<Set<string>>(new Set())

  const [searchQuery, setSearchQuery] = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

  // on first load: make sure user is logged in, then fetch their bookmarks
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        console.log('not logged in, sending back to home')
        router.push('/')
        return
      }
      console.log('logged in as', user.email)
      setUser(user)
      loadBookmarks(user.id)
    })
  }, [])

  // set up realtime subscription so all open tabs stay in sync
  useEffect(() => {
    if (!user) return

    console.log('subscribing to realtime changes for user', user.id)

    const channel = supabase
      .channel('bookmarks-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bookmarks',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        console.log('realtime: new bookmark added', payload.new)
        setBookmarks(prev => [payload.new as Bookmark, ...prev])
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'bookmarks',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const deletedId = payload.old?.id
        if (!deletedId) return

        // if this tab triggered the delete, we already removed it optimistically — ignore
        if (locallyDeletedIds.current.has(deletedId)) {
          console.log('realtime: ignoring delete we already handled locally', deletedId)
          return
        }

        // otherwise it came from another tab — remove it here too
        console.log('realtime: bookmark deleted from another tab', deletedId)
        setBookmarks(prev => prev.filter(b => b.id !== deletedId))
      })
      .subscribe()

    return () => {
      console.log('cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [user])

  // fetch all bookmarks for the current user, sorted newest first
  const loadBookmarks = async (userId: string) => {
    console.log('fetching bookmarks...')
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('failed to load bookmarks:', error.message)
    }

    setBookmarks(data || [])
    setIsLoading(false)
    console.log(`loaded ${data?.length ?? 0} bookmarks`)
  }

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUrl.trim() || !user) return

    setIsSaving(true)
    console.log('saving bookmark:', newUrl)

    // prepend https:// if user forgot to type it





    const fullUrl = newUrl.startsWith('http') ? newUrl : `https://${newUrl}`

    // fall back to just the domain name if they didn't enter a title
    const title = newTitle.trim() || getDomain(fullUrl)

    const { error } = await supabase.from('bookmarks').insert({
      url: fullUrl,
      title,
      user_id: user.id,
    })

    if (error) {
      console.error('error saving bookmark:', error.message)
    } else {
      // clear the form — realtime will handle updating the list
      console.log('bookmark saved!')
      setNewUrl('')
      setNewTitle('')
      setShowAddForm(false)
    }

    setIsSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)

    // mark as locally deleted so realtime event doesn't double-remove it
    locallyDeletedIds.current.add(id)

    // remove from ui immediately (optimistic update — feels instant)
    setBookmarks(prev => prev.filter(b => b.id !== id))
    console.log('deleting bookmark', id)

    const { error } = await supabase.from('bookmarks').delete().eq('id', id)

    if (error) {
      // something went wrong — reload from db to restore correct state
      console.error('delete failed, reloading bookmarks:', error.message)
      loadBookmarks(user!.id)
    }

    // clear the flag after 2s, enough time for realtime to fire and get ignored
    setTimeout(() => locallyDeletedIds.current.delete(id), 2000)
    setDeletingId(null)
  }

  const handleSignOut = async () => {
    console.log('signing out...')
    await supabase.auth.signOut()
    router.push('/')
  }

  // filter bookmarks by title or url — case insensitive


  const filteredBookmarks = bookmarks.filter(b => {
    const q = searchQuery.toLowerCase()
    return (
      b.title.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen relative">





      {/* background glow blobs */}
      <div className="orb w-[600px] h-[600px] bg-purple-700/10 top-0 right-[-200px]" />
      <div className="orb w-[400px] h-[400px] bg-pink-700/8 bottom-0 left-[-100px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">





        {/* header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg">Book-Mark</span>
          </div>

          <div className="flex items-center gap-3">





            {/* show the user's google profile picture if we have it */}
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="profile picture"
                className="w-7 h-7 rounded-full opacity-80"
              />
            )}
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* page heading + bookmark count */}
        <div className="mb-8 animate-slide-up">
          <h1 className="font-display text-3xl font-bold mb-1">Your Bookmarks</h1>
          <p className="text-gray-500 text-sm">
            {bookmarks.length} saved {bookmarks.length === 1 ? 'link' : 'links'}
          </p>
        </div>

        {/* add bookmark — collapsed by default, expands on click */}
        <div className="mb-6">
          {!showAddForm ? (
            <button
              onClick={() => {
                setShowAddForm(true)
                // small delay so the input renders before we try to focus it
                setTimeout(() => urlInputRef.current?.focus(), 50)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-400 hover:bg-white/[0.02] transition-all duration-200 text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add new bookmark
            </button>
          ) : (
            <form onSubmit={handleAddBookmark} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 animate-slide-up">
              <div className="flex flex-col gap-3">
                {/* type="text" not type="url" — type="url" rejects urls pasted without https */}
                <input
                  ref={urlInputRef}
                  type="text"
                  placeholder="Paste URL here..."
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all"
                  required
                />
                <input
                  type="text"
                  placeholder="Title (optional)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewUrl('')
                      setNewTitle('')
                    }}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium transition-all disabled:opacity-50 shadow-lg shadow-purple-900/30"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* search bar — only show once there's enough bookmarks to need filtering */}
        {bookmarks.length > 3 && (
          <div className="mb-5 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-white/15 transition-all"
            />
          </div>
        )}

        {/* bookmark list */}
        {isLoading ? (
          // loading spinner while we fetch from supabase
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-white/10 border-t-purple-500 rounded-full animate-spin" />
          </div>

        ) : filteredBookmarks.length === 0 ? (
          // empty state — different message depending on whether they're searching or just have no bookmarks
          <div className="text-center py-16 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B46FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'No matches found' : 'No bookmarks yet. Add your first one above.'}
            </p>
          </div>

        ) : (
          <div className="flex flex-col gap-2">
            {filteredBookmarks.map((bookmark, index) => (
              <div
                key={bookmark.id}
                className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
              >
                {/* site favicon — hidden with onError if image fails to load */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                  <img
                    src={getFavicon(bookmark.url) || ''}
                    alt=""
                    className="w-4 h-4"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>

                {/* title, domain, and age */}
                <div className="flex-1 min-w-0">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm font-medium text-gray-200 hover:text-white truncate transition-colors"
                  >
                    {bookmark.title}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600 truncate">{getDomain(bookmark.url)}</span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-xs text-gray-700 flex-shrink-0">{timeAgo(bookmark.created_at)}</span>
                  </div>
                </div>

                {/* action buttons — only visible on row hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {/* open link in new tab */}
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-all"
                    title="Open link"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>

                  {/* delete — shows a spinner while the db request is in flight */}
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    disabled={deletingId === bookmark.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all disabled:opacity-30"
                    title="Delete"
                  >
                    {deletingId === bookmark.id ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
