import assert from "node:assert/strict";
import test from "node:test";

import {
  handleCreateTrainingSession,
  handleCreateTrainingSets,
  handleDeleteTrainingSession,
  handleDeleteTrainingSet,
  handleListTrainingSessions,
  handleUpdateTrainingSession,
  handleUpdateTrainingSet,
  type TrainingApiDeps,
} from "../src/lib/training-api";
import {
  handleLastTrainingPerformance,
  handleRecentTrainingHistory,
} from "../src/lib/training-history-api";
import { copyTrainingSetsToDrafts } from "../src/lib/training-history";
import {
  buildTrainingSessionInsert,
  type TrainingLogRow,
  type TrainingLogWithSetRows,
  type TrainingSetRow,
  type TrainingStore,
} from "../src/lib/training";
import type { TrainingEquipmentSignature } from "../src/lib/types";

class MemoryTrainingStore implements TrainingStore {
  sessions: TrainingLogRow[] = [];
  sets: TrainingSetRow[] = [];
  calls = {
    createSession: 0,
    updateSession: 0,
    deleteSession: 0,
    createSets: 0,
    updateSet: 0,
    deleteSet: 0,
  };

  private sessionSeq = 0;
  private setSeq = 0;

  async createSession(row: Omit<TrainingLogRow, "id" | "created_at" | "updated_at">) {
    this.calls.createSession += 1;
    const now = "2026-07-11T08:00:00.000Z";
    const session: TrainingLogRow = {
      id: `session-${++this.sessionSeq}`,
      ...row,
      created_at: now,
      updated_at: now,
    };
    this.sessions.push(session);
    return { data: session, error: null };
  }

  async listSessions(patientId: string, query: { from?: string; to?: string; limit: number }) {
    const rows = this.sessions
      .filter((session) => session.patient_id === patientId)
      .filter((session) => !query.from || session.trained_on >= query.from)
      .filter((session) => !query.to || session.trained_on <= query.to)
      .sort((left, right) => right.trained_on.localeCompare(left.trained_on))
      .slice(0, query.limit);

    return { data: rows, error: null };
  }

  async updateSession(
    id: string,
    patientId: string,
    row: Partial<Omit<TrainingLogRow, "id" | "patient_id" | "created_at">>,
  ) {
    this.calls.updateSession += 1;
    const index = this.sessions.findIndex(
      (session) => session.id === id && session.patient_id === patientId,
    );

    if (index < 0) {
      return { data: null, error: null };
    }

    this.sessions[index] = { ...this.sessions[index], ...row };
    return { data: this.sessions[index], error: null };
  }

  async deleteSession(id: string, patientId: string) {
    this.calls.deleteSession += 1;
    const index = this.sessions.findIndex(
      (session) => session.id === id && session.patient_id === patientId,
    );

    if (index < 0) {
      return { data: null, error: null };
    }

    this.sessions.splice(index, 1);
    this.sets = this.sets.filter((set) => set.training_log_id !== id);
    return { data: { id }, error: null };
  }

  async findSessionForOwner(id: string, patientId: string) {
    return {
      data:
        this.sessions.find(
          (session) => session.id === id && session.patient_id === patientId,
        ) ?? null,
      error: null,
    };
  }

  async createSets(
    rows: Array<Omit<TrainingSetRow, "id" | "created_at" | "updated_at">>,
  ) {
    this.calls.createSets += 1;
    const now = "2026-07-11T08:30:00.000Z";
    const nextRows: TrainingSetRow[] = rows.map((row) => ({
      id: `set-${++this.setSeq}`,
      ...row,
      created_at: now,
      updated_at: now,
    }));
    this.sets.push(...nextRows);
    return { data: nextRows, error: null };
  }

  async listSets(trainingLogId: string) {
    return {
      data: this.sets
        .filter((set) => set.training_log_id === trainingLogId)
        .sort((left, right) => left.exercise_order - right.exercise_order || left.set_number - right.set_number),
      error: null,
    };
  }

  async listSetsForSessions(trainingLogIds: string[]) {
    return {
      data: this.sets.filter((set) => trainingLogIds.includes(set.training_log_id)),
      error: null,
    };
  }

