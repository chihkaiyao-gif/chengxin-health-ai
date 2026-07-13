begin;

-- Rollback plan:
-- 1. Back up rows in gym_profiles, equipment_profiles, equipment_aliases, and any linked
--    training_logs/training_sets before rollback.
-- 2. Drop the link_training_sets_to_equipment_profile function, RLS policies, indexes,
--    triggers, and the three equipment profile tables.
-- 3. Remove training_logs.gym_profile_id and training_sets.equipment_profile_id only
--    after confirming deployed code no longer depends on them.
-- Do not run rollback against production without a reviewed backup and maintenance window.

create or replace function public.normalize_equipment_label(input_text text)
returns text
language sql
immutable
set search_path = public
as $$
  select btrim(
    regexp_replace(
      (
        replace(
          translate(
            translate(
              lower(
                normalize(coalesce(input_text, ''), NFKC)
                collate pg_catalog.unicode
              ),
              '‐‑‒–—―−﹣－',
              '---------'
            ),
            '／⁄∕',
            '///'
          ),
          chr(65279),
          ' '
        ) collate pg_catalog.unicode
      ),
      '\s+',
      ' ',
      'g'
    )
  )
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.gym_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  branch_name text,
  normalized_branch_name text,
  location_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_profiles_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint gym_profiles_normalized_name_check check (char_length(btrim(normalized_name)) between 1 and 120),
  constraint gym_profiles_branch_name_check check (branch_name is null or char_length(btrim(branch_name)) between 1 and 120),
  constraint gym_profiles_location_text_check check (location_text is null or char_length(btrim(location_text)) <= 300)
);

create table if not exists public.equipment_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  gym_profile_id uuid references public.gym_profiles(id) on delete set null,
  canonical_name text not null,
  normalized_name text not null,
  brand text,
  model text,
  default_movement_name text,
  default_laterality text check (default_laterality is null or default_laterality in ('bilateral', 'unilateral')),
  default_weight_basis text check (default_weight_basis is null or default_weight_basis in ('total', 'per_side', 'per_hand')),
  seat_setting text,
  pad_setting text,
  handle_setting text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_profiles_canonical_name_check check (char_length(btrim(canonical_name)) between 1 and 160),
  constraint equipment_profiles_normalized_name_check check (char_length(btrim(normalized_name)) between 1 and 160),
  constraint equipment_profiles_brand_check check (brand is null or char_length(btrim(brand)) <= 120),
  constraint equipment_profiles_model_check check (model is null or char_length(btrim(model)) <= 120),
  constraint equipment_profiles_default_movement_name_check check (default_movement_name is null or char_length(btrim(default_movement_name)) <= 160),
  constraint equipment_profiles_seat_setting_check check (seat_setting is null or char_length(btrim(seat_setting)) <= 100),
  constraint equipment_profiles_pad_setting_check check (pad_setting is null or char_length(btrim(pad_setting)) <= 100),
  constraint equipment_profiles_handle_setting_check check (handle_setting is null or char_length(btrim(handle_setting)) <= 100),
  constraint equipment_profiles_notes_check check (notes is null or char_length(notes) <= 1000),
  constraint equipment_profiles_id_owner_unique unique (id, owner_id)
);

create table if not exists public.equipment_aliases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  equipment_profile_id uuid not null,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  constraint equipment_aliases_alias_check check (char_length(btrim(alias)) between 1 and 160),
  constraint equipment_aliases_normalized_alias_check check (char_length(btrim(normalized_alias)) between 1 and 160),
  constraint equipment_aliases_profile_owner_fk
    foreign key (equipment_profile_id, owner_id)
    references public.equipment_profiles(id, owner_id)
    on delete cascade,
  constraint equipment_aliases_profile_normalized_unique unique (equipment_profile_id, normalized_alias)
);

alter table public.training_logs
  add column if not exists gym_profile_id uuid references public.gym_profiles(id) on delete set null;

alter table public.training_sets
  add column if not exists equipment_profile_id uuid references public.equipment_profiles(id) on delete set null;

