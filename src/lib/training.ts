import type { z } from "zod";

import type {
  TrainingEquipmentSignature,
  TrainingLog,
  TrainingSet,
  TrainingSetSide,
} from "@/lib/types";
import {
  equipmentSnapshotFromProfile,
  formatGymSnapshot,
  type EquipmentProfileRow,
  type GymProfileRow,
} from "@/lib/equipment-profiles";
import type {
  createTrainingSessionSchema,
  createTrainingSetSchema,
  trainingSessionQuerySchema,
  updateTrainingSessionSchema,
  updateTrainingSetSchema,
} from "@/lib/validation";

export type CreateTrainingSessionInput = z.infer<
  typeof createTrainingSessionSchema
>;
export type UpdateTrainingSessionInput = z.infer<
  typeof updateTrainingSessionSchema
>;
export type TrainingSessionQueryInput = z.infer<
  typeof trainingSessionQuerySchema
>;
export type CreateTrainingSetInput = z.infer<typeof createTrainingSetSchema>;
export type UpdateTrainingSetInput = z.infer<typeof updateTrainingSetSchema>;

export type TrainingLogRow = {
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

export type TrainingSetRow = {
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
  side: TrainingSetSide | null;
  weight_kg: number | string | null;
  weight_basis: TrainingSet["weightBasis"];
  reps: number | null;
  set_type: TrainingSet["setType"];
  to_failure: boolean;
  rpe: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainingLogWithSetRows = TrainingLogRow & {
  training_sets?: TrainingSetRow[] | null;
};

type StoreResult<T> = Promise<{ data: T | null; error: unknown }>;

type SupabaseQueryResult<T = unknown> = {
  data: T | null;
  error: unknown;
};

type SupabaseQuery = PromiseLike<SupabaseQueryResult> & {
  delete: () => SupabaseQuery;
  eq: (column: string, value: unknown) => SupabaseQuery;
  gte: (column: string, value: unknown) => SupabaseQuery;
  in: (column: string, values: readonly string[]) => SupabaseQuery;
  insert: (row: unknown) => SupabaseQuery;
  is: (column: string, value: unknown) => SupabaseQuery;
  limit: (count: number) => SupabaseQuery;
  lte: (column: string, value: unknown) => SupabaseQuery;
  maybeSingle: () => Promise<SupabaseQueryResult>;
  order: (column: string, options?: Record<string, unknown>) => SupabaseQuery;
  select: (columns?: string) => SupabaseQuery;
  single: () => Promise<SupabaseQueryResult>;
  update: (row: unknown) => SupabaseQuery;
};

export type SupabaseTrainingClient = {
  from: (table: string) => SupabaseQuery;
};

export type TrainingStore = {
  createSession(row: Omit<TrainingLogRow, "id" | "created_at" | "updated_at">): StoreResult<TrainingLogRow>;
  listSessions(
    patientId: string,
    query: TrainingSessionQueryInput,
  ): StoreResult<TrainingLogRow[]>;
  updateSession(
    id: string,
    patientId: string,
    row: Partial<Omit<TrainingLogRow, "id" | "patient_id" | "created_at">>,
  ): StoreResult<TrainingLogRow>;
  deleteSession(id: string, patientId: string): StoreResult<{ id: string }>;
  findSessionForOwner(id: string, patientId: string): StoreResult<TrainingLogRow>;
  findGymProfileForOwner(id: string, patientId: string): StoreResult<GymProfileRow>;
  findEquipmentProfileForOwner(id: string, patientId: string): StoreResult<EquipmentProfileRow>;
  createSets(
    rows: Array<Omit<TrainingSetRow, "id" | "created_at" | "updated_at">>,
  ): StoreResult<TrainingSetRow[]>;
  listSets(trainingLogId: string): StoreResult<TrainingSetRow[]>;
  listSetsForSessions(trainingLogIds: string[]): StoreResult<TrainingSetRow[]>;
  findLastPerformanceSessions(
    patientId: string,
    signature: TrainingEquipmentSignature,
    limit: number,
  ): StoreResult<TrainingLogWithSetRows[]>;
  findSetForOwner(setId: string, patientId: string): StoreResult<TrainingSetRow>;
  updateSet(
    setId: string,
    row: Partial<Omit<TrainingSetRow, "id" | "training_log_id" | "created_at">>,
  ): StoreResult<TrainingSetRow>;
  deleteSet(setId: string): StoreResult<{ id: string }>;
};

export class TrainingStorageError extends Error {
  constructor(message = "訓練資料儲存失敗") {
    super(message);
    this.name = "TrainingStorageError";
  }
}

export class TrainingValidationError extends Error {
  constructor(message = "訓練資料格式不正確。") {
    super(message);
    this.name = "TrainingValidationError";
  }
}

export class TrainingNotFoundError extends Error {
  constructor(message = "找不到訓練紀錄") {
    super(message);
    this.name = "TrainingNotFoundError";
  }
}

const sessionSelect = [
  "id",
  "patient_id",
  "trained_on",
  "started_at",
  "ended_at",
  "gym_profile_id",
  "gym_name",
  "activity_type",
  "duration_minutes",
  "intensity",
  "notes",
  "created_at",
  "updated_at",
].join(",");

const setSelect = [
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
].join(",");

function dateOnlyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function deriveTrainingDate(startedAt: string | undefined, now = new Date()) {
  if (startedAt && /^\d{4}-\d{2}-\d{2}/.test(startedAt)) {
    return startedAt.slice(0, 10);
  }

  return dateOnlyFromDate(now);
}

export function mapTrainingLogRow(
  row: TrainingLogRow,
  sets?: TrainingSet[],
): TrainingLog {
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
    sets,
  };
}

export function mapTrainingSetRow(row: TrainingSetRow): TrainingSet {
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

function calculateDurationMinutes(input: {
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
}) {
  if (input.durationMinutes) {
    return input.durationMinutes;
  }

  if (input.startedAt && input.endedAt) {
    const startedAt = Date.parse(input.startedAt);
    const endedAt = Date.parse(input.endedAt);

    if (Number.isFinite(startedAt) && Number.isFinite(endedAt)) {
      return Math.min(600, Math.max(1, Math.round((endedAt - startedAt) / 60000)));
    }
  }

  return 1;
}

export function buildTrainingSessionInsert(
  input: CreateTrainingSessionInput,
  patientId: string,
  now = new Date(),
  gymProfile?: GymProfileRow | null,
): Omit<TrainingLogRow, "id" | "created_at" | "updated_at"> {
  const startedAt = input.startedAt ?? now.toISOString();
  const trainedOn = input.startedAt
    ? deriveTrainingDate(input.startedAt, now)
    : dateOnlyFromDate(now);
  const gymName = gymProfile ? formatGymSnapshot(gymProfile) : input.gymName ?? null;

  return {
    patient_id: patientId,
    trained_on: trainedOn,
    started_at: startedAt,
    ended_at: input.endedAt ?? null,
    gym_profile_id: gymProfile?.id ?? input.gymProfileId ?? null,
    gym_name: gymName,
    activity_type: input.activityType,
    duration_minutes: calculateDurationMinutes({
      startedAt,
      endedAt: input.endedAt,
      durationMinutes: input.durationMinutes,
    }),
    intensity: input.intensity,
    notes: input.notes ?? null,
  };
}

export function buildTrainingSessionUpdate(
  input: UpdateTrainingSessionInput,
  gymProfile?: GymProfileRow | null,
): Partial<Omit<TrainingLogRow, "id" | "patient_id" | "created_at">> {
  const row: Partial<Omit<TrainingLogRow, "id" | "patient_id" | "created_at">> = {
    updated_at: new Date().toISOString(),
  };

  if (input.startedAt !== undefined) {
    row.started_at = input.startedAt ?? null;
    row.trained_on = input.startedAt
      ? deriveTrainingDate(input.startedAt)
      : undefined;
  }

  if (input.endedAt !== undefined) {
    row.ended_at = input.endedAt ?? null;
  }

  if (input.gymName !== undefined) {
    row.gym_name = input.gymName ?? null;
  }

  if (input.gymProfileId !== undefined) {
    row.gym_profile_id = gymProfile?.id ?? input.gymProfileId ?? null;
    row.gym_name = gymProfile ? formatGymSnapshot(gymProfile) : input.gymName ?? null;
  }

  if (input.activityType !== undefined) {
    row.activity_type = input.activityType;
  }

  if (input.durationMinutes !== undefined) {
    row.duration_minutes = input.durationMinutes;
  }

  if (input.intensity !== undefined) {
    row.intensity = input.intensity;
  }

  if (input.notes !== undefined) {
    row.notes = input.notes ?? null;
  }

  return row;
}

function normalizeTrainingSide(input: CreateTrainingSetInput | UpdateTrainingSetInput) {
  if ("laterality" in input && input.laterality === "bilateral") {
    return "both";
  }

  return "side" in input ? input.side ?? null : undefined;
}

type ResolvedTrainingSetInput = CreateTrainingSetInput & {
  movementName: string;
  laterality: TrainingSet["laterality"];
  weightBasis: TrainingSet["weightBasis"];
};

function assertResolvedTrainingSetInput(
  input: CreateTrainingSetInput,
  profile?: EquipmentProfileRow | null,
): ResolvedTrainingSetInput {
  const movementName = input.movementName ?? profile?.default_movement_name ?? null;
  const laterality = input.laterality ?? profile?.default_laterality ?? null;
  const weightBasis = input.weightBasis ?? profile?.default_weight_basis ?? null;

  if (!movementName || !laterality || !weightBasis) {
    throw new TrainingValidationError(
      "請確認動作名稱、單側/雙側與重量記法皆已填寫。",
    );
  }

  return {
    ...input,
    movementName,
    laterality,
    weightBasis,
  };
}

function assertNoGymProfileConflict(
  session: Pick<TrainingLogRow, "gym_profile_id">,
  profile: EquipmentProfileRow,
) {
  if (
    session.gym_profile_id &&
    profile.gym_profile_id &&
    session.gym_profile_id !== profile.gym_profile_id
  ) {
    throw new TrainingValidationError("訓練 session 與器材所屬健身房不一致。");
  }
}

export function buildTrainingSetInsert(
  trainingLogId: string,
  input: ResolvedTrainingSetInput,
  profile?: EquipmentProfileRow | null,
): Omit<TrainingSetRow, "id" | "created_at" | "updated_at"> {
  const snapshot = profile ? equipmentSnapshotFromProfile(profile) : null;

  return {
    training_log_id: trainingLogId,
    equipment_profile_id: profile?.id ?? input.equipmentProfileId ?? null,
    exercise_order: input.exerciseOrder,
    set_number: input.setNumber,
    movement_name: input.movementName,
    equipment_name: snapshot?.equipmentName ?? input.equipmentName ?? null,
    equipment_brand: snapshot?.equipmentBrand ?? input.equipmentBrand ?? null,
    equipment_model: snapshot?.equipmentModel ?? input.equipmentModel ?? null,
    laterality: input.laterality,
    side: normalizeTrainingSide(input) ?? null,
    weight_kg: input.weightKg ?? null,
    weight_basis: input.weightBasis,
    reps: input.reps ?? null,
    set_type: input.setType,
    to_failure: input.toFailure,
    rpe: input.rpe ?? null,
    notes: input.notes ?? null,
  };
}

export function buildTrainingSetUpdate(
  input: UpdateTrainingSetInput,
  profile?: EquipmentProfileRow | null,
): Partial<Omit<TrainingSetRow, "id" | "training_log_id" | "created_at">> {
  const row: Partial<Omit<TrainingSetRow, "id" | "training_log_id" | "created_at">> = {
    updated_at: new Date().toISOString(),
  };

  if (input.exerciseOrder !== undefined) row.exercise_order = input.exerciseOrder;
  if (input.setNumber !== undefined) row.set_number = input.setNumber;
  if (input.movementName !== undefined) row.movement_name = input.movementName;
  if (input.equipmentProfileId !== undefined) {
    row.equipment_profile_id = profile?.id ?? input.equipmentProfileId ?? null;
  }

  if (profile) {
    const snapshot = equipmentSnapshotFromProfile(profile);
    row.equipment_name = snapshot.equipmentName;
    row.equipment_brand = snapshot.equipmentBrand;
    row.equipment_model = snapshot.equipmentModel;
  } else {
    if (input.equipmentName !== undefined) row.equipment_name = input.equipmentName ?? null;
    if (input.equipmentBrand !== undefined) row.equipment_brand = input.equipmentBrand ?? null;
    if (input.equipmentModel !== undefined) row.equipment_model = input.equipmentModel ?? null;
  }
  if (input.laterality !== undefined) row.laterality = input.laterality;
  if (input.side !== undefined || input.laterality === "bilateral") {
    row.side = normalizeTrainingSide(input) ?? null;
  }
  if (input.weightKg !== undefined) row.weight_kg = input.weightKg ?? null;
  if (input.weightBasis !== undefined) row.weight_basis = input.weightBasis;
  if (input.reps !== undefined) row.reps = input.reps ?? null;
  if (input.setType !== undefined) row.set_type = input.setType;
  if (input.toFailure !== undefined) row.to_failure = input.toFailure;
  if (input.rpe !== undefined) row.rpe = input.rpe ?? null;
  if (input.notes !== undefined) row.notes = input.notes ?? null;

  return row;
}

function assertStoreResult<T>(result: { data: T | null; error: unknown }) {
  if (result.error) {
    throw new TrainingStorageError();
  }

  return result.data;
}

function applyNullableFilter(
  builder: SupabaseQuery,
  column: string,
  value: string | null,
) {
  return value === null ? builder.is(column, null) : builder.eq(column, value);
}

export async function createTrainingSession(
  input: CreateTrainingSessionInput,
  patientId: string,
  store: TrainingStore,
  now = new Date(),
) {
  let gymProfile: GymProfileRow | null = null;

  if (input.gymProfileId) {
    const gymResult = await store.findGymProfileForOwner(input.gymProfileId, patientId);
    gymProfile = assertStoreResult(gymResult);

    if (!gymProfile) {
      throw new TrainingNotFoundError();
    }
  }

  const result = await store.createSession(
    buildTrainingSessionInsert(input, patientId, now, gymProfile),
  );
  const row = assertStoreResult(result);

  if (!row) {
    throw new TrainingStorageError();
  }

  return mapTrainingLogRow(row);
}

export async function listTrainingSessions(
  patientId: string,
  query: TrainingSessionQueryInput,
  store: TrainingStore,
) {
  const result = await store.listSessions(patientId, query);
  const rows = assertStoreResult(result) ?? [];

  if (!query.includeSets || rows.length === 0) {
    return rows.map((row) => mapTrainingLogRow(row));
  }

  const setResult = await store.listSetsForSessions(rows.map((row) => row.id));
  const setRows = assertStoreResult(setResult) ?? [];
  const setsBySession = new Map<string, TrainingSet[]>();

  for (const row of setRows) {
    const sets = setsBySession.get(row.training_log_id) ?? [];
    sets.push(mapTrainingSetRow(row));
    setsBySession.set(row.training_log_id, sets);
  }

  return rows.map((row) => mapTrainingLogRow(row, setsBySession.get(row.id) ?? []));
}

export async function updateTrainingSession(
  id: string,
  patientId: string,
  input: UpdateTrainingSessionInput,
  store: TrainingStore,
) {
  let gymProfile: GymProfileRow | null = null;

  if (input.gymProfileId) {
    const gymResult = await store.findGymProfileForOwner(input.gymProfileId, patientId);
    gymProfile = assertStoreResult(gymResult);

    if (!gymProfile) {
      throw new TrainingNotFoundError();
    }
  }

  const result = await store.updateSession(
    id,
    patientId,
    buildTrainingSessionUpdate(input, gymProfile),
  );
  const row = assertStoreResult(result);

  if (!row) {
    throw new TrainingNotFoundError();
  }

  return mapTrainingLogRow(row);
}

export async function deleteTrainingSession(
  id: string,
  patientId: string,
  store: TrainingStore,
) {
  const result = await store.deleteSession(id, patientId);
  const row = assertStoreResult(result);

  if (!row) {
    throw new TrainingNotFoundError();
  }

  return row;
}

export async function createTrainingSets(
  trainingLogId: string,
  patientId: string,
  inputs: CreateTrainingSetInput[],
  store: TrainingStore,
) {
  const sessionResult = await store.findSessionForOwner(trainingLogId, patientId);
  const session = assertStoreResult(sessionResult);

  if (!session) {
    throw new TrainingNotFoundError();
  }

  const equipmentProfiles = new Map<string, EquipmentProfileRow | null>();
  const resolvedInputs = [];

  for (const input of inputs) {
    let profile: EquipmentProfileRow | null = null;

    if (input.equipmentProfileId) {
      if (!equipmentProfiles.has(input.equipmentProfileId)) {
        const profileResult = await store.findEquipmentProfileForOwner(
          input.equipmentProfileId,
          patientId,
        );
        equipmentProfiles.set(
          input.equipmentProfileId,
          assertStoreResult(profileResult),
        );
      }

      profile = equipmentProfiles.get(input.equipmentProfileId) ?? null;

      if (!profile) {
        throw new TrainingNotFoundError();
      }

      assertNoGymProfileConflict(session, profile);
    }

    resolvedInputs.push({
      input: assertResolvedTrainingSetInput(input, profile),
      profile,
    });
  }

  const result = await store.createSets(
    resolvedInputs.map(({ input, profile }) =>
      buildTrainingSetInsert(trainingLogId, input, profile),
    ),
  );
  const rows = assertStoreResult(result) ?? [];

  return rows.map(mapTrainingSetRow);
}

export async function listTrainingSets(
  trainingLogId: string,
  patientId: string,
  store: TrainingStore,
) {
  const sessionResult = await store.findSessionForOwner(trainingLogId, patientId);
  const session = assertStoreResult(sessionResult);

  if (!session) {
    throw new TrainingNotFoundError();
  }

  const result = await store.listSets(trainingLogId);
  return (assertStoreResult(result) ?? []).map(mapTrainingSetRow);
}

export async function updateTrainingSet(
  setId: string,
  patientId: string,
  input: UpdateTrainingSetInput,
  store: TrainingStore,
) {
  const ownerResult = await store.findSetForOwner(setId, patientId);
  const ownerRow = assertStoreResult(ownerResult);

  if (!ownerRow) {
    throw new TrainingNotFoundError();
  }

  let profile: EquipmentProfileRow | null = null;

  if (input.equipmentProfileId) {
    const profileResult = await store.findEquipmentProfileForOwner(
      input.equipmentProfileId,
      patientId,
    );
    profile = assertStoreResult(profileResult);

    if (!profile) {
      throw new TrainingNotFoundError();
    }

    const sessionResult = await store.findSessionForOwner(
      ownerRow.training_log_id,
      patientId,
    );
    const session = assertStoreResult(sessionResult);

    if (!session) {
      throw new TrainingNotFoundError();
    }

    assertNoGymProfileConflict(session, profile);
  }

  const result = await store.updateSet(setId, buildTrainingSetUpdate(input, profile));
  const row = assertStoreResult(result);

  if (!row) {
    throw new TrainingNotFoundError();
  }

  return mapTrainingSetRow(row);
}

export async function deleteTrainingSet(
  setId: string,
  patientId: string,
  store: TrainingStore,
) {
  const ownerResult = await store.findSetForOwner(setId, patientId);
  const ownerRow = assertStoreResult(ownerResult);

  if (!ownerRow) {
    throw new TrainingNotFoundError();
  }

  const result = await store.deleteSet(setId);
  const row = assertStoreResult(result);

  if (!row) {
    throw new TrainingNotFoundError();
  }

  return row;
}

export function createSupabaseTrainingStore(supabase: SupabaseTrainingClient): TrainingStore {
  return {
    async createSession(row) {
      const { data, error } = await supabase
        .from("training_logs")
        .insert(row)
        .select(sessionSelect)
        .single();
      return { data: data as TrainingLogRow | null, error };
    },
    async listSessions(patientId, query) {
      let builder = supabase
        .from("training_logs")
        .select(sessionSelect)
        .eq("patient_id", patientId)
        .order("started_at", { ascending: false, nullsFirst: false })
        .order("trained_on", { ascending: false })
        .limit(query.limit);

      if (query.from) builder = builder.gte("trained_on", query.from);
      if (query.to) builder = builder.lte("trained_on", query.to);

      const { data, error } = await builder;
      return { data: data as TrainingLogRow[] | null, error };
    },
    async updateSession(id, patientId, row) {
      const { data, error } = await supabase
        .from("training_logs")
        .update(row)
        .eq("id", id)
        .eq("patient_id", patientId)
        .select(sessionSelect)
        .maybeSingle();
      return { data: data as TrainingLogRow | null, error };
    },
    async deleteSession(id, patientId) {
      const { data, error } = await supabase
        .from("training_logs")
        .delete()
        .eq("id", id)
        .eq("patient_id", patientId)
        .select("id")
        .maybeSingle();
      return { data: data as { id: string } | null, error };
    },
    async findSessionForOwner(id, patientId) {
      const { data, error } = await supabase
        .from("training_logs")
        .select(sessionSelect)
        .eq("id", id)
        .eq("patient_id", patientId)
        .maybeSingle();
      return {
        data: data as TrainingLogRow | null,
        error,
      };
    },
    async findGymProfileForOwner(id, patientId) {
      const { data, error } = await supabase
        .from("gym_profiles")
        .select("id,owner_id,name,normalized_name,branch_name,normalized_branch_name,location_text,created_at,updated_at")
        .eq("id", id)
        .eq("owner_id", patientId)
        .maybeSingle();
      return { data: data as GymProfileRow | null, error };
    },
    async findEquipmentProfileForOwner(id, patientId) {
      const { data, error } = await supabase
        .from("equipment_profiles")
        .select("id,owner_id,gym_profile_id,canonical_name,normalized_name,brand,model,default_movement_name,default_laterality,default_weight_basis,seat_setting,pad_setting,handle_setting,notes,created_at,updated_at")
        .eq("id", id)
        .eq("owner_id", patientId)
        .maybeSingle();
      return { data: data as EquipmentProfileRow | null, error };
    },
    async createSets(rows) {
      const { data, error } = await supabase
        .from("training_sets")
        .insert(rows)
        .select(setSelect)
        .order("exercise_order", { ascending: true })
        .order("set_number", { ascending: true });
      return { data: data as TrainingSetRow[] | null, error };
    },
    async listSets(trainingLogId) {
      const { data, error } = await supabase
        .from("training_sets")
        .select(setSelect)
        .eq("training_log_id", trainingLogId)
        .order("exercise_order", { ascending: true })
        .order("set_number", { ascending: true })
        .order("created_at", { ascending: true });
      return { data: data as TrainingSetRow[] | null, error };
    },
    async listSetsForSessions(trainingLogIds) {
      if (trainingLogIds.length === 0) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from("training_sets")
        .select(setSelect)
        .in("training_log_id", trainingLogIds)
        .order("exercise_order", { ascending: true })
        .order("set_number", { ascending: true })
        .order("created_at", { ascending: true });
      return { data: data as TrainingSetRow[] | null, error };
    },
    async findLastPerformanceSessions(patientId, signature, limit) {
      let builder = supabase
        .from("training_logs")
        .select(`${sessionSelect},training_sets!inner(${setSelect})`)
        .eq("patient_id", patientId)
        .eq("training_sets.movement_name", signature.movementName)
        .eq("training_sets.laterality", signature.laterality)
        .eq("training_sets.weight_basis", signature.weightBasis)
        .order("started_at", { ascending: false, nullsFirst: false })
        .order("trained_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (signature.equipmentProfileId) {
        builder = builder.eq(
          "training_sets.equipment_profile_id",
          signature.equipmentProfileId,
        );
      } else {
        builder = applyNullableFilter(builder, "gym_name", signature.gymName);
        builder = applyNullableFilter(
          builder,
          "training_sets.equipment_brand",
          signature.equipmentBrand,
        );
        builder = applyNullableFilter(
          builder,
          "training_sets.equipment_name",
          signature.equipmentName,
        );
        builder = applyNullableFilter(
          builder,
          "training_sets.equipment_model",
          signature.equipmentModel,
        );
      }

      const { data, error } = await builder;
      return { data: data as TrainingLogWithSetRows[] | null, error };
    },
    async findSetForOwner(setId, patientId) {
      const { data, error } = await supabase
        .from("training_sets")
        .select(setSelect)
        .eq("id", setId)
        .maybeSingle();

      if (error || !data) {
        return { data: null, error };
      }

      const setRow = data as TrainingSetRow;
      const sessionResult = await supabase
        .from("training_logs")
        .select("id")
        .eq("id", setRow.training_log_id)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (sessionResult.error || !sessionResult.data) {
        return { data: null, error: sessionResult.error };
      }

      return { data: data as TrainingSetRow | null, error };
    },
    async updateSet(setId, row) {
      const { data, error } = await supabase
        .from("training_sets")
        .update(row)
        .eq("id", setId)
        .select(setSelect)
        .maybeSingle();
      return { data: data as TrainingSetRow | null, error };
    },
    async deleteSet(setId) {
      const { data, error } = await supabase
        .from("training_sets")
        .delete()
        .eq("id", setId)
        .select("id")
        .maybeSingle();
      return { data: data as { id: string } | null, error };
    },
  };
}

export function demoTrainingSession(now = new Date()): TrainingLog {
  return {
    id: "demo-training-session",
    userId: "demo-user",
    trainedOn: dateOnlyFromDate(now),
    startedAt: now.toISOString(),
    endedAt: null,
    gymProfileId: "demo-gym-profile",
    gymName: "Demo Gym",
    activityType: "strength_training",
    durationMinutes: 1,
    intensity: "MEDIUM",
    notes: "Demo mode：此筆訓練尚未寫入正式資料庫。",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sets: [],
  };
}

export function demoTrainingSet(trainingLogId = "demo-training-session"): TrainingSet {
  const now = new Date().toISOString();

  return {
    id: "demo-training-set",
    trainingLogId,
    equipmentProfileId: "demo-equipment-profile",
    exerciseOrder: 1,
    setNumber: 1,
    movementName: "Hammer Strength ILWPD",
    equipmentName: "ILWPD",
    equipmentBrand: "Hammer Strength",
    equipmentModel: null,
    laterality: "unilateral",
    side: "alternating",
    weightKg: 30,
    weightBasis: "per_side",
    reps: 12,
    setType: "working",
    toFailure: false,
    rpe: 8,
    notes: "Demo mode：僅供操作示範。",
    createdAt: now,
    updatedAt: now,
  };
}