  async findLastPerformanceSessions(
    patientId: string,
    signature: TrainingEquipmentSignature,
    limit: number,
  ) {
    const nullable = (value: string | null | undefined) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
    const rows: TrainingLogWithSetRows[] = this.sessions
      .filter((session) => session.patient_id === patientId)
      .filter((session) => nullable(session.gym_name) === signature.gymName)
      .map((session) => ({
        ...session,
        training_sets: this.sets.filter(
          (set) =>
            set.training_log_id === session.id &&
            set.movement_name.trim() === signature.movementName &&
            nullable(set.equipment_brand) === signature.equipmentBrand &&
            nullable(set.equipment_name) === signature.equipmentName &&
            nullable(set.equipment_model) === signature.equipmentModel &&
            set.laterality === signature.laterality &&
            set.weight_basis === signature.weightBasis,
        ),
      }))
      .filter((session) => (session.training_sets ?? []).length > 0)
      .sort((left, right) => {
        if (left.started_at !== right.started_at) {
          if (!left.started_at) return 1;
          if (!right.started_at) return -1;
          return right.started_at.localeCompare(left.started_at);
        }

        return (
          right.trained_on.localeCompare(left.trained_on) ||
          right.created_at.localeCompare(left.created_at)
        );
      })
      .slice(0, limit);

    return { data: rows, error: null };
  }

  async findSetForOwner(setId: string, patientId: string) {
    const set = this.sets.find((candidate) => candidate.id === setId);
    const session = set
      ? this.sessions.find(
          (candidate) =>
            candidate.id === set.training_log_id && candidate.patient_id === patientId,
        )
      : null;

    return { data: set && session ? set : null, error: null };
  }

  async updateSet(
    setId: string,
    row: Partial<Omit<TrainingSetRow, "id" | "training_log_id" | "created_at">>,
  ) {
    this.calls.updateSet += 1;
    const index = this.sets.findIndex((set) => set.id === setId);

    if (index < 0) {
      return { data: null, error: null };
    }

    this.sets[index] = { ...this.sets[index], ...row };
    return { data: this.sets[index], error: null };
  }

  async deleteSet(setId: string) {
    this.calls.deleteSet += 1;
    const index = this.sets.findIndex((set) => set.id === setId);

    if (index < 0) {
      return { data: null, error: null };
    }

    this.sets.splice(index, 1);
    return { data: { id: setId }, error: null };
  }
}

function depsFor(
  store: MemoryTrainingStore,
  userId: string | null = "user-1",
  configured = true,
): TrainingApiDeps {
  return {
    hasSupabaseConfig: () => configured,
    getCurrentUser: async () => ({
      supabase: configured ? ({} as never) : null,
      user: userId ? ({ id: userId } as never) : null,
    }),
    createStore: () => store,
  };
}

