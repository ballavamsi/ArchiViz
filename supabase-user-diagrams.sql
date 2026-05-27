create table if not exists public.user_diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  payload jsonb not null,
  node_count integer not null default 0,
  edge_count integer not null default 0,
  thumbnail_svg text,
  is_public boolean not null default false,
  public_slug text unique,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_diagrams
  add column if not exists is_public boolean not null default false,
  add column if not exists public_slug text unique,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users(id) on delete set null,
  add column if not exists last_opened_at timestamptz;

create index if not exists user_diagrams_user_updated_idx
  on public.user_diagrams (user_id, updated_at desc);

create index if not exists user_diagrams_user_title_idx
  on public.user_diagrams (user_id, title);

create unique index if not exists user_diagrams_public_slug_idx
  on public.user_diagrams (public_slug)
  where public_slug is not null;

create table if not exists public.flow_versions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.user_diagrams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null,
  title text not null,
  payload jsonb not null,
  node_count integer not null default 0,
  edge_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(flow_id, version_number)
);

create index if not exists flow_versions_flow_version_idx
  on public.flow_versions (flow_id, version_number desc);

create table if not exists public.flow_comments (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.user_diagrams(id) on delete cascade,
  public_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  target_type text not null check (target_type in ('flow','node','edge')),
  target_id text,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flow_comments_slug_idx
  on public.flow_comments (public_slug, resolved, created_at);

alter table public.user_diagrams enable row level security;

drop policy if exists "Users can read their diagrams" on public.user_diagrams;
create policy "Users can read their diagrams"
  on public.user_diagrams for select
  using (auth.uid() = user_id or is_public = true);

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

alter table public.flow_versions enable row level security;

drop policy if exists "Users can read their flow versions" on public.flow_versions;
create policy "Users can read their flow versions"
  on public.flow_versions for select
  using (exists (
    select 1 from public.user_diagrams d
    where d.id = flow_id and d.user_id = auth.uid()
  ));

drop policy if exists "Users can create their flow versions" on public.flow_versions;
create policy "Users can create their flow versions"
  on public.flow_versions for insert
  with check (auth.uid() = user_id and exists (
    select 1 from public.user_diagrams d
    where d.id = flow_id and d.user_id = auth.uid()
  ));

drop policy if exists "Users can delete their old flow versions" on public.flow_versions;
create policy "Users can delete their old flow versions"
  on public.flow_versions for delete
  using (exists (
    select 1 from public.user_diagrams d
    where d.id = flow_id and d.user_id = auth.uid()
  ));

alter table public.flow_comments enable row level security;

drop policy if exists "Published flow comments are readable" on public.flow_comments;
create policy "Published flow comments are readable"
  on public.flow_comments for select
  using (exists (
    select 1 from public.user_diagrams d
    where d.id = flow_id and (d.is_public = true or d.user_id = auth.uid())
  ));

drop policy if exists "Signed in users can comment on public flows" on public.flow_comments;
create policy "Signed in users can comment on public flows"
  on public.flow_comments for insert
  with check (auth.uid() = user_id and exists (
    select 1 from public.user_diagrams d
    where d.id = flow_id and d.is_public = true
  ));

drop policy if exists "Owners can resolve flow comments" on public.flow_comments;
create policy "Owners can resolve flow comments"
  on public.flow_comments for update
  using (exists (
    select 1 from public.user_diagrams d
    where d.id = flow_id and d.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.user_diagrams d
    where d.id = flow_id and d.user_id = auth.uid()
  ));

drop policy if exists "Owners can delete flow comments" on public.flow_comments;
create policy "Owners can delete flow comments"
  on public.flow_comments for delete
  using (exists (
    select 1 from public.user_diagrams d
    where d.id = flow_id and d.user_id = auth.uid()
  ));
