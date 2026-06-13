-- ═══════════════════════════════════════════════════════════════════
-- SeedGuard v3 — Social system (friends, DMs, leaderboard, deletion)
-- Run this ONCE in: Supabase → SQL Editor → paste → Run
-- Safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Profiles: ensure table + streak columns for the leaderboard ──
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text,
  avatar_url text,
  stats_json text,
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists current_streak int  default 0;
alter table public.profiles add column if not exists best_streak    int  default 0;
alter table public.profiles add column if not exists streak_start   timestamptz;
alter table public.profiles add column if not exists last_active    timestamptz default now();

-- Case-insensitive unique usernames (ignore nulls)
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username)) where username is not null;

alter table public.profiles enable row level security;

drop policy if exists "Public profiles readable" on public.profiles;
create policy "Public profiles readable"
  on public.profiles for select using (true);

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- ── 2. Friendships (requests + accepted, duplicate-proof) ───────────
create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (requester <> addressee)
);

-- One relationship per pair, regardless of direction → no duplicates ever
create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

create index if not exists friendships_requester_idx on public.friendships (requester);
create index if not exists friendships_addressee_idx on public.friendships (addressee);

alter table public.friendships enable row level security;

drop policy if exists "View own friendships" on public.friendships;
create policy "View own friendships"
  on public.friendships for select
  using (auth.uid() in (requester, addressee));

drop policy if exists "Send requests" on public.friendships;
create policy "Send requests"
  on public.friendships for insert
  with check (auth.uid() = requester and status = 'pending');

drop policy if exists "Respond to requests" on public.friendships;
create policy "Respond to requests"
  on public.friendships for update
  using (auth.uid() = addressee and status = 'pending')
  with check (status = 'accepted');

drop policy if exists "Remove friendships" on public.friendships;
create policy "Remove friendships"
  on public.friendships for delete
  using (auth.uid() in (requester, addressee));

-- ── 3. Direct messages ───────────────────────────────────────────────
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  sender     uuid not null references public.profiles(id) on delete cascade,
  recipient  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 1000),
  read       boolean default false,
  created_at timestamptz default now()
);

create index if not exists messages_convo_idx on public.messages (sender, recipient, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient, read);

alter table public.messages enable row level security;

drop policy if exists "View own messages" on public.messages;
create policy "View own messages"
  on public.messages for select
  using (auth.uid() in (sender, recipient));

-- Can only DM accepted friends (server-side enforcement, not just UI)
drop policy if exists "Send messages to friends" on public.messages;
create policy "Send messages to friends"
  on public.messages for insert
  with check (
    auth.uid() = sender
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester = sender and f.addressee = recipient)
          or (f.requester = recipient and f.addressee = sender))
    )
  );

drop policy if exists "Mark received as read" on public.messages;
create policy "Mark received as read"
  on public.messages for update
  using (auth.uid() = recipient)
  with check (auth.uid() = recipient);

drop policy if exists "Delete own messages" on public.messages;
create policy "Delete own messages"
  on public.messages for delete
  using (auth.uid() = sender);

-- ── 4. Server-side rate limit on social writes (anti-spam) ──────────
create or replace function public.enforce_message_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages
      where sender = new.sender and created_at > now() - interval '10 seconds') >= 5 then
    raise exception 'Rate limit: slow down a little.';
  end if;
  return new;
end; $$;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.enforce_message_rate_limit();

create or replace function public.enforce_request_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.friendships
      where requester = new.requester and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Rate limit: too many friend requests, try again in a minute.';
  end if;
  return new;
end; $$;

drop trigger if exists friendships_rate_limit on public.friendships;
create trigger friendships_rate_limit
  before insert on public.friendships
  for each row execute function public.enforce_request_rate_limit();

-- ── 5. Realtime for DMs + friend requests ───────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null; end $$;

-- ── 6. Permanent account deletion (called from Settings) ────────────
-- security definer lets the user delete their own auth row;
-- all app data cascades via the FKs above.
create or replace function public.delete_user()
returns void language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_user() from anon, public;
grant execute on function public.delete_user() to authenticated;
