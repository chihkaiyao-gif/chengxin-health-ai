-- Phase 9: SaaS commercialization foundations.
-- Adds multi-clinic branding, team roles, patient invites, subscriptions, and RLS helpers.

alter type public.user_role add value if not exists 'owner';
alter type public.user_role add value if not exists 'nutritionist';
alter type public.user_role add value if not exists 'coach';
alter type public.user_role add value if not exists 'viewer';

do $$ begin
  create type public.clinic_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.clinic_member_status as enum ('active', 'invited', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.clinic_patient_status as enum ('active', 'inactive', 'discharged');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.patient_invite_status as enum ('pending', 'accepted', 'expired', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_plan_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

alter table public.clinics
  add column if not exists logo_url text,
  add column if not exists primary_color text not null default '#0f766e',
  add column if not exists email text,
  add column if not exists line_url text,
  add column if not exists website_url text,
  add column if not exists status public.clinic_status not null default 'active';

alter table public.clinics
  drop constraint if exists clinics_primary_color_check,
  add constraint clinics_primary_color_check
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.clinic_members
  drop constraint if exists clinic_members_role_check,
  add column if not exists status public.clinic_member_status not null default 'active';

update public.clinic_members
set status = case when active then 'active'::public.clinic_member_status else 'disabled'::public.clinic_member_status end
where status is null;

create table if not exists public.clinic_patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  status public.clinic_patient_status not null default 'active',
  joined_at timestamptz not null default now(),
  note text,
  unique (clinic_id, patient_id)
);

insert into public.clinic_patients (clinic_id, patient_id, status, joined_at)
select clinic_id, patient_id, 'active'::public.clinic_patient_status, created_at
from public.patient_clinic_links
where active = true
on conflict (clinic_id, patient_id) do nothing;

create table if not exists public.patient_invites (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  invite_code text not null unique,
  invited_phone text,
  invited_email text,
  status public.patient_invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint patient_invites_code_length_check check (char_length(invite_code) between 6 and 32)
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_monthly numeric(10, 2) not null default 0,
  max_patients integer,
  max_staff integer,
  features jsonb not null default '{}'::jsonb,
  status public.subscription_plan_status not null default 'active'
);

create table if not exists public.clinic_subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (clinic_id)
);

insert into public.subscription_plans (code, name, price_monthly, max_patients, max_staff, features, status)
values
  ('free', 'Free', 0, 20, 2, '{"ai_visit_reports": false, "clinic_branding": true, "basic_reminders": true}'::jsonb, 'active'),
  ('clinic_basic', 'Clinic Basic', 2990, 200, 10, '{"ai_visit_reports": true, "clinic_branding": true, "basic_reminders": true, "team_roles": true}'::jsonb, 'active'),
  ('clinic_pro', 'Clinic Pro', 8990, 1000, 40, '{"ai_visit_reports": true, "clinic_branding": true, "advanced_reminders": true, "team_roles": true, "priority_support": true}'::jsonb, 'active'),
  ('enterprise', 'Enterprise', 0, null, null, '{"custom_contract": true, "sso": true, "audit_export": true, "dedicated_support": true}'::jsonb, 'active')
on conflict (code) do update set
  name = excluded.name,
  price_monthly = excluded.price_monthly,
  max_patients = excluded.max_patients,
  max_staff = excluded.max_staff,
  features = excluded.features,
  status = excluded.status;

create or replace function public.is_active_clinic_member(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = target_clinic_id
        and cm.user_id = auth.uid()
        and coalesce(cm.active, true) = true
        and coalesce(cm.status::text, 'active') = 'active'
    )
$$;

create or replace function public.has_clinic_role(target_clinic_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = target_clinic_id
        and cm.user_id = auth.uid()
        and coalesce(cm.active, true) = true
        and coalesce(cm.status::text, 'active') = 'active'
        and cm.role::text = any(allowed_roles)
    )
$$;

