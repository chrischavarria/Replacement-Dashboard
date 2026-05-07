create extension if not exists "pgcrypto";

create table if not exists public.replacement_technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.replacement_reasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.replacement_entries (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.replacement_technicians(id) on delete restrict,
  reason_id uuid not null references public.replacement_reasons(id) on delete restrict,
  order_number text,
  replacement_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.replacement_technicians enable row level security;
alter table public.replacement_reasons enable row level security;
alter table public.replacement_entries enable row level security;

drop policy if exists "Public read technicians" on public.replacement_technicians;
drop policy if exists "Public insert technicians" on public.replacement_technicians;
drop policy if exists "Public delete unused technicians" on public.replacement_technicians;
drop policy if exists "Public read reasons" on public.replacement_reasons;
drop policy if exists "Public insert reasons" on public.replacement_reasons;
drop policy if exists "Public delete unused reasons" on public.replacement_reasons;
drop policy if exists "Public read entries" on public.replacement_entries;
drop policy if exists "Public insert entries" on public.replacement_entries;

create policy "Public read technicians"
  on public.replacement_technicians for select
  to anon
  using (true);

create policy "Public insert technicians"
  on public.replacement_technicians for insert
  to anon
  with check (true);

create policy "Public delete unused technicians"
  on public.replacement_technicians for delete
  to anon
  using (true);

create policy "Public read reasons"
  on public.replacement_reasons for select
  to anon
  using (true);

create policy "Public insert reasons"
  on public.replacement_reasons for insert
  to anon
  with check (true);

create policy "Public delete unused reasons"
  on public.replacement_reasons for delete
  to anon
  using (true);

create policy "Public read entries"
  on public.replacement_entries for select
  to anon
  using (true);

create policy "Public insert entries"
  on public.replacement_entries for insert
  to anon
  with check (true);

create index if not exists replacement_entries_date_idx on public.replacement_entries(replacement_date);
create index if not exists replacement_entries_technician_idx on public.replacement_entries(technician_id);
create index if not exists replacement_entries_reason_idx on public.replacement_entries(reason_id);
