import type { z } from "zod";

import { normalizeEquipmentLabel, nullableNormalizedEquipmentLabel } from "@/lib/normalization";
import type {
  EquipmentAlias,
  EquipmentLegacyCandidate,
  EquipmentProfile,
  EquipmentResolveResult,
  GymProfile,
  TrainingLog,
  TrainingSet,
} from "@/lib/types";
import type {
  equipmentAliasInputSchema,
  equipmentLegacyCandidatesQuerySchema,
  equipmentProfileInputSchema,
  equipmentProfileQuerySchema,
  equipmentResolveQuerySchema,
  gymProfileInputSchema,
  gymProfileQuerySchema,
  linkTrainingSetsToEquipmentSchema,
  updateEquipmentProfileSchema,
  updateGymProfileSchema,
} from "@/lib/validation";

export type GymProfileInput = z.infer<typeof gymProfileInputSchema>;
export type UpdateGymProfileInput = z.infer<typeof updateGymProfileSchema>;
export type GymProfileQuery = z.infer<typeof gymProfileQuerySchema>;
export type EquipmentProfileInput = z.infer<typeof equipmentProfileInputSchema>;
export type UpdateEquipmentProfileInput = z.infer<typeof updateEquipmentProfileSchema>;
export type EquipmentProfileQuery = z.infer<typeof equipmentProfileQuerySchema>;
export type EquipmentAliasInput = z.infer<typeof equipmentAliasInputSchema>;
export type EquipmentResolveQuery = z.infer<typeof equipmentResolveQuerySchema>;
export type EquipmentLegacyCandidatesQuery = z.infer<typeof equipmentLegacyCandidatesQuerySchema>;
export type LinkTrainingSetsToEquipmentInput = z.infer<typeof linkTrainingSetsToEquipmentSchema>;

export type GymProfileRow = {
  id: string;
  owner_id: string;
  name: string;
  normalized_name: string;
  branch_name: string | null;
  normalized_branch_name: string | null;
  location_text: string | null;
  created_at: string;
  updated_at: string;
};

export type EquipmentProfileRow = {
  id: string;
  owner_id: string;
  gym_profile_id: string | null;
  canonical_name: string;
  normalized_name: string;
  brand: string | null;
  model: string | null;
  default_movement_name: string | null;
  default_laterality: EquipmentProfile["defaultLaterality"];
  default_weight_basis: EquipmentProfile["defaultWeightBasis"];
  seat_setting: string | null;
  pad_setting: string | null;
  handle_setting: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  equipment_aliases?: EquipmentAliasRow[] | null;
  gym_profiles?: GymProfileRow | null;
};

export type EquipmentAliasRow = {
  id: string;
  owner_id: string;
  equipment_profile_id: string;
  alias: string;
  normalized_alias: string;
  created_at: string;
  equipment_profiles?: EquipmentProfileRow | null;
};

