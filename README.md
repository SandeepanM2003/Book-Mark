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
