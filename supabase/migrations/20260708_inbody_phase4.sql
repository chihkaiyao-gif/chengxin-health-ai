-- Phase 4: InBody photo recognition and trend tracking.

do $$ begin
  create type public.inbody_record_source as enum ('ai_photo', 'manual');
exception when duplicate_object then null; end $$;

create table if not exists public.inbody_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(6,2),
  skeletal_muscle_kg numeric(6,2),
  body_fat_mass_kg numeric(6,2),
  body_fat_percentage numeric(5,2),
  bmi numeric(5,2),
  waist_hip_ratio numeric(4,2),
  visceral_fat_area_cm2 numeric(7,2),
  basal_metabolic_rate_kcal numeric(7,2),
  inbody_score numeric(5,2),
  note text,
  ai_summary text,
  source public.inbody_record_source not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.inbody_scan_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  inbody_record_id uuid references public.inbody_records(id) on delete set null,
  image_path text not null,
  ai_raw_response jsonb not null default '{}'::jsonb,
  confidence_score numeric(4,3) check (confidence_score is null or confidence_score between 0 and 1),
  created_at timestamptz not null default now()
);

alter table public.inbody_records enable row level security;
alter table public.inbody_scan_analyses enable row level security;

drop policy if exists "inbody_records_patient_crud" on public.inbody_records;
drop policy if exists "inbody_records_care_team_select" on public.inbody_records;
drop policy if exists "inbody_scan_analyses_patient_crud" on public.inbody_scan_analyses;
drop policy if exists "inbody_scan_analyses_care_team_select" on public.inbody_scan_analyses;

create policy "inbody_records_patient_crud"
on public.inbody_records for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "inbody_records_care_team_select"
on public.inbody_records for select
to authenticated
using (public.can_access_patient(user_id));

create policy "inbody_scan_analyses_patient_crud"
on public.inbody_scan_analyses for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "inbody_scan_analyses_care_team_select"
on public.inbody_scan_analyses for select
to authenticated
using (public.can_access_patient(user_id));

insert into storage.buckets (id, name, public)
values ('inbody-scans', 'inbody-scans', false)
on conflict (id) do nothing;

drop policy if exists "patients_upload_own_inbody_scans" on storage.objects;
drop policy if exists "patients_read_own_inbody_scans_or_care_team" on storage.objects;

create policy "patients_upload_own_inbody_scans"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'inbody-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "patients_read_own_inbody_scans_or_care_team"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inbody-scans'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_access_patient(((storage.foldername(name))[1])::uuid)
  )
);

create index if not exists inbody_records_user_measured_idx on public.inbody_records(user_id, measured_at desc);
create index if not exists inbody_scan_analyses_user_created_idx on public.inbody_scan_analyses(user_id, created_at desc);
create index if not exists inbody_scan_analyses_record_idx on public.inbody_scan_analyses(inbody_record_id);
