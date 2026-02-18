# Bookmark

A minimal, elegant bookmark manager built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- 🔐 Google OAuth authentication (no passwords)
- 🔒 Private bookmarks per user
- ⚡ Real-time sync via Supabase Realtime
- 🗑️ Delete bookmarks instantly
- 🔍 Search/filter bookmarks
- 🌐 Auto favicon loading
- 📱 Responsive, dark-mode UI

---

## Setup

### 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the SQL editor, run:

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

-- Row Level Security
alter table bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on bookmarks for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on bookmarks for insert with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
  on bookmarks for update using (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on bookmarks for delete using (auth.uid() = user_id);
```

3. Enable Realtime for the `bookmarks` table:
   - Go to **Database → Replication** → enable `bookmarks` table for publication.

### 2. Google OAuth

1. In Supabase: **Authentication → Providers → Google** → enable it.
2. Copy the **Callback URL** shown (e.g. `https://xxxx.supabase.co/auth/v1/callback`).
3. Go to [Google Cloud Console](https://console.cloud.google.com):
   - Create a project → APIs & Services → OAuth 2.0 Client IDs
   - Add the Supabase callback URL as an **Authorized Redirect URI**
   - Also add your Vercel URL: `https://your-app.vercel.app/auth/callback`
4. Paste the **Client ID** and **Client Secret** back into Supabase.

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

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push to GitHub.
2. Import repo on [vercel.com](https://vercel.com).
3. Add env variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. Add your Vercel URL (`https://your-app.vercel.app`) to:
   - Supabase: **Authentication → URL Configuration → Site URL**
   - Supabase: **Authentication → URL Configuration → Redirect URLs** → add `https://your-app.vercel.app/auth/callback`
   - Google OAuth: **Authorized redirect URIs**


---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth & DB | Supabase (Auth, Postgres, Realtime) |
| Styling | Tailwind CSS |
| Fonts | DM Sans + Syne (Google Fonts) |
| Deployment | Vercel |