function jsonRequest(path: string, body: unknown, method = "POST") {
  return new Request(`http://127.0.0.1${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function responseJson<T>(response: Response) {
  return (await response.json()) as { data?: T; error?: unknown };
}

const validSessionPayload = {
  startedAt: "2026-07-11T08:00:00+08:00",
  activityType: "strength_training",
  durationMinutes: 45,
  intensity: "MEDIUM",
};

const validSetPayload = {
  exerciseOrder: 1,
  setNumber: 1,
  movementName: "Hammer Strength ILWPD",
  equipmentBrand: "Hammer Strength",
  equipmentName: "ILWPD",
  laterality: "unilateral",
  side: "alternating",
  weightKg: 30,
  weightBasis: "per_side",
  reps: 12,
  setType: "working",
  rpe: 8,
};

async function createSession(store: MemoryTrainingStore, userId = "user-1") {
  const response = await handleCreateTrainingSession(
    jsonRequest("/api/training-logs", validSessionPayload),
    depsFor(store, userId),
  );
  const body = await responseJson<{ trainingLog: { id: string } }>(response);
  return body.data?.trainingLog.id ?? "";
}

async function createSessionWithPayload(
  store: MemoryTrainingStore,
  userId: string,
  payload: typeof validSessionPayload & { gymName?: string },
) {
  const response = await handleCreateTrainingSession(
    jsonRequest("/api/training-logs", payload),
    depsFor(store, userId),
  );
  const body = await responseJson<{ trainingLog: { id: string } }>(response);
  return body.data?.trainingLog.id ?? "";
}

test("training session rejects unauthenticated requests", async () => {
  const store = new MemoryTrainingStore();
  const response = await handleCreateTrainingSession(
    jsonRequest("/api/training-logs", validSessionPayload),
    depsFor(store, null),
  );

  assert.equal(response.status, 401);
  assert.equal(store.calls.createSession, 0);
});

test("training session uses session user as patient_id", async () => {
  const store = new MemoryTrainingStore();
  const response = await handleCreateTrainingSession(
    jsonRequest("/api/training-logs", validSessionPayload),
    depsFor(store, "patient-session"),
  );

  assert.equal(response.status, 201);
  assert.equal(store.sessions[0].patient_id, "patient-session");
  assert.equal(store.sessions[0].trained_on, "2026-07-11");
});

test("training session without startedAt uses local server date instead of UTC slice", () => {
  const row = buildTrainingSessionInsert(
    {
      activityType: "strength_training",
      durationMinutes: 1,
      intensity: "MEDIUM",
    },
    "patient-session",
    new Date("2026-07-11T17:30:00.000Z"),
  );

  assert.equal(row.trained_on, "2026-07-12");
  assert.equal(row.patient_id, "patient-session");
});

test("frontend owner fields cannot override training session owner", async () => {
  const store = new MemoryTrainingStore();
  const response = await handleCreateTrainingSession(
    jsonRequest("/api/training-logs", {
      ...validSessionPayload,
      patient_id: "other-user",
      user_id: "other-user",
    }),
    depsFor(store, "patient-session"),
  );

  assert.equal(response.status, 422);
  assert.equal(store.calls.createSession, 0);
});

test("training session list only returns own sessions", async () => {
  const store = new MemoryTrainingStore();
  await createSession(store, "user-1");
  await createSession(store, "user-2");

  const response = await handleListTrainingSessions(
    new Request("http://127.0.0.1/api/training-logs?limit=20"),
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{ trainingLogs: Array<{ userId: string }> }>(response);

  assert.equal(response.status, 200);
  assert.equal(body.data?.trainingLogs.length, 1);
  assert.equal(body.data?.trainingLogs[0].userId, "user-1");
});

test("training session update and delete hide other users as 404", async () => {
  const store = new MemoryTrainingStore();
  const ownId = await createSession(store, "user-1");
  const otherId = await createSession(store, "user-2");

  const updateOwn = await handleUpdateTrainingSession(
    jsonRequest(`/api/training-logs/${ownId}`, { durationMinutes: 55 }, "PATCH"),
    ownId,
    depsFor(store, "user-1"),
  );
  const updateOther = await handleUpdateTrainingSession(
    jsonRequest(`/api/training-logs/${otherId}`, { durationMinutes: 30 }, "PATCH"),
    otherId,
    depsFor(store, "user-1"),
  );
  const deleteOwn = await handleDeleteTrainingSession(ownId, depsFor(store, "user-1"));

  assert.equal(updateOwn.status, 200);
  assert.equal(updateOther.status, 404);
  assert.equal(deleteOwn.status, 200);
});

test("training sets support single and batch inserts", async () => {
  const store = new MemoryTrainingStore();
  const sessionId = await createSession(store);

  const single = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, validSetPayload),
    sessionId,
    depsFor(store),
  );
  const batch = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      sets: [
        { ...validSetPayload, setNumber: 2, rpe: 8.5 },
        { ...validSetPayload, setNumber: 3, setType: "drop", toFailure: true },
      ],
    }),
    sessionId,
    depsFor(store),
  );

  assert.equal(single.status, 201);
  assert.equal(batch.status, 201);
  assert.equal(store.sets.length, 3);
  assert.equal(Number(store.sets[1].rpe), 8.5);
});

test("training set payload cannot provide parent relationship fields", async () => {
  const store = new MemoryTrainingStore();
  const sessionId = await createSession(store);
  const response = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      ...validSetPayload,
      training_log_id: "other-session",
      trainingLogId: "other-session",
      patient_id: "other-user",
      user_id: "other-user",
    }),
    sessionId,
    depsFor(store),
  );

  assert.equal(response.status, 422);
  assert.equal(store.calls.createSets, 0);
});

test("training sets cannot be added to another user's session", async () => {
  const store = new MemoryTrainingStore();
  const otherSessionId = await createSession(store, "user-2");
  const response = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${otherSessionId}/sets`, validSetPayload),
    otherSessionId,
    depsFor(store, "user-1"),
  );

  assert.equal(response.status, 404);
  assert.equal(store.calls.createSets, 0);
});

