import assert from "node:assert/strict";
import test from "node:test";

import {
  handleCreateEquipment,
  handleCreateEquipmentAlias,
  handleCreateGym,
  handleDeleteEquipment,
  handleDeleteEquipmentAlias,
  handleDeleteGym,
  handleLinkTrainingSetsToEquipment,
  handleListEquipment,
  handleListGyms,
  handleResolveEquipmentProfile,
  handleUpdateEquipment,
  handleUpdateGym,
  type EquipmentApiDeps,
} from "../src/lib/equipment-profiles-api";
import {
  buildAliasInsert,
  type EquipmentAliasRow,
  type EquipmentProfileRow,
  type EquipmentStore,
  type GymProfileRow,
} from "../src/lib/equipment-profiles";
import { normalizeEquipmentLabel } from "../src/lib/normalization";
import { equipmentNormalizationCases } from "./equipment-normalization-vectors";

const gymAId = "10000000-0000-4000-8000-000000000001";
const gymBId = "10000000-0000-4000-8000-000000000002";
const equipmentAId = "10000000-0000-4000-8000-000000000101";
const equipmentBId = "10000000-0000-4000-8000-000000000102";
const setAId = "10000000-0000-4000-8000-000000000201";
const setBId = "10000000-0000-4000-8000-000000000202";

type MemoryTrainingSet = {
  ownerId: string;
  equipmentProfileId: string | null;
  equipmentName: string;
  equipmentBrand: string;
  equipmentModel: string;
};

function trainingSetState(ownerId = "user-1"): MemoryTrainingSet {
  return {
    ownerId,
    equipmentProfileId: null,
    equipmentName: "Legacy machine",
    equipmentBrand: "Legacy brand",
    equipmentModel: "Legacy model",
  };
}

