-- Phase 3: AI meal photo nutrition estimates.

do $$ begin
  create type public.food_meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.food_log_source as enum ('ai_photo', 'manual');
exception when duplicate_object then null; end $$;

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_type public.food_meal_type not null,
  meal_name text not null,
  calories_kcal numeric(8,2) not null default 0 check (calories_kcal >= 0),
  protein_g numeric(8,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(8,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(8,2) not null default 0 check (fat_g >= 0),
  fiber_g numeric(8,2) not null default 0 check (fiber_g >= 0),
  sodium_mg numeric(10,2) not null default 0 check (sodium_mg >= 0),
  source public.food_log_source not null default 'manual',
  note text,
  eaten_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.food_photo_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_log_id uuid references public.food_logs(id) on delete set null,
  image_path text not null,
  ai_raw_response jsonb not null default '{}'::jsonb,
  confidence_score numeric(4,3) check (confidence_score is null or confidence_score between 0 and 1),
  created_at timestamptz not null default now()
);

alter table public.food_logs enable row level security;
alter table public.food_photo_analyses enable row level security;

drop policy if exists "food_logs_patient_crud" on public.food_logs;
drop policy if exists "food_logs_care_team_select" on public.food_logs;
drop policy if exists "food_photo_analyses_patient_crud" on public.food_photo_analyses;
drop policy if exists "food_photo_analyses_care_team_select" on public.food_photo_analyses;

create policy "food_logs_patient_crud"
on public.food_logs for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "food_logs_care_team_select"
on public.food_logs for select
to authenticated
using (public.can_access_patient(user_id));

create policy "food_photo_analyses_patient_crud"
on public.food_photo_analyses for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "food_photo_analyses_care_team_select"
on public.food_photo_analyses for select
to authenticated
using (public.can_access_patient(user_id));

insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

drop policy if exists "patients_upload_own_food_photos" on storage.objects;
drop policy if exists "patients_read_own_food_photos_or_care_team" on storage.objects;

create policy "patients_upload_own_food_photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "patients_read_own_food_photos_or_care_team"
on storage.objects for select
to authenticated
using (
  bucket_id = 'meal-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_access_patient(((storage.foldername(name))[1])::uuid)
  )
);

create index if not exists food_logs_user_eaten_idx on public.food_logs(user_id, eaten_at desc);
create index if not exists food_photo_analyses_user_created_idx on public.food_photo_analyses(user_id, created_at desc);
create index if not exists food_photo_analyses_food_log_idx on public.food_photo_analyses(food_log_id);