test("training set validation covers basis, laterality, rpe, set type, and batch limits", async () => {
  const store = new MemoryTrainingStore();
  const sessionId = await createSession(store);

  const invalidWeightBasis = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      ...validSetPayload,
      weightBasis: "plate",
    }),
    sessionId,
    depsFor(store),
  );
  const invalidLaterality = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      ...validSetPayload,
      laterality: "bilateral",
      side: "left",
    }),
    sessionId,
    depsFor(store),
  );
  const invalidRpe = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      ...validSetPayload,
      rpe: 10.5,
    }),
    sessionId,
    depsFor(store),
  );
  const invalidSetType = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      ...validSetPayload,
      setType: "failure",
    }),
    sessionId,
    depsFor(store),
  );
  const tooManySets = await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      sets: Array.from({ length: 101 }).map((_, index) => ({
        ...validSetPayload,
        setNumber: index + 1,
      })),
    }),
    sessionId,
    depsFor(store),
  );

  assert.equal(invalidWeightBasis.status, 422);
  assert.equal(invalidLaterality.status, 422);
  assert.equal(invalidRpe.status, 422);
  assert.equal(invalidSetType.status, 422);
  assert.equal(tooManySets.status, 422);
});

test("training sets update and delete hide other users as 404", async () => {
  const store = new MemoryTrainingStore();
  const ownSession = await createSession(store, "user-1");
  const otherSession = await createSession(store, "user-2");

  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${ownSession}/sets`, validSetPayload),
    ownSession,
    depsFor(store, "user-1"),
  );
  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${otherSession}/sets`, validSetPayload),
    otherSession,
    depsFor(store, "user-2"),
  );

  const ownSetId = store.sets[0].id;
  const otherSetId = store.sets[1].id;
  const updateOwn = await handleUpdateTrainingSet(
    jsonRequest(`/api/training-sets/${ownSetId}`, { rpe: 8.5 }, "PATCH"),
    ownSetId,
    depsFor(store, "user-1"),
  );
  const updateOther = await handleUpdateTrainingSet(
    jsonRequest(`/api/training-sets/${otherSetId}`, { rpe: 7 }, "PATCH"),
    otherSetId,
    depsFor(store, "user-1"),
  );
  const deleteOwn = await handleDeleteTrainingSet(ownSetId, depsFor(store, "user-1"));
  const deleteOther = await handleDeleteTrainingSet(otherSetId, depsFor(store, "user-1"));

  assert.equal(updateOwn.status, 200);
  assert.equal(updateOther.status, 404);
  assert.equal(deleteOwn.status, 200);
  assert.equal(deleteOther.status, 404);
});

test("training set update cannot change parent relationship or side without laterality", async () => {
  const store = new MemoryTrainingStore();
  const sessionId = await createSession(store);
  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, validSetPayload),
    sessionId,
    depsFor(store),
  );

  const setId = store.sets[0].id;
  const parentChange = await handleUpdateTrainingSet(
    jsonRequest(
      `/api/training-sets/${setId}`,
      { training_log_id: "other-session", trainingLogId: "other-session" },
      "PATCH",
    ),
    setId,
    depsFor(store),
  );
  const sideOnly = await handleUpdateTrainingSet(
    jsonRequest(`/api/training-sets/${setId}`, { side: "left" }, "PATCH"),
    setId,
    depsFor(store),
  );

  assert.equal(parentChange.status, 422);
  assert.equal(sideOnly.status, 422);
  assert.equal(store.calls.updateSet, 0);
});

