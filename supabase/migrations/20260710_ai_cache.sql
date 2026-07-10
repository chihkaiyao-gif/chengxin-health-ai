create table if not exists public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  prompt_type text not null,
  prompt_version text not null,
  input_hash text not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.ai_cache enable row level security;

drop policy if exists "ai_cache_no_direct_client_access" on public.ai_cache;

create policy "ai_cache_no_direct_client_access"
on public.ai_cache
for all
using (false)
with check (false);

create index if not exists ai_cache_lookup_idx
  on public.ai_cache(cache_key, expires_at);

create index if not exists ai_cache_prompt_idx
  on public.ai_cache(prompt_type, prompt_version, created_at desc);
