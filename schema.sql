-- Hood Cheggy: optional audit table.
-- Public eligibility does NOT depend on a manually uploaded CSV.
-- Keep this table private; use it only if you later want cached verification results.
create table if not exists public.eligibility_checks (
  id bigint generated always as identity primary key,
  address text not null,
  eligible boolean not null,
  chain_id integer not null default 4663,
  checked_at timestamptz not null default now()
);
create index if not exists eligibility_checks_address_idx
  on public.eligibility_checks (lower(address));
alter table public.eligibility_checks enable row level security;
-- No public SELECT/INSERT policies: Edge Function uses service role if auditing is enabled.