test("demo mode returns persisted false and never writes through the store", async () => {
  const store = new MemoryTrainingStore();
  const session = await handleCreateTrainingSession(
    jsonRequest("/api/training-logs", validSessionPayload),
    depsFor(store, "demo-user", false),
  );
  const sets = await handleCreateTrainingSets(
    jsonRequest("/api/training-logs/demo-training-session/sets", validSetPayload),
    "demo-training-session",
    depsFor(store, "demo-user", false),
  );
  const sessionBody = await responseJson<{ persisted: boolean }>(session);
  const setsBody = await responseJson<{ persisted: boolean }>(sets);

  assert.equal(session.status, 202);
  assert.equal(sets.status, 202);
  assert.equal(sessionBody.data?.persisted, false);
  assert.equal(setsBody.data?.persisted, false);
  assert.equal(store.calls.createSession, 0);
  assert.equal(store.calls.createSets, 0);
  assert.equal(store.calls.updateSession, 0);
  assert.equal(store.calls.updateSet, 0);
  assert.equal(store.calls.deleteSession, 0);
  assert.equal(store.calls.deleteSet, 0);
});

test("training history rejects unauthenticated requests", async () => {
  const store = new MemoryTrainingStore();
  const response = await handleRecentTrainingHistory(
    new Request("http://127.0.0.1/api/training-history/recent"),
    depsFor(store, null),
  );

  assert.equal(response.status, 401);
});

test("training history recent only returns the current user's sessions with sets", async () => {
  const store = new MemoryTrainingStore();
  const ownSession = await createSessionWithPayload(store, "user-1", {
    ...validSessionPayload,
    startedAt: "2026-07-11T08:00:00+08:00",
  });
  const otherSession = await createSessionWithPayload(store, "user-2", {
    ...validSessionPayload,
    startedAt: "2026-07-11T09:00:00+08:00",
  });

  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${ownSession}/sets`, validSetPayload),
    ownSession,
    depsFor(store, "user-1"),
  );
  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${otherSession}/sets`, validSetPayload),
    otherSession,
    depsFor(store, "user-2"),
  );

  const response = await handleRecentTrainingHistory(
    new Request("http://127.0.0.1/api/training-history/recent?limit=5"),
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{ trainingLogs: Array<{ id: string; sets: unknown[] }> }>(response);

  assert.equal(response.status, 200);
  assert.equal(body.data?.trainingLogs.length, 1);
  assert.equal(body.data?.trainingLogs[0].id, ownSession);
  assert.equal(body.data?.trainingLogs[0].sets.length, 1);
});

