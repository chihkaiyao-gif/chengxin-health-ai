-- Phase 17: pilot cohort setup, 14-day tracking, and pilot reporting.

do $$ begin
  create type public.pilot_cohort_status as enum ('planned', 'active', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pilot_cohort_member_status as enum ('active', 'dropped', 'completed');
exception when duplicate_object then null; end $$;

create table if not exists public.pilot_cohorts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  status public.pilot_cohort_status not null default 'planned',
  goal text,
  created_at timestamptz not null default now(),
  constraint pilot_cohorts_name_length_check check (char_length(name) between 2 and 160),
  constraint pilot_cohorts_date_order_check check (end_date >= start_date)
);

create table if not exists public.pilot_cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.pilot_cohorts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  status public.pilot_cohort_member_status not null default 'active',
  note text,
  unique (cohort_id, user_id)
);

alter table public.pilot_cohorts enable row level security;
alter table public.pilot_cohort_members enable row level security;

drop policy if exists "pilot_cohorts_select_members" on public.pilot_cohorts;
drop policy if exists "pilot_cohorts_manage_care_team" on public.pilot_cohorts;
drop policy if exists "pilot_members_select_own_or_care_team" on public.pilot_cohort_members;
drop policy if exists "pilot_members_manage_care_team" on public.pilot_cohort_members;

create policy "pilot_cohorts_select_members"
on public.pilot_cohorts for select
to authenticated
using (
  public.is_active_clinic_member(clinic_id)
  or exists (
    select 1
    from public.pilot_cohort_members pcm
    where pcm.cohort_id = pilot_cohorts.id
      and pcm.user_id = auth.uid()
  )
);

create policy "pilot_cohorts_manage_care_team"
on public.pilot_cohorts for all
to authenticated
using (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "pilot_members_select_own_or_care_team"
on public.pilot_cohort_members for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.pilot_cohorts pc
    where pc.id = pilot_cohort_members.cohort_id
      and public.is_active_clinic_member(pc.clinic_id)
  )
);

create policy "pilot_members_manage_care_team"
on public.pilot_cohort_members for all
to authenticated
using (
  exists (
    select 1
    from public.pilot_cohorts pc
    where pc.id = pilot_cohort_members.cohort_id
      and public.has_clinic_role(pc.clinic_id, array['owner', 'doctor', 'clinic_staff'])
  )
)
with check (
  exists (
    select 1
    from public.pilot_cohorts pc
    where pc.id = pilot_cohort_members.cohort_id
      and public.has_clinic_role(pc.clinic_id, array['owner', 'doctor', 'clinic_staff'])
      and public.can_access_patient(pilot_cohort_members.user_id)
  )
);

create index if not exists pilot_cohorts_clinic_status_idx on public.pilot_cohorts(clinic_id, status, start_date desc);
create index if not exists pilot_members_cohort_status_idx on public.pilot_cohort_members(cohort_id, status);
create index if not exists pilot_members_user_status_idx on public.pilot_cohort_members(user_id, status);
