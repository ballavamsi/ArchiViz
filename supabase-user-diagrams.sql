create table if not exists public.user_diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  payload jsonb not null,
  node_count integer not null default 0,
  edge_count integer not null default 0,
  thumbnail_svg text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_diagrams_user_updated_idx
  on public.user_diagrams (user_id, updated_at desc);

create index if not exists user_diagrams_user_title_idx
  on public.user_diagrams (user_id, title);

alter table public.user_diagrams enable row level security;

drop policy if exists "Users can read their diagrams" on public.user_diagrams;
create policy "Users can read their diagrams"
  on public.user_diagrams for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their diagrams" on public.user_diagrams;
create policy "Users can create their diagrams"
  on public.user_diagrams for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their diagrams" on public.user_diagrams;
create policy "Users can update their diagrams"
  on public.user_diagrams for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their diagrams" on public.user_diagrams;
create policy "Users can delete their diagrams"
  on public.user_diagrams for delete
  using (auth.uid() = user_id);