test("training history returns null when no matching last performance exists", async () => {
  const store = new MemoryTrainingStore();
  const response = await handleLastTrainingPerformance(
    new Request(
      "http://127.0.0.1/api/training-history/last-performance?movementName=Hammer%20Strength%20ILWPD&laterality=unilateral&weightBasis=per_side",
    ),
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{ lastPerformance: unknown | null }>(response);

  assert.equal(response.status, 200);
  assert.equal(body.data?.lastPerformance, null);
});

test("training history last performance matches exact equipment signature and sorts sets", async () => {
  const store = new MemoryTrainingStore();
  const olderSession = await createSessionWithPayload(store, "user-1", {
    ...validSessionPayload,
    startedAt: "2026-07-09T08:00:00+08:00",
    gymName: "Chengxin Gym",
  });
  const ignoredModelSession = await createSessionWithPayload(store, "user-1", {
    ...validSessionPayload,
    startedAt: "2026-07-10T08:00:00+08:00",
    gymName: "Chengxin Gym",
  });
  const latestSession = await createSessionWithPayload(store, "user-1", {
    ...validSessionPayload,
    startedAt: "2026-07-11T08:00:00+08:00",
    gymName: "Chengxin Gym",
  });
  const patientBSession = await createSessionWithPayload(store, "user-2", {
    ...validSessionPayload,
    startedAt: "2026-07-12T08:00:00+08:00",
    gymName: "Chengxin Gym",
  });

  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${olderSession}/sets`, {
      sets: [
        { ...validSetPayload, setNumber: 1, equipmentModel: "v1", weightKg: 28 },
        { ...validSetPayload, setNumber: 2, equipmentModel: "v1", weightKg: 30 },
      ],
    }),
    olderSession,
    depsFor(store, "user-1"),
  );
  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${ignoredModelSession}/sets`, {
      ...validSetPayload,
      equipmentModel: "v2",
      weightKg: 60,
    }),
    ignoredModelSession,
    depsFor(store, "user-1"),
  );
  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${latestSession}/sets`, {
      sets: [
        {
          ...validSetPayload,
          setNumber: 2,
          equipmentModel: "v1",
          weightKg: 32,
          reps: 10,
          rpe: 8.5,
        },
        {
          ...validSetPayload,
          setNumber: 1,
          equipmentModel: "v1",
          setType: "warmup",
          weightKg: 20,
          reps: 12,
          rpe: 6,
        },
        {
          ...validSetPayload,
          setNumber: 3,
          equipmentModel: "v1",
          setType: "drop",
          weightKg: 24,
          reps: 8,
          toFailure: true,
        },
      ],
    }),
    latestSession,
    depsFor(store, "user-1"),
  );
  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${patientBSession}/sets`, {
      ...validSetPayload,
      equipmentModel: "v1",
      weightKg: 100,
    }),
    patientBSession,
    depsFor(store, "user-2"),
  );

  const response = await handleLastTrainingPerformance(
    new Request(
      "http://127.0.0.1/api/training-history/last-performance?movementName=Hammer%20Strength%20ILWPD&equipmentBrand=Hammer%20Strength&equipmentName=ILWPD&equipmentModel=v1&gymName=Chengxin%20Gym&laterality=unilateral&weightBasis=per_side",
    ),
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{
    lastPerformance: {
      sessionId: string;
      lastWorkingWeightKg: number | null;
      bestWorkingSet: { weightKg: number | null; reps: number | null } | null;
      hasDropSet: boolean;
      hasToFailure: boolean;
      sets: Array<{ setNumber: number; weightKg: number | null }>;
    } | null;
  }>(response);

  assert.equal(response.status, 200);
  assert.equal(body.data?.lastPerformance?.sessionId, latestSession);
  assert.deepEqual(
    body.data?.lastPerformance?.sets.map((set) => set.setNumber),
    [1, 2, 3],
  );
  assert.equal(body.data?.lastPerformance?.lastWorkingWeightKg, 32);
  assert.equal(body.data?.lastPerformance?.bestWorkingSet?.weightKg, 32);
  assert.equal(body.data?.lastPerformance?.bestWorkingSet?.reps, 10);
  assert.equal(body.data?.lastPerformance?.hasDropSet, true);
  assert.equal(body.data?.lastPerformance?.hasToFailure, true);
});

test("training history does not mix equipment model, weight basis, or laterality", async () => {
  const store = new MemoryTrainingStore();
  const sessionId = await createSessionWithPayload(store, "user-1", {
    ...validSessionPayload,
    startedAt: "2026-07-11T08:00:00+08:00",
  });

  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      sets: [
        { ...validSetPayload, equipmentModel: "ILWPD-A", weightBasis: "per_side", laterality: "unilateral", side: "alternating", weightKg: 30 },
        { ...validSetPayload, setNumber: 2, equipmentModel: "ILWPD-B", weightBasis: "per_side", laterality: "unilateral", side: "alternating", weightKg: 40 },
        { ...validSetPayload, setNumber: 3, equipmentModel: "ILWPD-A", weightBasis: "total", laterality: "unilateral", side: "alternating", weightKg: 60 },
        { ...validSetPayload, setNumber: 4, equipmentModel: "ILWPD-A", weightBasis: "per_side", laterality: "bilateral", side: "both", weightKg: 80 },
      ],
    }),
    sessionId,
    depsFor(store, "user-1"),
  );

  const response = await handleLastTrainingPerformance(
    new Request(
      "http://127.0.0.1/api/training-history/last-performance?movementName=Hammer%20Strength%20ILWPD&equipmentBrand=Hammer%20Strength&equipmentName=ILWPD&equipmentModel=ILWPD-A&laterality=unilateral&weightBasis=per_side",
    ),
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{
    lastPerformance: { sets: Array<{ weightKg: number | null }> } | null;
  }>(response);

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.data?.lastPerformance?.sets.map((set) => set.weightKg),
    [30],
  );
});

