# Bookmark

A minimal, elegant bookmark manager built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- Google sign-in with no passwords  
- Private bookmarks per user  
- Real-time sync  
- Instant delete  
- Search and filter  
- Automatic favicon loading  
- Responsive UI with dark mode  

Live Demo : https://book-mark-svhv.vercel.app

---

## Setup

### 1. Supabase Project

1. Create a new project at supabase.com  
2. Open the SQL Editor and run the following:


```sql
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  notes text default '' not null,
  tags text[] default '{}' not null,
  pinned boolean default false not null,
  created_at timestamptz default now() not null
);


3. Enable Realtime for the `bookmarks` table:
   - Go to **Database → Replication** → enable `bookmarks` table for publication.

### 2. Google OAuth

1. Supabase → Auth → Providers → Google → Enable
2. Copy the Callback URL
3. Google Cloud Console:
   - Create OAuth Client
   - Add Supabase callback URL
   - Add `https://your-app.vercel.app/auth/callback`
4. Paste Client ID & Secret back into Supabase


### 3. Environment Variables

Create `.env.local` from the example:

```bash
cp .env.local
```

Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Find these in Supabase: **Project Settings → API**.

### 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000]

---

## Deploy to Vercel

1. Push the project to GitHub  
2. Import the repo on Vercel  
3. Add env vars:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY  
4. Deploy  

After deployment, add your Vercel URL to:
- Supabase → Auth → URL Configuration (Site URL + Redirect URL)
- Google OAuth → Authorized Redirect URIs



---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth & DB | Supabase (Auth, Postgres, Realtime) |
| Styling | Tailwind CSS |
| Fonts | DM Sans + Syne (Google Fonts) |
| Deployment | Vercel |

# Common Issues I ran into (and how I fixed them)

These are bugs I actually hit while building this. Putting them here so you don't have to spend hours on the same stuff.

---

## 1. Google OAuth Error 400: redirect_uri_mismatch

This one got me for a while. Basically the redirect URL you have in Google Cloud Console doesn't match what Supabase expects.

Go to Supabase → Auth → Providers → Google and copy the callback URL it gives you. Then go to Google Cloud Console → your OAuth credentials → Authorised redirect URIs and paste it in exactly. No trailing slashes, no typos.

---

## 2. Logged in but the page just shows a blank screen

Happened after OAuth login — the redirect went through fine but the page was completely empty, no error, nothing.

The problem was the component was rendering before Supabase had a chance to restore the session from the cookie. Fix is to wait until you actually know if there's a session before rendering anything:

```js
const [loading, setLoading] = useState(true);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user ?? null);
    setLoading(false);
  });
}, []);

if (loading) return null;
```

---

## 3. After login it just goes back to `/` instead of `/bookmarks`

This is a Supabase config issue. Go to Supabase → Auth → URL Configuration → Site URL and make sure it's set correctly.

- Local: `http://localhost:3000`
- Production: your actual Vercel URL

---

## 4. Module not found: `@/lib/supabase/client`

If you're getting this, either the file doesn't exist or the path alias isn't set up. Check two things:

1. Make sure `lib/supabase/client.ts` actually exists
2. Open `tsconfig.json` and confirm you have this:

```json
"paths": { "@/*": ["./*"] }
```

---

## 5. Deleting a bookmark doesn't update other tabs

This one was annoying to debug. There were actually three problems stacked on top of each other:

- The Realtime subscription was only listening for `INSERT` — never set up a `DELETE` listener
- Even after adding it, Supabase doesn't send the old row data by default so `payload.old` is empty and you can't tell which bookmark got deleted
- The tab that did the delete would get its own Realtime event and try to delete it again, causing a double-remove

Here's how I fixed all three:

First run this in the Supabase SQL editor — this makes Postgres actually include the deleted row in the payload:

```sql
ALTER TABLE bookmarks REPLICA IDENTITY FULL;
```

Then add a DELETE listener alongside your INSERT one. And to stop the double-remove bug, track which IDs this tab is currently deleting using a ref:

```js
const localDeleting = useRef(new Set());

async function deleteBookmark(id) {
  localDeleting.current.add(id);
  setBookmarks(prev => prev.filter(b => b.id !== id)); // update UI immediately
  await supabase.from("bookmarks").delete().eq("id", id);
  setTimeout(() => localDeleting.current.delete(id), 2000);
}

// in your Realtime DELETE handler:
if (localDeleting.current.has(payload.old.id)) {
  return; // this tab already handled it, skip
}
setBookmarks(prev => prev.filter(b => b.id !== payload.old.id));
```

---

## 6. Pushed a fix to GitHub but Vercel is still failing

Vercel caches builds pretty aggressively and sometimes gets stuck. Try these in order:

1. Go to Vercel → Deployments → find the latest one → three dots → Redeploy. Make sure you **uncheck** "Use existing build cache"

2. Check Settings → Git and make sure Vercel is actually connected to the right repo and watching `main`

3. Run `git log --oneline` locally to confirm your commit is there, then `git push` again if needed

4. Last resort: Vercel → Settings → Delete Build Cache, then deploy fresh
