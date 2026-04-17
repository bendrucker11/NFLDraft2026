-- NFL Draft Predictor — run in Supabase SQL Editor (new project, free tier)

-- Extensions
create extension if not exists "pgcrypto";

-- Players
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position text not null check (position in ('QB','RB','WR','TE','OL','Edge','DT','LB','CB','S'))
);

-- Backfill for existing projects created before `position` existed
alter table public.players add column if not exists position text;
-- Normalize legacy values (safe to re-run)
update public.players
set position = case
  when position is null then 'WR'
  when position in ('OT', 'IOL', 'G', 'T', 'C', 'OL') then 'OL'
  when position in ('EDGE', 'DE', 'OLB', 'Edge') then 'Edge'
  when position in ('WR/CB') then 'CB'
  when position in ('QB','RB','WR','TE','OL','Edge','DT','LB','CB','S') then position
  else 'WR'
end;
alter table public.players alter column position set not null;

-- Enforce allowed positions (safe to re-run)
alter table public.players drop constraint if exists players_position_check;
alter table public.players
  add constraint players_position_check
  check (position in ('QB','RB','WR','TE','OL','Edge','DT','LB','CB','S'));

-- Submissions (one per username)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);

-- Picks (per submission / player)
create table if not exists public.picks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  is_first_round boolean not null default false,
  is_top_10 boolean not null default false,
  unique (submission_id, player_id)
);

create index if not exists picks_submission_id_idx on public.picks (submission_id);

-- Actual draft results (pick 1–32). Optional; used for scoring + admin.
create table if not exists public.draft_results (
  pick_number smallint primary key check (pick_number >= 1 and pick_number <= 32),
  player_id uuid not null references public.players (id) on delete restrict
);

-- Row Level Security: public read; writes only via service role (bypasses RLS)
alter table public.players enable row level security;
alter table public.submissions enable row level security;
alter table public.picks enable row level security;
alter table public.draft_results enable row level security;

-- Policies are not `IF NOT EXISTS`-able, so make re-runs idempotent
drop policy if exists "players_select_all" on public.players;
drop policy if exists "submissions_select_all" on public.submissions;
drop policy if exists "picks_select_all" on public.picks;
drop policy if exists "draft_results_select_all" on public.draft_results;

create policy "players_select_all" on public.players for select using (true);
create policy "submissions_select_all" on public.submissions for select using (true);
create policy "picks_select_all" on public.picks for select using (true);
create policy "draft_results_select_all" on public.draft_results for select using (true);

-- Seed ~50 prospects with positions (idempotent by name)
insert into public.players (name, position) values
  ('Shedeur Sanders', 'QB'),
  ('Cam Ward', 'QB'),
  ('Tyler Shough', 'QB'),
  ('Quinn Ewers', 'QB'),
  ('Jalen Milroe', 'QB'),
  ('Garrett Nussmeier', 'QB'),
  ('DJ Lagway', 'QB'),
  ('Ashton Jeanty', 'RB'),
  ('Omarion Hampton', 'RB'),
  ('TreVeyon Henderson', 'RB'),
  ('Quinshon Judkins', 'RB'),
  ('Kalel Mullings', 'RB'),
  ('Cam Skattebo', 'RB'),
  ('RJ Harvey', 'RB'),
  ('Kaleb Johnson', 'RB'),
  ('Travis Hunter', 'CB'),
  ('Tetairoa McMillan', 'WR'),
  ('Luther Burden III', 'WR'),
  ('Emeka Egbuka', 'WR'),
  ('Matthew Golden', 'WR'),
  ('Evan Stewart', 'WR'),
  ('Jayden Higgins', 'WR'),
  ('Savion Williams', 'WR'),
  ('Mason Graham', 'DT'),
  ('Walter Nolen', 'DT'),
  ('James Pearce Jr.', 'Edge'),
  ('Mykel Williams', 'Edge'),
  ('JT Tuimoloau', 'Edge'),
  ('Princely Umanmielen', 'Edge'),
  ('Will Johnson', 'CB'),
  ('Kendrick Law', 'WR'),
  ('Tyler Booker', 'OL'),
  ('John Williams', 'OL'),
  ('Jonah Savaiinaea', 'OL'),
  ('Carson Beck', 'QB'),
  ('Will Howard', 'QB'),
  ('Woody Marks', 'RB'),
  ('Isaiah Bond', 'WR'),
  ('Isaac TeSlaa', 'WR'),
  ('Collin Oliver', 'LB'),
  ('Harold Perkins', 'LB'),
  ('Anthony Hill Jr.', 'LB'),
  ('Maxwell Hairston', 'CB'),
  ('Jahmile Wakefield', 'S'),
  ('Tacario Davis', 'CB'),
  ('Malachi Moore', 'S'),
  ('Aireontae Ersery', 'OL'),
  ('Josh Conerly Jr.', 'OL'),
  ('Marcus Tate', 'OL'),
  ('TJ Parker', 'Edge')
on conflict (name) do update set position = excluded.position;
