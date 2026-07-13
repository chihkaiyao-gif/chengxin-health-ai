import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  appendById,
  applyEquipmentProfileDefaults,
  buildEquipmentResolverState,
  confirmEquipmentResolverCandidate,
  createAsyncActionLock,
  removeById,
  replaceById,
} from "../src/lib/equipment-profile-ui";
import type { EquipmentProfile } from "../src/lib/types";

const profileA: EquipmentProfile = {
  id: "10000000-0000-4000-8000-000000000001",
  ownerId: "user-1",
  gymProfileId: "20000000-0000-4000-8000-000000000001",
  canonicalName: "Machine A",
  normalizedName: "machine a",
  brand: "Brand A",
  model: "A1",
  defaultMovementName: "Chest Press",
  defaultLaterality: "bilateral",
  defaultWeightBasis: "per_side",
  seatSetting: "4",
  padSetting: "2",
  handleSetting: "neutral",
  notes: null,
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
  aliases: [],
  gym: null,
};

const profileB: EquipmentProfile = {
  ...profileA,
  id: "10000000-0000-4000-8000-000000000002",
  gymProfileId: "20000000-0000-4000-8000-000000000002",
  canonicalName: "Machine B",
  normalizedName: "machine b",
};

test("async action lock rejects a second request until the first finishes", async () => {
  const lock = createAsyncActionLock();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requestCount = 0;

  const first = lock.run(async () => {
    requestCount += 1;
    await pending;
    return "saved";
  });
  const second = await lock.run(async () => {
    requestCount += 1;
    return "duplicate";
  });

  assert.deepEqual(second, { started: false });
  assert.equal(requestCount, 1);
  release();
  assert.deepEqual(await first, { started: true, value: "saved" });
  assert.equal(lock.active, false);
});

test("successful CRUD helpers update lists immutably", () => {
  const original = [{ id: "a", name: "A" }];
  const appended = appendById(original, { id: "b", name: "B" });
  const replaced = replaceById(appended, { id: "a", name: "A edited" });
  const removed = removeById(replaced, "b");

  assert.deepEqual(original, [{ id: "a", name: "A" }]);
  assert.deepEqual(appended.map((item) => item.id), ["a", "b"]);
  assert.equal(replaced[0].name, "A edited");
  assert.deepEqual(removed, [{ id: "a", name: "A edited" }]);
  assert.notEqual(appended, original);
  assert.notEqual(replaced, appended);
  assert.notEqual(removed, replaced);
});

test("resolver never selects zero, single, or ambiguous candidates before confirmation", () => {
  const none = buildEquipmentResolverState({ match: null, candidates: [], ambiguous: false });
  const single = buildEquipmentResolverState({
    match: profileA,
    candidates: [profileA],
    ambiguous: false,
  });
  const ambiguous = buildEquipmentResolverState({
    match: null,
    candidates: [profileA, profileB],
    ambiguous: true,
  });

  assert.equal(none.status, "none");
  assert.equal(single.status, "single");
  assert.equal(ambiguous.status, "ambiguous");
  assert.equal(single.selectedEquipmentProfileId, null);
  assert.equal(ambiguous.selectedEquipmentProfileId, null);
  assert.equal(confirmEquipmentResolverCandidate(ambiguous, profileB.id).selectedEquipmentProfileId, profileB.id);
});

test("profile defaults are applied only by the explicit confirmation path", () => {
  const current = {
    equipmentProfileId: "",
    movementName: "User movement",
    equipmentBrand: "",
    equipmentName: "",
    equipmentModel: "",
    laterality: "unilateral" as const,
    side: "alternating" as const,
    weightBasis: "total" as const,
  };
  const unresolved = buildEquipmentResolverState({
    match: null,
    candidates: [profileA, profileB],
    ambiguous: true,
  });

  assert.equal(unresolved.selectedEquipmentProfileId, null);
  assert.deepEqual(current, {
    equipmentProfileId: "",
    movementName: "User movement",
    equipmentBrand: "",
    equipmentName: "",
    equipmentModel: "",
    laterality: "unilateral",
    side: "alternating",
    weightBasis: "total",
  });
  assert.deepEqual(applyEquipmentProfileDefaults(current, profileA), {
    equipmentProfileId: profileA.id,
    movementName: "Chest Press",
    equipmentBrand: "Brand A",
    equipmentName: "Machine A",
    equipmentModel: "A1",
    laterality: "bilateral",
    side: "both",
    weightBasis: "per_side",
  });
});

test("manager contract keeps form references, confirmations, loading locks, and local CRUD", async () => {
  const source = await readFile(
    new URL("../src/components/equipment-profile-manager.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const form = event\.currentTarget;/);
  assert.doesNotMatch(source, /event\.currentTarget\.reset\(\)/);
  assert.match(source, /method: "PATCH"/);
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /\/aliases/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /createAsyncActionLock/);
  assert.match(source, /setGyms\(\(current\) =>/);
  assert.match(source, /setEquipmentProfiles\(\(current\) =>/);
  assert.doesNotMatch(source, /\bmin-w-\[/);
});

test("training resolver contract fetches exact candidates and applies only on confirm", async () => {
  const source = await readFile(
    new URL("../src/components/training-log-workspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/api\/equipment-profiles\/resolve\?/);
  assert.match(source, /buildEquipmentResolverState/);
  assert.match(source, /confirmEquipmentResolverCandidate/);
  assert.match(source, /找不到相符器材/);
  assert.match(source, /請確認要使用的器材/);
  assert.match(source, /取消選擇/);
  assert.doesNotMatch(source, /\bmin-w-\[/);
});