type TrainingLogRowForCandidate = {
  id: string;
  patient_id: string;
  trained_on: string;
  started_at: string | null;
  ended_at: string | null;
  gym_profile_id: string | null;
  gym_name: string | null;
  activity_type: string;
  duration_minutes: number;
  intensity: TrainingLog["intensity"];
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

type TrainingSetRowForCandidate = {
  id: string;
  training_log_id: string;
  equipment_profile_id: string | null;
  exercise_order: number;
  set_number: number;
  movement_name: string;
  equipment_name: string | null;
  equipment_brand: string | null;
  equipment_model: string | null;
  laterality: TrainingSet["laterality"];
  side: TrainingSet["side"];
  weight_kg: number | string | null;
  weight_basis: TrainingSet["weightBasis"];
  reps: number | null;
  set_type: TrainingSet["setType"];
  to_failure: boolean;
  rpe: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  training_logs?: TrainingLogRowForCandidate | null;
};

type StoreResult<T> = Promise<{ data: T | null; error: unknown }>;

type SupabaseQueryResult<T = unknown> = {
  data: T | null;
  error: unknown;
};

type SupabaseQuery = PromiseLike<SupabaseQueryResult> & {
  delete: () => SupabaseQuery;
  eq: (column: string, value: unknown) => SupabaseQuery;
  insert: (row: unknown) => SupabaseQuery;
  is: (column: string, value: unknown) => SupabaseQuery;
  limit: (count: number) => SupabaseQuery;
  maybeSingle: () => Promise<SupabaseQueryResult>;
  order: (column: string, options?: Record<string, unknown>) => SupabaseQuery;
  select: (columns?: string) => SupabaseQuery;
  single: () => Promise<SupabaseQueryResult>;
  update: (row: unknown) => SupabaseQuery;
};

export type SupabaseEquipmentClient = {
  from: (table: string) => SupabaseQuery;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<SupabaseQueryResult>;
};

export type EquipmentStore = {
  listGyms(ownerId: string, query: GymProfileQuery): StoreResult<GymProfileRow[]>;
  createGym(row: Omit<GymProfileRow, "id" | "created_at" | "updated_at">): StoreResult<GymProfileRow>;
  findGymForOwner(id: string, ownerId: string): StoreResult<GymProfileRow>;
  updateGym(
    id: string,
    ownerId: string,
    row: Partial<Omit<GymProfileRow, "id" | "owner_id" | "created_at">>,
  ): StoreResult<GymProfileRow>;
  deleteGym(id: string, ownerId: string): StoreResult<{ id: string }>;
  listEquipment(
    ownerId: string,
    query: EquipmentProfileQuery,
  ): StoreResult<EquipmentProfileRow[]>;
  createEquipment(
    row: Omit<EquipmentProfileRow, "id" | "created_at" | "updated_at" | "equipment_aliases" | "gym_profiles">,
  ): StoreResult<EquipmentProfileRow>;
  findEquipmentForOwner(id: string, ownerId: string): StoreResult<EquipmentProfileRow>;
  updateEquipment(
    id: string,
    ownerId: string,
    row: Partial<Omit<EquipmentProfileRow, "id" | "owner_id" | "created_at" | "equipment_aliases" | "gym_profiles">>,
  ): StoreResult<EquipmentProfileRow>;
  deleteEquipment(id: string, ownerId: string): StoreResult<{ id: string }>;
  createAlias(
    row: Omit<EquipmentAliasRow, "id" | "created_at" | "equipment_profiles">,
  ): StoreResult<EquipmentAliasRow>;
  deleteAlias(id: string, ownerId: string): StoreResult<{ id: string }>;
  resolveAlias(
    ownerId: string,
    normalizedAlias: string,
    gymProfileId: string | null,
  ): StoreResult<EquipmentAliasRow[]>;
  listLegacyCandidates(
    ownerId: string,
    limit: number,
  ): StoreResult<TrainingSetRowForCandidate[]>;
  linkTrainingSetsToEquipmentProfile(
    equipmentProfileId: string,
    trainingSetIds: string[],
  ): StoreResult<number>;
};

const gymSelect = [
  "id",
  "owner_id",
  "name",
  "normalized_name",
  "branch_name",
  "normalized_branch_name",
  "location_text",
  "created_at",
  "updated_at",
].join(",");

const aliasSelect = [
  "id",
  "owner_id",
  "equipment_profile_id",
  "alias",
  "normalized_alias",
  "created_at",
].join(",");

const equipmentSelect = [
  "id",
  "owner_id",
  "gym_profile_id",
  "canonical_name",
  "normalized_name",
  "brand",
  "model",
  "default_movement_name",
  "default_laterality",
  "default_weight_basis",
  "seat_setting",
  "pad_setting",
  "handle_setting",
  "notes",
  "created_at",
  "updated_at",
].join(",");

const trainingSetCandidateSelect = [
  "id",
  "training_log_id",
  "equipment_profile_id",
  "exercise_order",
  "set_number",
  "movement_name",
  "equipment_name",
  "equipment_brand",
  "equipment_model",
  "laterality",
  "side",
  "weight_kg",
  "weight_basis",
  "reps",
  "set_type",
  "to_failure",
  "rpe",
  "notes",
  "created_at",
  "updated_at",
  `training_logs!inner(id,patient_id,trained_on,started_at,ended_at,gym_profile_id,gym_name,activity_type,duration_minutes,intensity,notes,created_at,updated_at)`,
].join(",");

function normalizedRowFields(value: string) {
  return {
    normalized_name: normalizeEquipmentLabel(value),
  };
}

export function mapGymProfileRow(row: GymProfileRow): GymProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    normalizedName: row.normalized_name,
    branchName: row.branch_name,
    normalizedBranchName: row.normalized_branch_name,
    locationText: row.location_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEquipmentAliasRow(row: EquipmentAliasRow): EquipmentAlias {
  return {
    id: row.id,
    ownerId: row.owner_id,
    equipmentProfileId: row.equipment_profile_id,
    alias: row.alias,
    normalizedAlias: row.normalized_alias,
    createdAt: row.created_at,
  };
}

export function mapEquipmentProfileRow(row: EquipmentProfileRow): EquipmentProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    gymProfileId: row.gym_profile_id,
    canonicalName: row.canonical_name,
    normalizedName: row.normalized_name,
    brand: row.brand,
    model: row.model,
    defaultMovementName: row.default_movement_name,
    defaultLaterality: row.default_laterality,
    defaultWeightBasis: row.default_weight_basis,
    seatSetting: row.seat_setting,
    padSetting: row.pad_setting,
    handleSetting: row.handle_setting,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    aliases: row.equipment_aliases?.map(mapEquipmentAliasRow),
    gym: row.gym_profiles ? mapGymProfileRow(row.gym_profiles) : null,
  };
}

