# Supabase Sync — Setup for Family Multi-Device

Branch: `feat/supabase-sync` — stays on **GitHub Pages** (`https://swarnavacodes.github.io/scheduler-pro/`), no server needed.

## Goal (your requirements)
- You + family each have own data, Google OAuth login
- Offline edits queue in `localStorage` and sync later when online
- Migrate existing `localStorage` (`daily-scheduler-store`) on first login
- Keep Export/Import JSON working
- Review on branch before merge to `main`

## Option Chosen: Supabase (open-source, free tier)
- 500 MB DB, 50k MAU, Auth free, Realtime, RLS
- Works from GitHub Pages via CDN ESM (`@supabase/supabase-js`), no backend

---

## 1) Create Supabase Project (5 min)

1. Go to https://supabase.com → New Project → free tier
2. Note **Project URL** (`https://<PROJECT>.supabase.co`) and **anon key** (Project Settings → API)
3. Copy `supabase.config.example.js` → `supabase.config.js` and paste values (file is gitignored)

## 2) Enable Google OAuth

1. **Google Cloud Console** → https://console.cloud.google.com
   - Create project (or use existing) → APIs & Services → Credentials → Create OAuth client ID
   - Type: Web application, Authorized redirect URI: `https://<PROJECT>.supabase.co/auth/v1/callback`
   - Copy Client ID + Secret
2. **Supabase Dashboard** → Authentication → Providers → Google → Enable, paste ID/Secret
3. Supabase → Authentication → URL Configuration
   - Site URL: `https://swarnavacodes.github.io/scheduler-pro/`
   - Additional Redirect URLs: `https://swarnavacodes.github.io/scheduler-pro/index.html` and `http://localhost:3000` (for local dev)

## 3) Create DB Schema

Supabase → SQL Editor → New query → paste:

```sql
-- One row per user: whole store JSON (simplest for offline last-write-wins)
-- Family members are isolated by user_id (RLS)
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "Users can select own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- For Realtime (optional)
alter publication supabase_realtime add table public.user_data;
```

> Alternative (future): split to `tasks`/`habits`/`intentions` tables per row for finer conflict resolution. Start with `user_data` blob — maps 1:1 to current `localStorage`.

## 4) How the Code Works (branch `feat/supabase-sync`)

- `daily-scheduler-pro.html:3103` `saveStore()` now:
  1. Writes to `localStorage` immediately (offline-first)
  2. If `navigator.onLine && supabase.auth.getUser()` → `upsert` to `user_data` (`user_id`, `store`, `updated_at`)
  3. Else → push JSON to `localStorage` queue `scheduler-pending-sync`
- `loadStore()` on auth: `select` from `user_data` → if server newer (`updated_at` > local), overwrite LS and `location.reload()`-style re-render
- `window.addEventListener('online', flushQueue)` → replays pending upserts
- Auth UI: header shows `Sign in with Google` when logged out, avatar + `Sign out` + `Sync: ✓ / Offline (N pending)` when logged in
- Migration: first login checks `localStorage['daily-scheduler-store']` has data and server row empty → auto-upsert (no data loss)
- Export/Import: Export still downloads JSON; Import writes to LS **and** queues sync (so other device gets it)

Files added on this branch:
- `supabase.config.js` (gitignored, from `supabase.config.example.js`)
- `js/supabase-sync.js` (ESM, CDN import, no npm build needed)
- Tests `tests/sync.spec.js` (mock Supabase, offline queue)

## 5) Local Dev

```bash
git checkout feat/supabase-sync
cp supabase.config.example.js supabase.config.js  # fill URL + anon key
npm install
npm test  # 31 existing + new sync tests
npx http-server . -p 3000
# open http://localhost:3000/index.html → Sign in with Google → test offline: DevTools → Offline → add task → go online → check Supabase Table Editor
```

## 6) Review Before Merge

- Branch is pushed to `origin/feat/supabase-sync` — open PR `feat/supabase-sync → main`
- CI: Playwright tests run with mocked Supabase (no real keys needed)
- Manual review checklist:
  - [ ] Login/logout works for you + one family member (separate Google accounts see separate data)
  - [ ] Add task offline (airplane mode) → `Sync: Offline (1 pending)` → go online → task appears on other device after reload
  - [ ] Refresh keeps tasks (LS + server)
  - [ ] Export still downloads, Import still restores and syncs

## 7) After Merge

- Merge PR → `main` auto-deploys to Pages
- Existing users on `localStorage` only: first Google login migrates their data automatically

## Rollback

- Auth failure or missing `supabase.config.js` → app falls back to pure `localStorage` (current behavior), no breakage