create or replace function public.can_manage_clinic(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_clinic_role(target_clinic_id, array['owner'])
$$;

create or replace function public.has_patient_role(target_patient_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.clinic_patients cp
      join public.clinic_members cm on cm.clinic_id = cp.clinic_id
      where cp.patient_id = target_patient_id
        and cp.status = 'active'
        and cm.user_id = auth.uid()
        and coalesce(cm.active, true) = true
        and coalesce(cm.status::text, 'active') = 'active'
        and cm.role::text = any(allowed_roles)
    )
    or exists (
      select 1
      from public.patient_clinic_links pcl
      join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
      where pcl.patient_id = target_patient_id
        and pcl.active = true
        and cm.user_id = auth.uid()
        and coalesce(cm.active, true) = true
        and coalesce(cm.status::text, 'active') = 'active'
        and cm.role::text = any(allowed_roles)
    )
$$;

create or replace function public.can_access_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_patient_id = auth.uid()
    or public.has_patient_role(
      target_patient_id,
      array['owner', 'doctor', 'clinic_staff', 'nutritionist', 'coach', 'viewer', 'super_admin']
    )
$$;

create or replace function public.accept_patient_invite(invite_code_input text)
returns table(invite_id uuid, clinic_id uuid, patient_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.patient_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select *
  into invite_record
  from public.patient_invites
  where invite_code = upper(trim(invite_code_input))
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  update public.patient_invites
  set status = 'accepted',
      accepted_by = auth.uid()
  where id = invite_record.id;

  insert into public.clinic_patients (clinic_id, patient_id, status, joined_at)
  values (invite_record.clinic_id, auth.uid(), 'active', now())
  on conflict (clinic_id, patient_id) do update set
    status = 'active',
    joined_at = coalesce(public.clinic_patients.joined_at, excluded.joined_at);

  update public.profiles
  set default_clinic_id = coalesce(default_clinic_id, invite_record.clinic_id),
      updated_at = now()
  where id = auth.uid();

  return query select invite_record.id, invite_record.clinic_id, auth.uid();
end;
$$;

grant execute on function public.accept_patient_invite(text) to authenticated;

alter table public.clinic_patients enable row level security;
alter table public.patient_invites enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.clinic_subscriptions enable row level security;

drop policy if exists "clinics_select_members" on public.clinics;
drop policy if exists "clinics_insert_super_admin" on public.clinics;
drop policy if exists "clinics_update_owner" on public.clinics;
drop policy if exists "clinic_members_select_own_clinic" on public.clinic_members;
drop policy if exists "clinic_members_insert_owner" on public.clinic_members;
drop policy if exists "clinic_members_update_owner" on public.clinic_members;
drop policy if exists "patient_links_select_care_team" on public.patient_clinic_links;
drop policy if exists "clinic_patients_select_patient_or_care_team" on public.clinic_patients;
drop policy if exists "clinic_patients_insert_care_team" on public.clinic_patients;
drop policy if exists "clinic_patients_update_care_team" on public.clinic_patients;
drop policy if exists "patient_invites_select_care_team" on public.patient_invites;
drop policy if exists "patient_invites_insert_care_team" on public.patient_invites;
drop policy if exists "patient_invites_update_care_team" on public.patient_invites;
drop policy if exists "subscription_plans_select_active" on public.subscription_plans;
drop policy if exists "clinic_subscriptions_select_members" on public.clinic_subscriptions;
drop policy if exists "clinic_subscriptions_manage_owner" on public.clinic_subscriptions;
drop policy if exists "appointments_update_care_team" on public.appointments;
drop policy if exists "reminder_events_care_team_crud" on public.reminder_events;
drop policy if exists "notification_logs_insert_patient_or_care_team" on public.notification_logs;
drop policy if exists "visit_reports_care_team_crud" on public.ai_visit_reports;
drop policy if exists "clinic_visit_reports_care_team_crud" on public.clinic_visit_reports;

create policy "clinics_select_members"
on public.clinics for select
to authenticated
using (public.is_active_clinic_member(id));

create policy "clinics_insert_super_admin"
on public.clinics for insert
to authenticated
with check (public.is_super_admin());

create policy "clinics_update_owner"
on public.clinics for update
to authenticated
using (public.can_manage_clinic(id))
with check (public.can_manage_clinic(id));

create policy "clinic_members_select_own_clinic"
on public.clinic_members for select
to authenticated
using (user_id = auth.uid() or public.is_active_clinic_member(clinic_id));

create policy "clinic_members_insert_owner"
on public.clinic_members for insert
to authenticated
with check (public.can_manage_clinic(clinic_id));

create policy "clinic_members_update_owner"
on public.clinic_members for update
to authenticated
using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

create policy "patient_links_select_care_team"
on public.patient_clinic_links for select
to authenticated
using (patient_id = auth.uid() or public.is_active_clinic_member(clinic_id));

create policy "clinic_patients_select_patient_or_care_team"
on public.clinic_patients for select
to authenticated
using (patient_id = auth.uid() or public.is_active_clinic_member(clinic_id));

create policy "clinic_patients_insert_care_team"
on public.clinic_patients for insert
to authenticated
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "clinic_patients_update_care_team"
on public.clinic_patients for update
to authenticated
using (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "patient_invites_select_care_team"
on public.patient_invites for select
to authenticated
using (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "patient_invites_insert_care_team"
on public.patient_invites for insert
to authenticated
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "patient_invites_update_care_team"
on public.patient_invites for update
to authenticated
using (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "subscription_plans_select_active"
on public.subscription_plans for select
to authenticated
using (status = 'active' or public.is_super_admin());

create policy "clinic_subscriptions_select_members"
on public.clinic_subscriptions for select
to authenticated
using (public.is_active_clinic_member(clinic_id));

create policy "clinic_subscriptions_manage_owner"
on public.clinic_subscriptions for all
to authenticated
using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

create policy "appointments_update_care_team"
on public.appointments for update
to authenticated
using (public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff']));

create policy "reminder_events_care_team_crud"
on public.reminder_events for all
to authenticated
using (public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff']));

create policy "notification_logs_insert_patient_or_care_team"
on public.notification_logs for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff'])
);

create policy "visit_reports_care_team_crud"
on public.ai_visit_reports for all
to authenticated
using (public.has_patient_role(patient_id, array['owner', 'doctor']))
with check (public.has_patient_role(patient_id, array['owner', 'doctor']));

create policy "clinic_visit_reports_care_team_crud"
on public.clinic_visit_reports for all
to authenticated
using (public.has_patient_role(patient_id, array['owner', 'doctor']))
with check (public.has_patient_role(patient_id, array['owner', 'doctor']));

create index if not exists clinics_slug_idx on public.clinics(slug);
create index if not exists clinics_status_idx on public.clinics(status);
create index if not exists clinic_members_clinic_status_idx on public.clinic_members(clinic_id, status);
create index if not exists clinic_patients_clinic_status_idx on public.clinic_patients(clinic_id, status);
create index if not exists clinic_patients_patient_idx on public.clinic_patients(patient_id);
create index if not exists patient_invites_clinic_status_idx on public.patient_invites(clinic_id, status, expires_at desc);
create index if not exists patient_invites_code_idx on public.patient_invites(invite_code);
create index if not exists clinic_subscriptions_clinic_status_idx on public.clinic_subscriptions(clinic_id, status);
