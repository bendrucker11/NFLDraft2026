# NFL Draft Predictor (MVP)

Next.js (App Router) + Supabase + Tailwind. Users enter a name and picks. Admin can log in, manage submissions, and enter real draft results.

## Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project
- A free [Vercel](https://vercel.com) account (for deployment)

## Local setup

1. **Clone / open this folder** and install dependencies:

   ```bash
   npm install
   ```

2. **Create a Supabase project** (free tier).

3. **Run the SQL schema** in the Supabase dashboard → **SQL Editor** → New query → paste the contents of `supabase/schema.sql` → Run. This creates tables, RLS read policies, and seeds ~50 players.

4. **Environment variables** — copy `.env.example` to `.env.local` and fill in:

   | Variable | Where to find it |
   |----------|------------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` **secret** |

   **Security:** The service role key bypasses RLS. Use it only in server code (this app uses it in Server Actions and Server Components). Never expose it in client bundles or public repos.

   Required:
   - `ADMIN_SECRET` — password for `/admin` login.

   Optional (defaults already match this app's deadlines):
   - `SUBMISSIONS_LOCK_AT` — defaults to `2026-04-23T19:30:00-04:00`
   - `LEADERBOARD_REVEAL_AT` — defaults to `2026-04-23T20:00:00-04:00`

5. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel (free tier)

1. Push this repository to GitHub (or GitLab / Bitbucket).

2. In [Vercel](https://vercel.com) → **Add New Project** → import the repo.

3. **Environment variables** (Project → Settings → Environment Variables), add for *Production* (and *Preview* if you want):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optionally `SUBMISSIONS_LOCK_AT`, `ADMIN_SECRET`

4. Deploy. Vercel runs `npm run build` automatically.

5. After the first deploy:
   - `/` submit predictions
   - `/leaderboard` view entries (public only after reveal time; admin can always view)
   - `/admin` log in as admin, input official picks, and delete submissions

**Supabase free tier:** Fits this MVP (Postgres + API limits are generous for a small app). **Vercel Hobby:** Sufficient for this stack.

## Scoring (optional)

When all **32** rows exist in `draft_results` (via Admin), the leaderboard shows:

- **Hits (1st):** first-round predictions that match any actual first-round pick.
- **Hits (T10):** top-10 predictions that match picks **1–10**.

## Project structure

- `app/page.tsx` — Home form
- `app/leaderboard/page.tsx` — All submissions
- `app/admin/page.tsx` — Admin login + management
- `app/actions/draft.ts` — Submit server action
- `app/actions/admin.ts` — Admin auth + save results + delete submission
- `lib/supabase/admin.ts` — Service-role Supabase client (server-only)
- `supabase/schema.sql` — Database DDL + seed

## Troubleshooting

- **“Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY”** — Add both to `.env.local` (local) or Vercel env (production) and restart.
- **Leaderboard empty embed / relation errors** — Ensure `schema.sql` ran; foreign keys from `picks.player_id` → `players.id` must exist so Supabase can nest `players` in queries.
- **Duplicate name** — `submissions.username` is unique; use a different display name or delete the row in Supabase for testing.
