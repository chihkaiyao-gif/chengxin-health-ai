-- Phase 7: appointments, reminder events, and notification skeleton logs.

do $$ begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'canceled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_severity as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_status as enum ('open', 'dismissed', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('line', 'email', 'sms', 'in_app');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  reason text not null,
  preferred_date date not null,
  preferred_time_slot text not null check (preferred_time_slot in ('morning', 'afternoon', 'evening', 'flexible')),
  status public.appointment_status not null default 'pending',
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  reminder_type text not null,
  severity public.reminder_severity not null default 'low',
  title text not null,
  message text not null,
  status public.reminder_status not null default 'open',
  source text not null default 'system',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  channel public.notification_channel not null,
  title text not null,
  message text not null,
  status public.notification_status not null default 'pending',
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;
alter table public.reminder_events enable row level security;
alter table public.notification_logs enable row level security;

drop policy if exists "appointments_select_patient_or_care_team" on public.appointments;
drop policy if exists "appointments_insert_patient" on public.appointments;
drop policy if exists "appointments_update_care_team" on public.appointments;
drop policy if exists "reminder_events_select_patient_or_care_team" on public.reminder_events;
drop policy if exists "reminder_events_patient_update_status" on public.reminder_events;
drop policy if exists "reminder_events_care_team_crud" on public.reminder_events;
drop policy if exists "notification_logs_select_patient_or_care_team" on public.notification_logs;
drop policy if exists "notification_logs_insert_patient_or_care_team" on public.notification_logs;

create policy "appointments_select_patient_or_care_team"
on public.appointments for select
to authenticated
using (user_id = auth.uid() or public.can_access_patient(user_id));

create policy "appointments_insert_patient"
on public.appointments for insert
to authenticated
with check (user_id = auth.uid());

create policy "appointments_update_care_team"
on public.appointments for update
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = appointments.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = appointments.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
);

create policy "reminder_events_select_patient_or_care_team"
on public.reminder_events for select
to authenticated
using (user_id = auth.uid() or public.can_access_patient(user_id));

create policy "reminder_events_patient_update_status"
on public.reminder_events for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "reminder_events_care_team_crud"
on public.reminder_events for all
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = reminder_events.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = reminder_events.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
);

create policy "notification_logs_select_patient_or_care_team"
on public.notification_logs for select
to authenticated
using (user_id = auth.uid() or public.can_access_patient(user_id));

create policy "notification_logs_insert_patient_or_care_team"
on public.notification_logs for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = notification_logs.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
);

create index if not exists appointments_user_date_idx on public.appointments(user_id, preferred_date desc);
create index if not exists appointments_clinic_status_date_idx on public.appointments(clinic_id, status, preferred_date asc);
create index if not exists reminder_events_user_status_created_idx on public.reminder_events(user_id, status, created_at desc);
create index if not exists reminder_events_clinic_status_created_idx on public.reminder_events(clinic_id, status, created_at desc);
create index if not exists notification_logs_user_created_idx on public.notification_logs(user_id, created_at desc);
create index if not exists notification_logs_clinic_created_idx on public.notification_logs(clinic_id, created_at desc);