test("training history treats omitted optional signature fields as exact null matches", async () => {
  const store = new MemoryTrainingStore();
  const sessionId = await createSessionWithPayload(store, "user-1", {
    ...validSessionPayload,
    startedAt: "2026-07-11T08:00:00+08:00",
  });

  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      sets: [
        { ...validSetPayload, equipmentModel: undefined, weightKg: 30 },
        { ...validSetPayload, setNumber: 2, equipmentModel: "ILWPD-v2", weightKg: 45 },
      ],
    }),
    sessionId,
    depsFor(store, "user-1"),
  );

  const response = await handleLastTrainingPerformance(
    new Request(
      "http://127.0.0.1/api/training-history/last-performance?movementName=Hammer%20Strength%20ILWPD&equipmentBrand=Hammer%20Strength&equipmentName=ILWPD&laterality=unilateral&weightBasis=per_side",
    ),
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{
    lastPerformance: { sets: Array<{ weightKg: number | null }> } | null;
  }>(response);

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.data?.lastPerformance?.sets.map((set) => set.weightKg),
    [30],
  );
});

test("training history keeps separate exercise order blocks from being merged", async () => {
  const store = new MemoryTrainingStore();
  const sessionId = await createSessionWithPayload(store, "user-1", {
    ...validSessionPayload,
    startedAt: "2026-07-11T08:00:00+08:00",
  });

  await handleCreateTrainingSets(
    jsonRequest(`/api/training-logs/${sessionId}/sets`, {
      sets: [
        { ...validSetPayload, exerciseOrder: 1, setNumber: 1, weightKg: 30 },
        { ...validSetPayload, exerciseOrder: 1, setNumber: 2, weightKg: 32 },
        { ...validSetPayload, exerciseOrder: 2, setNumber: 1, weightKg: 60 },
      ],
    }),
    sessionId,
    depsFor(store, "user-1"),
  );

  const response = await handleLastTrainingPerformance(
    new Request(
      "http://127.0.0.1/api/training-history/last-performance?movementName=Hammer%20Strength%20ILWPD&equipmentBrand=Hammer%20Strength&equipmentName=ILWPD&laterality=unilateral&weightBasis=per_side",
    ),
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{
    lastPerformance: {
      sets: Array<{ exerciseOrder: number; weightKg: number | null }>;
      lastWorkingWeightKg: number | null;
    } | null;
  }>(response);

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.data?.lastPerformance?.sets.map((set) => set.exerciseOrder),
    [1, 1],
  );
  assert.deepEqual(
    body.data?.lastPerformance?.sets.map((set) => set.weightKg),
    [30, 32],
  );
  assert.equal(body.data?.lastPerformance?.lastWorkingWeightKg, 32);
});

test("training history query validates limit upper bound", async () => {
  const store = new MemoryTrainingStore();
  const response = await handleRecentTrainingHistory(
    new Request("http://127.0.0.1/api/training-history/recent?limit=21"),
    depsFor(store, "user-1"),
  );

  assert.equal(response.status, 422);
});

test("copying last performance creates client-side drafts without old ids or today's RPE", () => {
  const drafts = copyTrainingSetsToDrafts([
    {
      id: "old-set-id",
      trainingLogId: "old-session",
      exerciseOrder: 1,
      setNumber: 2,
      movementName: "Hammer Strength ILWPD",
      equipmentName: "ILWPD",
      equipmentBrand: "Hammer Strength",
      equipmentModel: "v1",
      laterality: "unilateral",
      side: "alternating",
      weightKg: 30,
      weightBasis: "per_side",
      reps: 12,
      setType: "working",
      toFailure: true,
      rpe: 8.5,
      notes: "same setup",
      createdAt: "2026-07-10T08:00:00.000Z",
      updatedAt: "2026-07-10T08:00:00.000Z",
    },
  ]);

  assert.equal("id" in drafts[0], false);
  assert.equal(drafts[0].exerciseOrder, "1");
  assert.equal(drafts[0].setNumber, "2");
  assert.equal(drafts[0].weightKg, "30");
  assert.equal(drafts[0].weightBasis, "per_side");
  assert.equal(drafts[0].rpe, "");
  assert.equal(drafts[0].toFailure, false);
  assert.equal(drafts[0].notes, "same setup");
});
