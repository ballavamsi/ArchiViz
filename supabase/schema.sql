-- Archi-Flow diagram storage
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run

create table if not exists public.diagrams (
  id          text        primary key,          -- 8-char random slug, e.g. "a3f8bc12"
  title       text        not null default '',
  payload     jsonb       not null,             -- full architecture JSON
  created_at  timestamptz not null default now(),
  views       bigint      not null default 0
);

-- Index for fast lookups by id (already PK, just being explicit)
create index if not exists diagrams_id_idx on public.diagrams (id);

-- Row Level Security — public read, public insert, no client-side update/delete
alter table public.diagrams enable row level security;

drop policy if exists "Public read"   on public.diagrams;
drop policy if exists "Public insert" on public.diagrams;

create policy "Public read"
  on public.diagrams for select
  using (true);

create policy "Public insert"
  on public.diagrams for insert
  with check (
    length(id) = 8                          -- enforce short ID format
    and octet_length(payload::text) < 524288 -- max 512 KB per diagram
  );

-- Increment view counter (called via RPC so anon key can't do raw UPDATE)
create or replace function public.increment_views(diagram_id text)
returns void language plpgsql security definer as $$
begin
  update public.diagrams set views = views + 1 where id = diagram_id;
end;
$$;
