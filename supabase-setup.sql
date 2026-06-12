-- ============================================================
--  SpatMap — Supabase backend setup
--  Paste this ENTIRE file into your Supabase project:
--    Dashboard → SQL Editor → New query → paste → Run.
--  Safe to re-run: every statement is idempotent.
--
--  What it builds:
--   - Tables that mirror the app's data (farms, areas, plots,
--     lines, cages, events) plus crew membership + invites.
--   - Row-Level Security so a person only ever sees farms they
--     belong to, and only owners can add crew.
--   - Server-set timestamps + a version counter that make the
--     offline sync safe against bad device clocks.
-- ============================================================

create extension if not exists pgcrypto;          -- gen_random_uuid(), gen_random_bytes()

-- Global monotonic counter — the sync cursor. Every change to a
-- synced row gets the next number; clients pull "everything newer
-- than the last number I saw". Immune to clock skew.
create sequence if not exists row_version_seq;

-- ------------------------------------------------------------
--  Server-authoritative metadata trigger (M1)
--  Runs as definer so clients never need sequence privileges and
--  can never spoof updated_at / row_version — the server owns them.
-- ------------------------------------------------------------
create or replace function set_row_meta() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  new.updated_at  := clock_timestamp();
  new.row_version := nextval('row_version_seq');
  return new;
end $$;

-- ============================================================
--  TABLES
--  IDs are text (not uuid) so the app's existing record ids
--  migrate in untouched; new server rows still get a uuid. (M4)
--  No hard foreign keys between sync tables: a child row can
--  arrive before its parent during a push, and a hard FK would
--  turn that transient ordering into a sync failure. (N5)
-- ============================================================

-- Profile stub, one row per auth user. Not a sync table.
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  updated_at   timestamptz not null default now()
);

create table if not exists farms (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  market_size_mm double precision not null default 76,
  created_by     uuid not null default auth.uid(),
  deleted        boolean not null default false,
  updated_at     timestamptz not null,
  row_version    bigint not null
);