function generatedSetId(index: number) {
  return `20000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

class MemoryEquipmentStore implements EquipmentStore {
  gyms: GymProfileRow[] = [];
  equipment: EquipmentProfileRow[] = [];
  aliases: EquipmentAliasRow[] = [];
  trainingSets = new Map<string, MemoryTrainingSet>();
  aliasCreateError: unknown = null;
  calls = {
    createGym: 0,
    createEquipment: 0,
    createAlias: 0,
    linkTrainingSets: 0,
  };

  private gymSeq = 0;
  private equipmentSeq = 0;
  private aliasSeq = 0;

  async listGyms(ownerId: string, query: { limit: number }) {
    return {
      data: this.gyms.filter((gym) => gym.owner_id === ownerId).slice(0, query.limit),
      error: null,
    };
  }

  async createGym(row: Omit<GymProfileRow, "id" | "created_at" | "updated_at">) {
    this.calls.createGym += 1;
    const now = "2026-07-11T08:00:00.000Z";
    const gym: GymProfileRow = {
      id: `10000000-0000-4000-8000-0000000000${++this.gymSeq}`.slice(0, 36),
      ...row,
      created_at: now,
      updated_at: now,
    };
    this.gyms.push(gym);
    return { data: gym, error: null };
  }

  async findGymForOwner(id: string, ownerId: string) {
    return {
      data: this.gyms.find((gym) => gym.id === id && gym.owner_id === ownerId) ?? null,
      error: null,
    };
  }

  async updateGym(
    id: string,
    ownerId: string,
    row: Partial<Omit<GymProfileRow, "id" | "owner_id" | "created_at">>,
  ) {
    const index = this.gyms.findIndex((gym) => gym.id === id && gym.owner_id === ownerId);
    if (index < 0) return { data: null, error: null };
    this.gyms[index] = { ...this.gyms[index], ...row };
    return { data: this.gyms[index], error: null };
  }

  async deleteGym(id: string, ownerId: string) {
    const index = this.gyms.findIndex((gym) => gym.id === id && gym.owner_id === ownerId);
    if (index < 0) return { data: null, error: null };
    this.gyms.splice(index, 1);
    this.equipment = this.equipment.map((profile) =>
      profile.gym_profile_id === id ? { ...profile, gym_profile_id: null } : profile,
    );
    return { data: { id }, error: null };
  }

  async listEquipment(ownerId: string, query: { gymProfileId?: string | null; includeAliases?: boolean; limit: number }) {
    return {
      data: this.equipment
        .filter((profile) => profile.owner_id === ownerId)
        .filter((profile) => !query.gymProfileId || profile.gym_profile_id === query.gymProfileId)
        .map((profile) => ({
          ...profile,
          equipment_aliases: query.includeAliases
            ? this.aliases.filter((alias) => alias.equipment_profile_id === profile.id)
            : undefined,
        }))
        .slice(0, query.limit),
      error: null,
    };
  }

  async createEquipment(
    row: Omit<EquipmentProfileRow, "id" | "created_at" | "updated_at" | "equipment_aliases" | "gym_profiles">,
  ) {
    this.calls.createEquipment += 1;
    const now = "2026-07-11T08:00:00.000Z";
    const profile: EquipmentProfileRow = {
      id: `10000000-0000-4000-8000-0000000001${++this.equipmentSeq}`.slice(0, 36),
      ...row,
      created_at: now,
      updated_at: now,
    };
    this.equipment.push(profile);
    return { data: profile, error: null };
  }

  async findEquipmentForOwner(id: string, ownerId: string) {
    return {
      data:
        this.equipment.find(
          (profile) => profile.id === id && profile.owner_id === ownerId,
        ) ?? null,
      error: null,
    };
  }

  async updateEquipment(
    id: string,
    ownerId: string,
    row: Partial<Omit<EquipmentProfileRow, "id" | "owner_id" | "created_at" | "equipment_aliases" | "gym_profiles">>,
  ) {
    const index = this.equipment.findIndex(
      (profile) => profile.id === id && profile.owner_id === ownerId,
    );
    if (index < 0) return { data: null, error: null };
    this.equipment[index] = { ...this.equipment[index], ...row };
    return { data: this.equipment[index], error: null };
  }

  async deleteEquipment(id: string, ownerId: string) {
    const index = this.equipment.findIndex(
      (profile) => profile.id === id && profile.owner_id === ownerId,
    );
    if (index < 0) return { data: null, error: null };
    this.equipment.splice(index, 1);
    for (const [setId, set] of this.trainingSets) {
      if (set.equipmentProfileId === id) {
        this.trainingSets.set(setId, { ...set, equipmentProfileId: null });
      }
    }
    return { data: { id }, error: null };
  }

  async createAlias(row: Omit<EquipmentAliasRow, "id" | "created_at" | "equipment_profiles">) {
    this.calls.createAlias += 1;
    if (this.aliasCreateError) return { data: null, error: this.aliasCreateError };
    const duplicate = this.aliases.some(
      (alias) =>
        alias.equipment_profile_id === row.equipment_profile_id &&
        alias.normalized_alias === row.normalized_alias,
    );
    if (duplicate) return { data: null, error: new Error("duplicate alias") };

    const alias: EquipmentAliasRow = {
      id: `10000000-0000-4000-8000-0000000003${++this.aliasSeq}`.slice(0, 36),
      ...row,
      created_at: "2026-07-11T08:00:00.000Z",
    };
    this.aliases.push(alias);
    return { data: alias, error: null };
  }

  async deleteAlias(id: string, ownerId: string) {
    const index = this.aliases.findIndex(
      (alias) => alias.id === id && alias.owner_id === ownerId,
    );
    if (index < 0) return { data: null, error: null };
    this.aliases.splice(index, 1);
    return { data: { id }, error: null };
  }

  async resolveAlias(ownerId: string, normalizedAlias: string, gymProfileId: string | null) {
    return {
      data: this.aliases
        .filter((alias) => alias.owner_id === ownerId && alias.normalized_alias === normalizedAlias)
        .map((alias) => ({
          ...alias,
          equipment_profiles:
            (() => {
              const profile = this.equipment.find(
                (item) =>
                  item.id === alias.equipment_profile_id &&
                  (!gymProfileId || item.gym_profile_id === gymProfileId),
              );
              return profile
                ? {
                    ...profile,
                    gym_profiles:
                      this.gyms.find((gym) => gym.id === profile.gym_profile_id) ?? null,
                  }
                : null;
            })(),
        }))
        .filter((alias) => alias.equipment_profiles),
      error: null,
    };
  }

  async listLegacyCandidates() {
    return { data: [], error: null };
  }

  async linkTrainingSetsToEquipmentProfile(equipmentProfileId: string, trainingSetIds: string[]) {
    this.calls.linkTrainingSets += 1;
    const profile = this.equipment.find((item) => item.id === equipmentProfileId);
    if (!profile) return { data: null, error: new Error("EQUIPMENT_PROFILE_NOT_FOUND") };

    const invalid = trainingSetIds.some((id) => {
      const set = this.trainingSets.get(id);
      return !set || set.ownerId !== profile.owner_id;
    });
    if (invalid) return { data: null, error: new Error("TRAINING_SET_NOT_FOUND") };

    for (const id of trainingSetIds) {
      const set = this.trainingSets.get(id);
      if (set) this.trainingSets.set(id, { ...set, equipmentProfileId });
    }

    return { data: trainingSetIds.length, error: null };
  }
}

function depsFor(
  store: MemoryEquipmentStore,
  userId: string | null = "user-1",
  configured = true,
): EquipmentApiDeps {
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
  return (await response.json()) as { data?: T; error?: { code?: string } };
}

function gymRow(id: string, ownerId = "user-1"): GymProfileRow {
  return {
    id,
    owner_id: ownerId,
    name: "Gym A",
    normalized_name: "gym a",
    branch_name: null,
    normalized_branch_name: null,
    location_text: null,
    created_at: "2026-07-11T08:00:00.000Z",
    updated_at: "2026-07-11T08:00:00.000Z",
  };
}

function equipmentRow(
  id: string,
  ownerId = "user-1",
  gymProfileId: string | null = gymAId,
): EquipmentProfileRow {
  return {
    id,
    owner_id: ownerId,
    gym_profile_id: gymProfileId,
    canonical_name: "Hammer Strength ILWPD",
    normalized_name: "hammer strength ilwpd",
    brand: "Hammer Strength",
    model: "ILWPD",
    default_movement_name: "高位下拉",
    default_laterality: "unilateral",
    default_weight_basis: "per_side",
    seat_setting: null,
    pad_setting: null,
    handle_setting: null,
    notes: null,
    created_at: "2026-07-11T08:00:00.000Z",
    updated_at: "2026-07-11T08:00:00.000Z",
  };
}

test("equipment label normalization is conservative and keeps distinct machines apart", () => {
  const mismatches = equipmentNormalizationCases.filter(
    ({ input, expected }) => normalizeEquipmentLabel(input) !== expected,
  );

  assert.deepEqual(mismatches, []);
  assert.equal(normalizeEquipmentLabel("A\tB\nC"), "a b c");
  assert.notEqual(normalizeEquipmentLabel("ILWPD"), normalizeEquipmentLabel("ILCR"));
  assert.notEqual(normalizeEquipmentLabel("ILWPD"), normalizeEquipmentLabel("D.Y. Row"));
});

test("equipment APIs reject unauthenticated requests", async () => {
  const store = new MemoryEquipmentStore();
  const response = await handleListGyms(
    new Request("http://127.0.0.1/api/gyms"),
    depsFor(store, null),
  );

  assert.equal(response.status, 401);
});

test("gym and equipment creation use session owner and ignore owner fields", async () => {
  const store = new MemoryEquipmentStore();
  store.gyms.push(gymRow(gymAId));

  const gymResponse = await handleCreateGym(
    jsonRequest("/api/gyms", {
      name: "  Ｇｙｍ A  ",
      owner_id: "user-2",
      user_id: "user-2",
    }),
    depsFor(store, "user-1"),
  );
  const equipmentResponse = await handleCreateEquipment(
    jsonRequest("/api/equipment-profiles", {
      gymProfileId: gymAId,
      canonicalName: " Hammer Strength ILWPD ",
      brand: "Hammer Strength",
      model: "ILWPD",
      owner_id: "user-2",
    }),
    depsFor(store, "user-1"),
  );

  assert.equal(gymResponse.status, 422);
  assert.equal(equipmentResponse.status, 422);
  assert.equal(store.calls.createGym, 0);
  assert.equal(store.calls.createEquipment, 0);
});

test("equipment can only be created inside own gym", async () => {
  const store = new MemoryEquipmentStore();
  store.gyms.push(gymRow(gymBId, "user-2"));

  const response = await handleCreateEquipment(
    jsonRequest("/api/equipment-profiles", {
      gymProfileId: gymBId,
      canonicalName: "Hammer Strength ILWPD",
    }),
    depsFor(store, "user-1"),
  );

  assert.equal(response.status, 404);
  assert.equal(store.calls.createEquipment, 0);
});

test("list endpoints only return the current user's resources", async () => {
  const store = new MemoryEquipmentStore();
  store.gyms.push(gymRow(gymAId, "user-1"), gymRow(gymBId, "user-2"));
  store.equipment.push(equipmentRow(equipmentAId, "user-1"), equipmentRow(equipmentBId, "user-2"));

  const gyms = await handleListGyms(
    new Request("http://127.0.0.1/api/gyms"),
    depsFor(store, "user-1"),
  );
  const equipment = await handleListEquipment(
    new Request("http://127.0.0.1/api/equipment-profiles"),
    depsFor(store, "user-1"),
  );
  const gymBody = await responseJson<{ gyms: Array<{ ownerId: string }> }>(gyms);
  const equipmentBody = await responseJson<{
    equipmentProfiles: Array<{ ownerId: string }>;
  }>(equipment);

  assert.equal(gymBody.data?.gyms.length, 1);
  assert.equal(gymBody.data?.gyms[0].ownerId, "user-1");
  assert.equal(equipmentBody.data?.equipmentProfiles.length, 1);
  assert.equal(equipmentBody.data?.equipmentProfiles[0].ownerId, "user-1");
});

test("gym update and delete return committed owner-scoped state", async () => {
  const store = new MemoryEquipmentStore();
  store.gyms.push(gymRow(gymAId));
  store.equipment.push(equipmentRow(equipmentAId, "user-1", gymAId));

  const updated = await handleUpdateGym(
    jsonRequest(
      `/api/gyms/${gymAId}`,
      { name: "Edited Gym", branchName: "North", locationText: "Floor 2" },
      "PATCH",
    ),
    gymAId,
    depsFor(store, "user-1"),
  );
  const deleted = await handleDeleteGym(gymAId, depsFor(store, "user-1"));

  assert.equal(updated.status, 200);
  assert.equal(store.gyms.length, 0);
  assert.equal(deleted.status, 200);
  assert.equal(store.equipment[0].gym_profile_id, null);
});

test("equipment update can clear optional defaults and delete preserves set snapshots", async () => {
  const store = new MemoryEquipmentStore();
  store.gyms.push(gymRow(gymAId));
  store.equipment.push(equipmentRow(equipmentAId, "user-1", gymAId));
  store.trainingSets.set(setAId, {
    ...trainingSetState(),
    equipmentProfileId: equipmentAId,
  });

  const updated = await handleUpdateEquipment(
    jsonRequest(
      `/api/equipment-profiles/${equipmentAId}`,
      {
        canonicalName: "Edited Machine",
        gymProfileId: null,
        defaultLaterality: null,
        defaultWeightBasis: null,
      },
      "PATCH",
    ),
    equipmentAId,
    depsFor(store, "user-1"),
  );
  const snapshotBeforeDelete = structuredClone(store.trainingSets.get(setAId));
  const deleted = await handleDeleteEquipment(
    equipmentAId,
    depsFor(store, "user-1"),
  );

  assert.equal(updated.status, 200);
  assert.equal(deleted.status, 200);
  assert.equal(store.trainingSets.get(setAId)?.equipmentProfileId, null);
  assert.deepEqual(
    {
      equipmentName: store.trainingSets.get(setAId)?.equipmentName,
      equipmentBrand: store.trainingSets.get(setAId)?.equipmentBrand,
      equipmentModel: store.trainingSets.get(setAId)?.equipmentModel,
    },
    {
      equipmentName: snapshotBeforeDelete?.equipmentName,
      equipmentBrand: snapshotBeforeDelete?.equipmentBrand,
      equipmentModel: snapshotBeforeDelete?.equipmentModel,
    },
  );
});

test("alias delete is owner scoped and does not affect another profile alias", async () => {
  const store = new MemoryEquipmentStore();
  store.equipment.push(
    equipmentRow(equipmentAId, "user-1", gymAId),
    equipmentRow(equipmentBId, "user-1", gymBId),
  );
  const first = await handleCreateEquipmentAlias(
    jsonRequest(`/api/equipment-profiles/${equipmentAId}/aliases`, { alias: "PRESS" }),
    equipmentAId,
    depsFor(store, "user-1"),
  );
  await handleCreateEquipmentAlias(
    jsonRequest(`/api/equipment-profiles/${equipmentBId}/aliases`, { alias: "PRESS" }),
    equipmentBId,
    depsFor(store, "user-1"),
  );
  const firstBody = await responseJson<{ alias: { id: string } }>(first);
  const deleted = await handleDeleteEquipmentAlias(
    firstBody.data?.alias.id ?? "",
    depsFor(store, "user-1"),
  );

  assert.equal(deleted.status, 200);
  assert.equal(store.aliases.length, 1);
  assert.equal(store.aliases[0].equipment_profile_id, equipmentBId);
});

test("alias uniqueness is scoped to a profile and resolver reports ambiguity", async () => {
  const store = new MemoryEquipmentStore();
  store.gyms.push(gymRow(gymAId), gymRow(gymBId));
  store.equipment.push(
    equipmentRow(equipmentAId, "user-1", gymAId),
    equipmentRow(equipmentBId, "user-1", gymBId),
  );

  const aliasA = await handleCreateEquipmentAlias(
    jsonRequest(`/api/equipment-profiles/${equipmentAId}/aliases`, { alias: " ILWPD " }),
    equipmentAId,
    depsFor(store, "user-1"),
  );
  const duplicateAlias = await handleCreateEquipmentAlias(
    jsonRequest(`/api/equipment-profiles/${equipmentAId}/aliases`, { alias: "ＩＬＷＰＤ" }),
    equipmentAId,
    depsFor(store, "user-1"),
  );
  const aliasB = await handleCreateEquipmentAlias(
    jsonRequest(`/api/equipment-profiles/${equipmentBId}/aliases`, { alias: "ilwpd" }),
    equipmentBId,
    depsFor(store, "user-1"),
  );
  const resolved = await handleResolveEquipmentProfile(
    new Request("http://127.0.0.1/api/equipment-profiles/resolve?alias=ILWPD"),
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{
    result: {
      ambiguous: boolean;
      candidates: Array<{ gym?: { id: string } | null }>;
      match: unknown | null;
    };
  }>(resolved);

  assert.equal(aliasA.status, 201);
  assert.equal(duplicateAlias.status, 409);
  assert.equal(aliasB.status, 201);
  assert.equal(body.data?.result.ambiguous, true);
  assert.equal(body.data?.result.match, null);
  assert.equal(body.data?.result.candidates.length, 2);
  assert.deepEqual(
    body.data?.result.candidates.map((candidate) => candidate.gym?.id).sort(),
    [gymAId, gymBId],
  );
});

test("alias insert cannot target another user's equipment profile", async () => {
  const store = new MemoryEquipmentStore();
  store.equipment.push(equipmentRow(equipmentAId, "user-2", gymAId));

  const response = await handleCreateEquipmentAlias(
    jsonRequest(`/api/equipment-profiles/${equipmentAId}/aliases`, { alias: "ILWPD" }),
    equipmentAId,
    depsFor(store, "user-1"),
  );

  assert.equal(response.status, 404);
  assert.equal(store.calls.createAlias, 0);
});

test("PostgREST unique violations return a fixed duplicate alias error", async () => {
  const store = new MemoryEquipmentStore();
  store.equipment.push(equipmentRow(equipmentAId, "user-1", gymAId));
  store.aliasCreateError = {
    code: "23505",
    message: "duplicate key value violates unique constraint",
    details: "private database detail",
  };

  const response = await handleCreateEquipmentAlias(
    jsonRequest(`/api/equipment-profiles/${equipmentAId}/aliases`, { alias: "PRESS" }),
    equipmentAId,
    depsFor(store, "user-1"),
  );
  const body = await responseJson<never>(response) as {
    error?: { code?: string; message?: string; details?: unknown };
  };

  assert.equal(response.status, 409);
  assert.equal(body.error?.code, "VALIDATION_ERROR");
  assert.equal(body.error?.message, "同一器材已有相同別名。");
  assert.equal(body.error?.details, undefined);
});

test("manual link succeeds atomically only for own selected sets", async () => {
  const store = new MemoryEquipmentStore();
  store.equipment.push(equipmentRow(equipmentAId, "user-1", gymAId));
  store.trainingSets.set(setAId, trainingSetState("user-1"));
  store.trainingSets.set(setBId, trainingSetState("user-2"));

  const invalid = await handleLinkTrainingSetsToEquipment(
    jsonRequest(`/api/equipment-profiles/${equipmentAId}/link-training-sets`, {
      trainingSetIds: [setAId, setBId],
    }),
    equipmentAId,
    depsFor(store, "user-1"),
  );

  assert.equal(invalid.status, 404);
  assert.equal(store.trainingSets.get(setAId)?.equipmentProfileId, null);

  const valid = await handleLinkTrainingSetsToEquipment(
    jsonRequest(`/api/equipment-profiles/${equipmentAId}/link-training-sets`, {
      trainingSetIds: [setAId],
    }),
    equipmentAId,
    depsFor(store, "user-1"),
  );

  assert.equal(valid.status, 200);
  assert.equal(store.trainingSets.get(setAId)?.equipmentProfileId, equipmentAId);
});

test("manual link rejects invalid raw batch shapes before calling the store", async () => {
  const store = new MemoryEquipmentStore();
  store.equipment.push(equipmentRow(equipmentAId, "user-1", gymAId));
  const oneHundredOneIds = Array.from({ length: 101 }, (_, index) => generatedSetId(index + 1));
  const cases = [
    [],
    oneHundredOneIds,
    Array.from({ length: 101 }, () => setAId),
    [setAId, setAId],
  ];

  for (const trainingSetIds of cases) {
    const response = await handleLinkTrainingSetsToEquipment(
      jsonRequest(`/api/equipment-profiles/${equipmentAId}/link-training-sets`, {
        trainingSetIds,
      }),
      equipmentAId,
      depsFor(store, "user-1"),
    );
    assert.equal(response.status, 422);
  }

  assert.equal(store.calls.linkTrainingSets, 0);
});

test("manual link accepts exactly 100 owned sets and preserves snapshots", async () => {
  const store = new MemoryEquipmentStore();
  store.equipment.push(equipmentRow(equipmentAId, "user-1", gymAId));
  const trainingSetIds = Array.from({ length: 100 }, (_, index) => generatedSetId(index + 1));
  for (const id of trainingSetIds) store.trainingSets.set(id, trainingSetState());
  const snapshotBefore = structuredClone(store.trainingSets.get(trainingSetIds[0]));

  const response = await handleLinkTrainingSetsToEquipment(
    jsonRequest(`/api/equipment-profiles/${equipmentAId}/link-training-sets`, {
      trainingSetIds,
    }),
    equipmentAId,
    depsFor(store, "user-1"),
  );
  const body = await responseJson<{ linkedCount: number }>(response);

  assert.equal(response.status, 200);
  assert.equal(body.data?.linkedCount, 100);
  assert.ok(trainingSetIds.every((id) => store.trainingSets.get(id)?.equipmentProfileId === equipmentAId));
  assert.deepEqual(
    {
      equipmentName: store.trainingSets.get(trainingSetIds[0])?.equipmentName,
      equipmentBrand: store.trainingSets.get(trainingSetIds[0])?.equipmentBrand,
      equipmentModel: store.trainingSets.get(trainingSetIds[0])?.equipmentModel,
    },
    {
      equipmentName: snapshotBefore?.equipmentName,
      equipmentBrand: snapshotBefore?.equipmentBrand,
      equipmentModel: snapshotBefore?.equipmentModel,
    },
  );
});

test("manual link mixes neither missing nor other-owner sets into a partial update", async () => {
  const store = new MemoryEquipmentStore();
  store.equipment.push(equipmentRow(equipmentAId, "user-1", gymAId));
  store.trainingSets.set(setAId, trainingSetState("user-1"));
  store.trainingSets.set(setBId, trainingSetState("user-2"));
  const missingSetId = generatedSetId(999);

  for (const invalidId of [missingSetId, setBId]) {
    const response = await handleLinkTrainingSetsToEquipment(
      jsonRequest(`/api/equipment-profiles/${equipmentAId}/link-training-sets`, {
        trainingSetIds: [setAId, invalidId],
      }),
      equipmentAId,
      depsFor(store, "user-1"),
    );

    assert.equal(response.status, 404);
    assert.equal(store.trainingSets.get(setAId)?.equipmentProfileId, null);
  }
});

test("demo mode returns persisted false and does not call write methods", async () => {
  const store = new MemoryEquipmentStore();
  const gym = await handleCreateGym(
    jsonRequest("/api/gyms", { name: "Demo Gym" }),
    depsFor(store, "demo-user", false),
  );
  const equipment = await handleCreateEquipment(
    jsonRequest("/api/equipment-profiles", { canonicalName: "Demo Equipment" }),
    depsFor(store, "demo-user", false),
  );
  const gymBody = await responseJson<{ persisted: boolean }>(gym);
  const equipmentBody = await responseJson<{ persisted: boolean }>(equipment);

  assert.equal(gym.status, 202);
  assert.equal(equipment.status, 202);
  assert.equal(gymBody.data?.persisted, false);
  assert.equal(equipmentBody.data?.persisted, false);
  assert.equal(store.calls.createGym, 0);
  assert.equal(store.calls.createEquipment, 0);
});

test("alias builder derives normalized alias from server-side normalization", () => {
  const alias = buildAliasInsert({ alias: " ＩＬＷＰＤ " }, "user-1", equipmentAId);
  assert.equal(alias.normalized_alias, "ilwpd");
  assert.equal(alias.owner_id, "user-1");
});