create or replace function public.set_gym_profile_normalized_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name = btrim(new.name);
  new.normalized_name = public.normalize_equipment_label(new.name);

  if new.normalized_name = '' then
    raise exception 'GYM_NAME_REQUIRED';
  end if;

  if new.branch_name is null or btrim(new.branch_name) = '' then
    new.branch_name = null;
    new.normalized_branch_name = null;
  else
    new.branch_name = btrim(new.branch_name);
    new.normalized_branch_name = public.normalize_equipment_label(new.branch_name);
  end if;

  if new.location_text is not null then
    new.location_text = nullif(btrim(new.location_text), '');
  end if;

  return new;
end;
$$;

create or replace function public.set_equipment_profile_normalized_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.canonical_name = btrim(new.canonical_name);
  new.normalized_name = public.normalize_equipment_label(new.canonical_name);

  if new.normalized_name = '' then
    raise exception 'EQUIPMENT_NAME_REQUIRED';
  end if;

  new.brand = nullif(btrim(coalesce(new.brand, '')), '');
  new.model = nullif(btrim(coalesce(new.model, '')), '');
  new.default_movement_name = nullif(btrim(coalesce(new.default_movement_name, '')), '');
  new.seat_setting = nullif(btrim(coalesce(new.seat_setting, '')), '');
  new.pad_setting = nullif(btrim(coalesce(new.pad_setting, '')), '');
  new.handle_setting = nullif(btrim(coalesce(new.handle_setting, '')), '');
  new.notes = nullif(btrim(coalesce(new.notes, '')), '');

  return new;
end;
$$;

create or replace function public.set_equipment_alias_normalized_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.alias = btrim(new.alias);
  new.normalized_alias = public.normalize_equipment_label(new.alias);

  if new.normalized_alias = '' then
    raise exception 'EQUIPMENT_ALIAS_REQUIRED';
  end if;

  return new;
end;
$$;

drop trigger if exists set_gym_profiles_normalized_fields on public.gym_profiles;
create trigger set_gym_profiles_normalized_fields
  before insert or update of name, normalized_name, branch_name, normalized_branch_name, location_text
  on public.gym_profiles
  for each row
  execute function public.set_gym_profile_normalized_fields();

drop trigger if exists set_equipment_profiles_normalized_fields on public.equipment_profiles;
create trigger set_equipment_profiles_normalized_fields
  before insert or update of canonical_name, normalized_name, brand, model, default_movement_name, seat_setting, pad_setting, handle_setting, notes
  on public.equipment_profiles
  for each row
  execute function public.set_equipment_profile_normalized_fields();

drop trigger if exists set_equipment_aliases_normalized_fields on public.equipment_aliases;
create trigger set_equipment_aliases_normalized_fields
  before insert or update of alias, normalized_alias
  on public.equipment_aliases
  for each row
  execute function public.set_equipment_alias_normalized_fields();

drop trigger if exists set_gym_profiles_updated_at on public.gym_profiles;
create trigger set_gym_profiles_updated_at
  before update on public.gym_profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_equipment_profiles_updated_at on public.equipment_profiles;
create trigger set_equipment_profiles_updated_at
  before update on public.equipment_profiles
  for each row
  execute function public.set_updated_at();

alter table public.gym_profiles enable row level security;
alter table public.equipment_profiles enable row level security;
alter table public.equipment_aliases enable row level security;

drop policy if exists "gym_profiles_owner_crud" on public.gym_profiles;
create policy "gym_profiles_owner_crud"
on public.gym_profiles for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "equipment_profiles_owner_crud" on public.equipment_profiles;
create policy "equipment_profiles_owner_crud"
on public.equipment_profiles for all
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and (
    gym_profile_id is null
    or exists (
      select 1
      from public.gym_profiles
      where gym_profiles.id = equipment_profiles.gym_profile_id
        and gym_profiles.owner_id = auth.uid()
    )
  )
);

drop policy if exists "equipment_aliases_owner_crud" on public.equipment_aliases;
create policy "equipment_aliases_owner_crud"
on public.equipment_aliases for all
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.equipment_profiles
    where equipment_profiles.id = equipment_aliases.equipment_profile_id
      and equipment_profiles.owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.equipment_profiles
    where equipment_profiles.id = equipment_aliases.equipment_profile_id
      and equipment_profiles.owner_id = auth.uid()
  )
);

drop policy if exists "training_logs_patient_crud" on public.training_logs;
create policy "training_logs_patient_crud"
on public.training_logs for all
to authenticated
using (patient_id = auth.uid())
with check (
  patient_id = auth.uid()
  and (
    gym_profile_id is null
    or exists (
      select 1
      from public.gym_profiles
      where gym_profiles.id = training_logs.gym_profile_id
        and gym_profiles.owner_id = auth.uid()
    )
  )
);