-- Crew roster. Synced (so members see who's on a farm) but with
-- owner-only write rules. (M2)
create table if not exists farm_members (
  farm_id     text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member',   -- 'owner' | 'member'
  updated_at  timestamptz not null,
  row_version bigint not null,
  primary key (farm_id, user_id)
);

-- Single-use, expiring invites. Managed by owners; accepted via the
-- accept_invite() function. NOT part of the sync loop. (M3)
create table if not exists farm_invites (
  id          text primary key default gen_random_uuid()::text,
  farm_id     text not null,
  email       text,
  code        text not null unique default encode(gen_random_bytes(9), 'base64'),
  invited_by  uuid not null default auth.uid(),
  accepted_at timestamptz,
  expires_at  timestamptz not null default now() + interval '30 days',
  updated_at  timestamptz not null default now()
);

create table if not exists cage_types (
  id          text primary key default gen_random_uuid()::text,
  farm_id     text not null,
  name        text not null,
  shape       text not null,
  sort_order  double precision not null default 0,
  deleted     boolean not null default false,
  updated_at  timestamptz not null,
  row_version bigint not null
);

create table if not exists areas (
  id          text primary key default gen_random_uuid()::text,
  farm_id     text not null,
  name        text not null,
  sort_order  double precision not null default 0,
  deleted     boolean not null default false,
  updated_at  timestamptz not null,
  row_version bigint not null
);

create table if not exists sections (   -- "plots" in the UI
  id          text primary key default gen_random_uuid()::text,
  farm_id     text not null,
  area_id     text not null,
  name        text not null,
  vert        boolean not null default false,
  sort_order  double precision not null default 0,
  deleted     boolean not null default false,
  updated_at  timestamptz not null,
  row_version bigint not null
);

create table if not exists lines (
  id          text primary key default gen_random_uuid()::text,
  farm_id     text not null,
  section_id  text not null,
  name        text not null,
  sort_order  double precision not null default 0,
  deleted     boolean not null default false,
  updated_at  timestamptz not null,
  row_version bigint not null
);

create table if not exists cages (
  id          text primary key default gen_random_uuid()::text,
  farm_id     text not null,
  line_id     text not null,
  label       text,
  type_id     text,
  position    double precision not null default 0,
  batch       jsonb,                    -- stocked-batch object, edited atomically with the cage
  deleted     boolean not null default false,
  updated_at  timestamptz not null,
  row_version bigint not null
);

create table if not exists events (
  id          text primary key default gen_random_uuid()::text,
  farm_id     text not null,
  cage_id     text not null,
  type        text not null,            -- growth | mortality | harvest | note
  date        date,
  size_mm     double precision,
  count       integer,
  note        text,
  batch_id    text,
  created_by  uuid default auth.uid(),  -- "who logged this" for the field log
  deleted     boolean not null default false,
  updated_at  timestamptz not null,
  row_version bigint not null
);

-- Indexes for the sync pull (by version) and parent lookups.
create index if not exists idx_farms_version        on farms(row_version);
create index if not exists idx_members_user          on farm_members(user_id);
create index if not exists idx_members_farm_version   on farm_members(farm_id, row_version);
create index if not exists idx_cage_types_farm_version on cage_types(farm_id, row_version);
create index if not exists idx_areas_farm_version     on areas(farm_id, row_version);
create index if not exists idx_sections_farm_version  on sections(farm_id, row_version);
create index if not exists idx_lines_farm_version     on lines(farm_id, row_version);
create index if not exists idx_cages_farm_version     on cages(farm_id, row_version);
create index if not exists idx_events_farm_version    on events(farm_id, row_version);
create index if not exists idx_invites_code           on farm_invites(code);

-- ============================================================
--  SECURITY HELPERS (M2)
--  SECURITY DEFINER + pinned search_path so they can read the
--  membership table without tripping RLS recursion or being
--  hijacked by a planted table. STABLE so the planner calls
--  them once per statement, not once per row.
-- ============================================================
create or replace function is_farm_member(fid text) returns boolean
language sql security definer set search_path = public, pg_temp stable
as $$ select exists(select 1 from farm_members where farm_id = fid and user_id = auth.uid()) $$;

create or replace function is_farm_owner(fid text) returns boolean
language sql security definer set search_path = public, pg_temp stable
as $$ select exists(select 1 from farm_members where farm_id = fid and user_id = auth.uid() and role = 'owner') $$;

-- ============================================================
--  TRIGGERS: attach set_row_meta to every synced table
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['farms','farm_members','cage_types','areas','sections','lines','cages','events'] loop
    execute format('drop trigger if exists trg_meta on %I', t);
    execute format('create trigger trg_meta before insert or update on %I for each row execute function set_row_meta()', t);
  end loop;
end $$;

-- When a farm is created (including via offline sync push), make its
-- creator the owner. Definer so it can write the membership row.
create or replace function add_farm_owner() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into farm_members(farm_id, user_id, role, updated_at, row_version)
  values (new.id, new.created_by, 'owner', clock_timestamp(), nextval('row_version_seq'))
  on conflict (farm_id, user_id) do nothing;
  return new;
end $$;
drop trigger if exists trg_farm_owner on farms;
create trigger trg_farm_owner after insert on farms
  for each row execute function add_farm_owner();

-- Auto-create a profile stub on signup (the one place a signup
-- trigger is right — it's a row stub, not a permission grant).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
--  ROW-LEVEL SECURITY
-- ============================================================

-- Generic data tables: a member of the farm can do anything to its
-- rows. Both USING (read/update/delete visibility) and WITH CHECK
-- (insert/update legality) so nobody can write into another farm.
do $$
declare t text;
begin
  foreach t in array array['cage_types','areas','sections','lines','cages','events'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists p_sel on %I', t);
    execute format('drop policy if exists p_ins on %I', t);
    execute format('drop policy if exists p_upd on %I', t);
    execute format('drop policy if exists p_del on %I', t);
    execute format('create policy p_sel on %I for select using (is_farm_member(farm_id))', t);
    execute format('create policy p_ins on %I for insert with check (is_farm_member(farm_id))', t);
    execute format('create policy p_upd on %I for update using (is_farm_member(farm_id)) with check (is_farm_member(farm_id))', t);
    execute format('create policy p_del on %I for delete using (is_farm_member(farm_id))', t);
  end loop;
end $$;

-- farms: members read & edit; any signed-in user can create one
-- (they become owner via the trigger).
alter table farms enable row level security;
drop policy if exists p_sel on farms;
drop policy if exists p_ins on farms;
drop policy if exists p_upd on farms;
create policy p_sel on farms for select using (is_farm_member(id));
create policy p_ins on farms for insert with check (created_by = auth.uid());
create policy p_upd on farms for update using (is_farm_member(id)) with check (is_farm_member(id));

-- farm_members: members can read the roster; only OWNERS may add,
-- change, or remove crew. No self-insert / self-promotion.
alter table farm_members enable row level security;
drop policy if exists p_sel on farm_members;
drop policy if exists p_ins on farm_members;
drop policy if exists p_upd on farm_members;
drop policy if exists p_del on farm_members;
create policy p_sel on farm_members for select using (is_farm_member(farm_id));
create policy p_ins on farm_members for insert with check (is_farm_owner(farm_id));
create policy p_upd on farm_members for update using (is_farm_owner(farm_id)) with check (is_farm_owner(farm_id));
create policy p_del on farm_members for delete using (is_farm_owner(farm_id));

-- farm_invites: owner-only. Invited users never read this directly;
-- accept_invite() (definer) handles redemption.
alter table farm_invites enable row level security;
drop policy if exists p_all on farm_invites;
create policy p_all on farm_invites for all using (is_farm_owner(farm_id)) with check (is_farm_owner(farm_id));

-- profiles: anyone signed in can read display names (to show "who
-- logged this"); you can only write your own.
alter table profiles enable row level security;
drop policy if exists p_sel on profiles;
drop policy if exists p_ins on profiles;
drop policy if exists p_upd on profiles;
create policy p_sel on profiles for select using (auth.role() = 'authenticated');
create policy p_ins on profiles for insert with check (id = auth.uid());
create policy p_upd on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================
--  accept_invite(code): redeem a crew invite. (M3)
--  Single-use, expiry-checked, runs in a controlled definer
--  context so the membership insert is safe.
-- ============================================================
create or replace function accept_invite(invite_code text) returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare inv farm_invites;
begin
  select * into inv from farm_invites where code = invite_code;
  if inv.id is null              then raise exception 'Invite not found'; end if;
  if inv.accepted_at is not null then raise exception 'Invite already used'; end if;
  if inv.expires_at < now()      then raise exception 'Invite expired'; end if;
  -- Optional: bind the invite to the address it was sent to. Uncomment
  -- to require the email to match (turns the link into a confirmation):
  -- if lower(coalesce(inv.email,'')) <> lower(coalesce(auth.email(),'')) then
  --   raise exception 'This invite was sent to a different email';
  -- end if;
  insert into farm_members(farm_id, user_id, role, updated_at, row_version)
  values (inv.farm_id, auth.uid(), 'member', clock_timestamp(), nextval('row_version_seq'))
  on conflict (farm_id, user_id) do nothing;
  update farm_invites set accepted_at = now() where id = inv.id;
  return inv.farm_id;
end $$;
grant execute on function accept_invite(text) to authenticated;

-- ============================================================
--  Table privileges (RLS still gates every row on top of these)
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Done. Re-run any time after edits — it's all idempotent.
