import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const rlsEnv = {
  url: process.env.SUPABASE_RLS_TEST_URL,
  anonKey: process.env.SUPABASE_RLS_TEST_ANON_KEY,
  userAEmail: process.env.SUPABASE_RLS_TEST_USER_A_EMAIL,
  userAPassword: process.env.SUPABASE_RLS_TEST_USER_A_PASSWORD,
  userBEmail: process.env.SUPABASE_RLS_TEST_USER_B_EMAIL,
  userBPassword: process.env.SUPABASE_RLS_TEST_USER_B_PASSWORD,
};

const hasRlsEnv = Object.values(rlsEnv).every(Boolean);
const isLocalOrExplicitlyAllowed =
  rlsEnv.url?.startsWith("http://127.0.0.1") ||
  rlsEnv.url?.startsWith("http://localhost") ||
  process.env.SUPABASE_RLS_TEST_ALLOW_NON_LOCAL === "true";

test(
  "training_sets RLS allows patient-owned CRUD and hides other users",
  {
    skip:
      hasRlsEnv && isLocalOrExplicitlyAllowed
        ? false
        : "Set SUPABASE_RLS_TEST_* env vars against a local or explicitly allowed test project.",
  },
  async () => {
    const clientA = createClient(rlsEnv.url!, rlsEnv.anonKey!);
    const clientB = createClient(rlsEnv.url!, rlsEnv.anonKey!);

    const signInA = await clientA.auth.signInWithPassword({
      email: rlsEnv.userAEmail!,
      password: rlsEnv.userAPassword!,
    });
    const signInB = await clientB.auth.signInWithPassword({
      email: rlsEnv.userBEmail!,
      password: rlsEnv.userBPassword!,
    });

    assert.ifError(signInA.error);
    assert.ifError(signInB.error);
    assert.ok(signInA.data.user?.id);
    assert.ok(signInB.data.user?.id);

    const sessionId = randomUUID();
    const setId = randomUUID();

    try {
      const sessionInsert = await clientA.from("training_logs").insert({
        id: sessionId,
        patient_id: signInA.data.user.id,
        trained_on: "2026-07-11",
        started_at: "2026-07-11T08:00:00+08:00",
        activity_type: "strength_training",
        duration_minutes: 45,
        intensity: "MEDIUM",
      });

      assert.ifError(sessionInsert.error);

      const setInsert = await clientA.from("training_sets").insert({
        id: setId,
        training_log_id: sessionId,
        exercise_order: 1,
        set_number: 1,
        movement_name: "Hammer Strength ILWPD",
        laterality: "unilateral",
        side: "alternating",
        weight_kg: 30,
        weight_basis: "per_side",
        reps: 12,
        set_type: "working",
        rpe: 8,
      });

      assert.ifError(setInsert.error);

      const ownRead = await clientA
        .from("training_sets")
        .select("id")
        .eq("id", setId);
      assert.ifError(ownRead.error);
      assert.equal(ownRead.data?.length, 1);

      const otherRead = await clientB
        .from("training_sets")
        .select("id")
        .eq("id", setId);
      assert.ifError(otherRead.error);
      assert.equal(otherRead.data?.length, 0);

      const otherUpdate = await clientB
        .from("training_sets")
        .update({ reps: 9 })
        .eq("id", setId)
        .select("id");
      assert.ifError(otherUpdate.error);
      assert.equal(otherUpdate.data?.length, 0);

      const ownUpdate = await clientA
        .from("training_sets")
        .update({ reps: 13 })
        .eq("id", setId)
        .select("id,reps");
      assert.ifError(ownUpdate.error);
      assert.equal(ownUpdate.data?.[0]?.reps, 13);
    } finally {
      await clientA.from("training_logs").delete().eq("id", sessionId);
      await clientA.auth.signOut();
      await clientB.auth.signOut();
    }
  },
);