function mapCandidateSet(row: TrainingSetRowForCandidate): TrainingSet {
  return {
    id: row.id,
    trainingLogId: row.training_log_id,
    equipmentProfileId: row.equipment_profile_id,
    exerciseOrder: row.exercise_order,
    setNumber: row.set_number,
    movementName: row.movement_name,
    equipmentName: row.equipment_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    laterality: row.laterality,
    side: row.side,
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    weightBasis: row.weight_basis,
    reps: row.reps,
    setType: row.set_type,
    toFailure: row.to_failure,
    rpe: row.rpe == null ? null : Number(row.rpe),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCandidateLog(row: TrainingLogRowForCandidate): TrainingLog {
  return {
    id: row.id,
    userId: row.patient_id,
    trainedOn: row.trained_on,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    gymProfileId: row.gym_profile_id,
    gymName: row.gym_name,
    activityType: row.activity_type,
    durationMinutes: row.duration_minutes,
    intensity: row.intensity,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLegacyCandidateRow(row: TrainingSetRowForCandidate): EquipmentLegacyCandidate | null {
  if (!row.training_logs) return null;
  return {
    trainingSet: mapCandidateSet(row),
    trainingLog: mapCandidateLog(row.training_logs),
  };
}

export function buildGymProfileInsert(
  input: GymProfileInput,
  ownerId: string,
): Omit<GymProfileRow, "id" | "created_at" | "updated_at"> {
  return {
    owner_id: ownerId,
    name: input.name,
    normalized_name: normalizeEquipmentLabel(input.name),
    branch_name: input.branchName ?? null,
    normalized_branch_name: nullableNormalizedEquipmentLabel(input.branchName),
    location_text: input.locationText ?? null,
  };
}

export function buildGymProfileUpdate(
  input: UpdateGymProfileInput,
): Partial<Omit<GymProfileRow, "id" | "owner_id" | "created_at">> {
  const row: Partial<Omit<GymProfileRow, "id" | "owner_id" | "created_at">> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    row.name = input.name;
    row.normalized_name = normalizeEquipmentLabel(input.name);
  }

  if (input.branchName !== undefined) {
    row.branch_name = input.branchName ?? null;
    row.normalized_branch_name = nullableNormalizedEquipmentLabel(input.branchName);
  }

  if (input.locationText !== undefined) row.location_text = input.locationText ?? null;
  return row;
}

export function buildEquipmentProfileInsert(
  input: EquipmentProfileInput,
  ownerId: string,
): Omit<EquipmentProfileRow, "id" | "created_at" | "updated_at" | "equipment_aliases" | "gym_profiles"> {
  return {
    owner_id: ownerId,
    gym_profile_id: input.gymProfileId ?? null,
    canonical_name: input.canonicalName,
    ...normalizedRowFields(input.canonicalName),
    brand: input.brand ?? null,
    model: input.model ?? null,
    default_movement_name: input.defaultMovementName ?? null,
    default_laterality: input.defaultLaterality ?? null,
    default_weight_basis: input.defaultWeightBasis ?? null,
    seat_setting: input.seatSetting ?? null,
    pad_setting: input.padSetting ?? null,
    handle_setting: input.handleSetting ?? null,
    notes: input.notes ?? null,
  };
}

export function buildEquipmentProfileUpdate(
  input: UpdateEquipmentProfileInput,
): Partial<Omit<EquipmentProfileRow, "id" | "owner_id" | "created_at" | "equipment_aliases" | "gym_profiles">> {
  const row: Partial<Omit<EquipmentProfileRow, "id" | "owner_id" | "created_at" | "equipment_aliases" | "gym_profiles">> = {
    updated_at: new Date().toISOString(),
  };

  if (input.gymProfileId !== undefined) row.gym_profile_id = input.gymProfileId ?? null;
  if (input.canonicalName !== undefined) {
    row.canonical_name = input.canonicalName;
    row.normalized_name = normalizeEquipmentLabel(input.canonicalName);
  }
  if (input.brand !== undefined) row.brand = input.brand ?? null;
  if (input.model !== undefined) row.model = input.model ?? null;
  if (input.defaultMovementName !== undefined) row.default_movement_name = input.defaultMovementName ?? null;
  if (input.defaultLaterality !== undefined) row.default_laterality = input.defaultLaterality ?? null;
  if (input.defaultWeightBasis !== undefined) row.default_weight_basis = input.defaultWeightBasis ?? null;
  if (input.seatSetting !== undefined) row.seat_setting = input.seatSetting ?? null;
  if (input.padSetting !== undefined) row.pad_setting = input.padSetting ?? null;
  if (input.handleSetting !== undefined) row.handle_setting = input.handleSetting ?? null;
  if (input.notes !== undefined) row.notes = input.notes ?? null;
  return row;
}

export function formatGymSnapshot(gym: Pick<GymProfile, "name" | "branchName"> | GymProfileRow) {
  const name = "branch_name" in gym ? gym.name : gym.name;
  const branchName = "branch_name" in gym ? gym.branch_name : gym.branchName;
  return branchName ? `${name} - ${branchName}` : name;
}

export function equipmentSnapshotFromProfile(profile: EquipmentProfile | EquipmentProfileRow) {
  if ("canonical_name" in profile) {
    return {
      equipmentBrand: profile.brand,
      equipmentName: profile.canonical_name,
      equipmentModel: profile.model,
    };
  }

  return {
    equipmentBrand: profile.brand,
    equipmentName: profile.canonicalName,
    equipmentModel: profile.model,
  };
}

function profileMatchesLegacySet(profile: EquipmentProfile, candidate: EquipmentLegacyCandidate) {
  const set = candidate.trainingSet;
  const log = candidate.trainingLog;

  if (profile.gymProfileId && log.gymProfileId && profile.gymProfileId !== log.gymProfileId) {
    return false;
  }

  const setName = nullableNormalizedEquipmentLabel(set.equipmentName);
  const setBrand = nullableNormalizedEquipmentLabel(set.equipmentBrand);
  const setModel = nullableNormalizedEquipmentLabel(set.equipmentModel);
  const profileBrand = nullableNormalizedEquipmentLabel(profile.brand);
  const profileModel = nullableNormalizedEquipmentLabel(profile.model);

  const nameMatches = setName === profile.normalizedName;
  const brandMatches = !profileBrand || setBrand === profileBrand;
  const modelMatches = !profileModel || setModel === profileModel;

  return Boolean(nameMatches || (profileBrand && brandMatches && modelMatches));
}

export function filterLegacyCandidatesForProfile(
  profile: EquipmentProfile,
  candidates: EquipmentLegacyCandidate[],
) {
  return candidates.filter((candidate) => profileMatchesLegacySet(profile, candidate));
}

export function createSupabaseEquipmentStore(
  supabase: SupabaseEquipmentClient,
): EquipmentStore {
  return {
    async listGyms(ownerId, query) {
      const { data, error } = await supabase
        .from("gym_profiles")
        .select(gymSelect)
        .eq("owner_id", ownerId)
        .order("normalized_name", { ascending: true })
        .limit(query.limit);
      return { data: data as GymProfileRow[] | null, error };
    },
    async createGym(row) {
      const { data, error } = await supabase
        .from("gym_profiles")
        .insert(row)
        .select(gymSelect)
        .single();
      return { data: data as GymProfileRow | null, error };
    },
    async findGymForOwner(id, ownerId) {
      const { data, error } = await supabase
        .from("gym_profiles")
        .select(gymSelect)
        .eq("id", id)
        .eq("owner_id", ownerId)
        .maybeSingle();
      return { data: data as GymProfileRow | null, error };
    },
    async updateGym(id, ownerId, row) {
      const { data, error } = await supabase
        .from("gym_profiles")
        .update(row)
        .eq("id", id)
        .eq("owner_id", ownerId)
        .select(gymSelect)
        .maybeSingle();
      return { data: data as GymProfileRow | null, error };
    },
    async deleteGym(id, ownerId) {
      const { data, error } = await supabase
        .from("gym_profiles")
        .delete()
        .eq("id", id)
        .eq("owner_id", ownerId)
        .select("id")
        .maybeSingle();
      return { data: data as { id: string } | null, error };
    },
    async listEquipment(ownerId, query) {
      const select = query.includeAliases
        ? `${equipmentSelect},equipment_aliases(${aliasSelect}),gym_profiles(${gymSelect})`
        : `${equipmentSelect},gym_profiles(${gymSelect})`;
      let builder = supabase
        .from("equipment_profiles")
        .select(select)
        .eq("owner_id", ownerId)
        .order("normalized_name", { ascending: true })
        .limit(query.limit);

      builder = query.gymProfileId
        ? builder.eq("gym_profile_id", query.gymProfileId)
        : builder;

      const { data, error } = await builder;
      return { data: data as EquipmentProfileRow[] | null, error };
    },
    async createEquipment(row) {
      const { data, error } = await supabase
        .from("equipment_profiles")
        .insert(row)
        .select(equipmentSelect)
        .single();
      return { data: data as EquipmentProfileRow | null, error };
    },
    async findEquipmentForOwner(id, ownerId) {
      const { data, error } = await supabase
        .from("equipment_profiles")
        .select(equipmentSelect)
        .eq("id", id)
        .eq("owner_id", ownerId)
        .maybeSingle();
      return { data: data as EquipmentProfileRow | null, error };
    },
    async updateEquipment(id, ownerId, row) {
      const { data, error } = await supabase
        .from("equipment_profiles")
        .update(row)
        .eq("id", id)
        .eq("owner_id", ownerId)
        .select(equipmentSelect)
        .maybeSingle();
      return { data: data as EquipmentProfileRow | null, error };
    },
    async deleteEquipment(id, ownerId) {
      const { data, error } = await supabase
        .from("equipment_profiles")
        .delete()
        .eq("id", id)
        .eq("owner_id", ownerId)
        .select("id")
        .maybeSingle();
      return { data: data as { id: string } | null, error };
    },
    async createAlias(row) {
      const { data, error } = await supabase
        .from("equipment_aliases")
        .insert(row)
        .select(aliasSelect)
        .single();
      return { data: data as EquipmentAliasRow | null, error };
    },
    async deleteAlias(id, ownerId) {
      const { data, error } = await supabase
        .from("equipment_aliases")
        .delete()
        .eq("id", id)
        .eq("owner_id", ownerId)
        .select("id")
        .maybeSingle();
      return { data: data as { id: string } | null, error };
    },
    async resolveAlias(ownerId, normalizedAlias, gymProfileId) {
      let builder = supabase
        .from("equipment_aliases")
        .select(
          `${aliasSelect},equipment_profiles!inner(${equipmentSelect},gym_profiles(${gymSelect}))`,
        )
        .eq("owner_id", ownerId)
        .eq("normalized_alias", normalizedAlias)
        .limit(20);

      builder = gymProfileId
        ? builder.eq("equipment_profiles.gym_profile_id", gymProfileId)
        : builder;

      const { data, error } = await builder;
      return { data: data as EquipmentAliasRow[] | null, error };
    },
    async listLegacyCandidates(ownerId, limit) {
      const { data, error } = await supabase
        .from("training_sets")
        .select(trainingSetCandidateSelect)
        .is("equipment_profile_id", null)
        .eq("training_logs.patient_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return { data: data as TrainingSetRowForCandidate[] | null, error };
    },
    async linkTrainingSetsToEquipmentProfile(equipmentProfileId, trainingSetIds) {
      const { data, error } = await supabase.rpc(
        "link_training_sets_to_equipment_profile",
        {
          target_equipment_profile_id: equipmentProfileId,
          target_training_set_ids: trainingSetIds,
        },
      );
      return { data: data as number | null, error };
    },
  };
}

export function buildResolveResult(rows: EquipmentAliasRow[] | null): EquipmentResolveResult {
  const candidates = (rows ?? [])
    .map((row) => row.equipment_profiles)
    .filter((row): row is EquipmentProfileRow => Boolean(row))
    .map(mapEquipmentProfileRow);

  if (candidates.length === 1) {
    return { match: candidates[0], candidates, ambiguous: false };
  }

  return {
    match: null,
    candidates,
    ambiguous: candidates.length > 1,
  };
}

export function buildAliasInsert(
  input: EquipmentAliasInput,
  ownerId: string,
  equipmentProfileId: string,
): Omit<EquipmentAliasRow, "id" | "created_at" | "equipment_profiles"> {
  return {
    owner_id: ownerId,
    equipment_profile_id: equipmentProfileId,
    alias: input.alias,
    normalized_alias: normalizeEquipmentLabel(input.alias),
  };
}