drop policy if exists "Patients can manage own training sets" on public.training_sets;
create policy "Patients can manage own training sets"
on public.training_sets for all
to authenticated
using (
  exists (
    select 1
    from public.training_logs
    where training_logs.id = training_sets.training_log_id
      and training_logs.patient_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.training_logs
    where training_logs.id = training_sets.training_log_id
      and training_logs.patient_id = auth.uid()
  )
  and (
    equipment_profile_id is null
    or exists (
      select 1
      from public.equipment_profiles
      join public.training_logs on training_logs.id = training_sets.training_log_id
      where equipment_profiles.id = training_sets.equipment_profile_id
        and equipment_profiles.owner_id = auth.uid()
        and (
          training_logs.gym_profile_id is null
          or equipment_profiles.gym_profile_id is null
          or training_logs.gym_profile_id = equipment_profiles.gym_profile_id
        )
    )
  )
);

create index if not exists gym_profiles_owner_normalized_name_idx
  on public.gym_profiles(owner_id, normalized_name);

create index if not exists equipment_profiles_owner_gym_idx
  on public.equipment_profiles(owner_id, gym_profile_id);

create index if not exists equipment_profiles_owner_normalized_name_idx
  on public.equipment_profiles(owner_id, normalized_name);

create index if not exists equipment_aliases_owner_normalized_alias_idx
  on public.equipment_aliases(owner_id, normalized_alias);

create index if not exists equipment_aliases_profile_normalized_idx
  on public.equipment_aliases(equipment_profile_id, normalized_alias);

create index if not exists training_logs_gym_profile_idx
  on public.training_logs(gym_profile_id);

create index if not exists training_sets_equipment_profile_idx
  on public.training_sets(equipment_profile_id);

create or replace function public.link_training_sets_to_equipment_profile(
  target_equipment_profile_id uuid,
  target_training_set_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_profile public.equipment_profiles%rowtype;
  raw_count integer;
  distinct_count integer;
  owned_count integer;
  updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  raw_count := coalesce(cardinality(target_training_set_ids), 0);

  if raw_count < 1 or raw_count > 100 then
    raise exception 'INVALID_TRAINING_SET_COUNT';
  end if;

  select count(distinct selected_ids.id)
  into distinct_count
  from unnest(target_training_set_ids) as selected_ids(id);

  if distinct_count <> raw_count then
    raise exception 'DUPLICATE_TRAINING_SET_IDS';
  end if;

  select *
  into target_profile
  from public.equipment_profiles
  where id = target_equipment_profile_id
    and owner_id = auth.uid();

  if not found then
    raise exception 'EQUIPMENT_PROFILE_NOT_FOUND';
  end if;

  with selected_ids as (
    select unnest(target_training_set_ids) as id
  )
  select count(*)
  into owned_count
  from selected_ids
  join public.training_sets on training_sets.id = selected_ids.id
  join public.training_logs on training_logs.id = training_sets.training_log_id
  where training_logs.patient_id = auth.uid();

  if owned_count <> raw_count then
    raise exception 'TRAINING_SET_NOT_FOUND';
  end if;

  if exists (
    with selected_ids as (
      select unnest(target_training_set_ids) as id
    )
    select 1
    from selected_ids
    join public.training_sets on training_sets.id = selected_ids.id
    join public.training_logs on training_logs.id = training_sets.training_log_id
    where training_logs.gym_profile_id is not null
      and target_profile.gym_profile_id is not null
      and training_logs.gym_profile_id <> target_profile.gym_profile_id
  ) then
    raise exception 'GYM_PROFILE_CONFLICT';
  end if;

  with selected_ids as (
    select unnest(target_training_set_ids) as id
  )
  update public.training_sets
  set equipment_profile_id = target_profile.id,
      updated_at = now()
  where training_sets.id in (select id from selected_ids);

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.link_training_sets_to_equipment_profile(uuid, uuid[]) from public;
revoke all on function public.link_training_sets_to_equipment_profile(uuid, uuid[]) from anon;
grant execute on function public.link_training_sets_to_equipment_profile(uuid, uuid[]) to authenticated;

commit;
