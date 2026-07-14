import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sanitizeRedirectTo } from "../src/lib/auth-redirect";
import { getAppMode } from "../src/lib/app-mode";
import { generateText, getAiProviderName } from "../src/lib/ai/provider";
import { sanitizePublicError } from "../src/lib/public-errors";
import {
  createClient,
  createSecretKeyClient,
  getEnvironmentStatus,
  hasSupabaseAdminCapability,
  hasSupabaseConfig,
  isDemoMode,
} from "../src/lib/supabase/server";
import { GET as getMealPhotos, POST as postMealPhotos } from "../src/app/api/meal-photos/route";
import { GET as getInbodyScans, POST as postInbodyScans } from "../src/app/api/inbody-scans/route";
import { POST as postHealthAssessments } from "../src/app/api/health-assessments/route";
import { POST as postFeedback } from "../src/app/api/feedback/route";
import { POST as postGlp1Log } from "../src/app/api/glp1-logs/route";
import { POST as postAppointment } from "../src/app/api/appointments/route";
import { POST as postGym } from "../src/app/api/gyms/route";
import { POST as postTrainingLog } from "../src/app/api/training-logs/route";
import { POST as postMealAnalysis } from "../src/app/api/meal-photos/analyze/route";
import { POST as postInbodyAnalysis } from "../src/app/api/inbody-scans/analyze/route";
import { POST as postTaskCompletion } from "../src/app/api/tasks/[taskId]/complete/route";
import { POST as postLegacyLink } from "../src/app/api/equipment-profiles/[id]/link-training-sets/route";

const envKeys = [
  "APP_MODE",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_DEMO_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_FALLBACK_MODEL",
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET",
  "SUPABASE_STORAGE_INBODY_SCANS_BUCKET",
] as const;

async function withEnv<T>(
  values: Partial<Record<(typeof envKeys)[number], string | undefined>>,
  run: () => Promise<T> | T,
) {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  try {
    for (const key of envKeys) {
      const value = values[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return await run();
  } finally {
    for (const key of envKeys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("APP_MODE=demo disables user and admin Supabase clients even when all keys exist", async () => {
  await withEnv(
    {
      APP_MODE: "demo",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
      SUPABASE_SECRET_KEY: "secret-test-key",
    },
    async () => {
      assert.equal(isDemoMode(), true);
      assert.equal(hasSupabaseConfig(), false);
      assert.equal(hasSupabaseAdminCapability(), false);
      assert.equal(createSecretKeyClient(), null);
      await assert.rejects(createClient());
    },
  );
});

test("demo write routes stay non-persistent even when Supabase credentials exist", async () => {
  await withEnv(
    {
      APP_MODE: "demo",
      AI_PROVIDER: "demo",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
      SUPABASE_SECRET_KEY: "secret-test-key",
    },
    async () => {
      const jsonRequest = (url: string, body: unknown) =>
        new Request(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });

      const mealForm = new FormData();
      mealForm.set("mealType", "lunch");
      mealForm.set("eatenAt", "2026-07-13T12:00:00.000Z");
      mealForm.set("mealPhoto", new Blob(["synthetic"], { type: "image/png" }), "synthetic.png");

      const inbodyForm = new FormData();
      inbodyForm.set("measuredAt", "2026-07-13T08:00:00.000Z");
      inbodyForm.set(
        "inbodyPhoto",
        new Blob(["synthetic"], { type: "image/png" }),
        "synthetic.png",
      );

      const responses = [
        await postFeedback(
          jsonRequest("http://localhost/api/feedback", {
            pagePath: "/dashboard",
            feedbackType: "idea",
            message: "Synthetic hardening feedback",
          }),
        ),
        await postGlp1Log(
          jsonRequest("http://localhost/api/glp1-logs", {
            medicationName: "OTHER",
            doseMg: 1,
            injectionDate: "2026-07-13",
          }),
        ),
        await postAppointment(
          jsonRequest("http://localhost/api/appointments", {
            reason: "Synthetic follow-up",
            preferredDate: "2026-07-14",
            preferredTimeSlot: "flexible",
          }),
        ),
        await postGym(
          jsonRequest("http://localhost/api/gyms", { name: "Synthetic Gym" }),
        ),
        await postTrainingLog(
          jsonRequest("http://localhost/api/training-logs", {
            activityType: "strength_training",
            intensity: "MEDIUM",
          }),
        ),
        await postMealAnalysis(
          new Request("http://localhost/api/meal-photos/analyze", {
            method: "POST",
            body: mealForm,
          }),
        ),
        await postInbodyAnalysis(
          new Request("http://localhost/api/inbody-scans/analyze", {
            method: "POST",
            body: inbodyForm,
          }),
        ),
        await postTaskCompletion(
          jsonRequest("http://localhost/api/tasks/demo-task/complete", {
            status: "completed",
          }),
          { params: Promise.resolve({ taskId: "demo-task" }) },
        ),
        await postLegacyLink(
          jsonRequest("http://localhost/api/equipment-profiles/profile/link-training-sets", {
            trainingSetIds: ["10000000-0000-4000-8000-000000000001"],
          }),
          { params: Promise.resolve({ id: "10000000-0000-4000-8000-000000000002" }) },
        ),
      ];

      for (const response of responses) {
        assert.ok(response.ok, `unexpected status ${response.status}`);
        const body = (await response.json()) as { data?: { persisted?: boolean } };
        assert.equal(body.data?.persisted, false);
      }
    },
  );
});

test("staging never falls back to demo when required Supabase env is missing", async () => {
  await withEnv({ APP_MODE: "staging" }, () => {
    assert.equal(isDemoMode(), false);
    assert.throws(() => hasSupabaseConfig(), /Supabase/i);
  });
});

test("deployment environment wins over the legacy public demo flag", () => {
  assert.equal(
    getAppMode({
      NEXT_PUBLIC_APP_ENV: "production",
      NEXT_PUBLIC_DEMO_MODE: "true",
    }),
    "production",
  );
  assert.equal(
    getAppMode({
      NODE_ENV: "production",
      NEXT_PUBLIC_DEMO_MODE: "true",
    }),
    "production",
  );
});

test("AI provider gate allows explicit demo only in demo and openai outside demo", async () => {
  await withEnv({ APP_MODE: "demo", AI_PROVIDER: "demo" }, async () => {
    assert.equal(getAiProviderName(), "demo");
    assert.equal(
      await generateText({
        promptType: "test",
        promptVersion: "1",
        systemPrompt: "system",
        input: "input",
      }),
      null,
    );
  });

  await withEnv({ APP_MODE: "staging", AI_PROVIDER: "openai" }, () => {
    assert.equal(getAiProviderName(), "openai");
  });

  for (const provider of ["anthropic", "gemini", "deepseek", "demo"]) {
    await withEnv({ APP_MODE: "staging", AI_PROVIDER: provider }, () => {
      assert.throws(() => getAiProviderName(), /unavailable/i);
    });
  }

  await withEnv(
    {
      APP_MODE: "staging",
      AI_PROVIDER: "unknown-provider",
      OPENAI_API_KEY: "openai-test-key",
      OPENAI_MODEL: "private-model",
    },
    () => {
      assert.equal(getEnvironmentStatus().aiProviderConfigured, false);
    },
  );
});

test("health status keeps admin optional and exposes booleans rather than env names", async () => {
  await withEnv(
    {
      APP_MODE: "staging",
      NEXT_PUBLIC_APP_URL: "https://staging.example.invalid",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "openai-test-key",
      OPENAI_MODEL: "private-primary-model",
      SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET: "meal-photos",
      SUPABASE_STORAGE_INBODY_SCANS_BUCKET: "inbody-scans",
    },
    () => {
      const status = getEnvironmentStatus() as unknown as Record<string, unknown>;
      assert.equal(status.status, "ok");
      assert.equal(status.supabaseAdminConfigured, false);
      assert.equal(status.aiProviderConfigured, true);
      assert.equal("missingRequiredEnv" in status, false);
      assert.equal("requiredEnvMissing" in status, false);
      assert.equal("aiProviderKeyEnv" in status, false);
      assert.equal(JSON.stringify(status).includes("private-primary-model"), false);
      assert.equal(JSON.stringify(status).includes("SUPABASE_SECRET_KEY"), false);
    },
  );
});

test("redirect target only accepts decoded same-site relative paths", () => {
  assert.equal(sanitizeRedirectTo("/training?tab=history"), "/training?tab=history");
  assert.equal(sanitizeRedirectTo("%2Ftraining%3Ftab%3Dhistory"), "/training?tab=history");

  for (const unsafe of [
    "https://evil.example/path",
    "//evil.example/path",
    "javascript:alert(1)",
    "%2F%2Fevil.example/path",
    "%252F%252Fevil.example/path",
    "/%5Cevil.example/path",
  ]) {
    assert.equal(sanitizeRedirectTo(unsafe), "/dashboard");
  }
});

test("public errors map legacy failures to fixed codes and discard private details", () => {
  const error = sanitizePublicError({
    code: "SERVER_ERROR",
    message: "duplicate key violates rls_policy at C:/private/file.ts using model-secret",
    details: { hint: "select * from private_table", image: "data:image/png;base64,secret" },
  });

  assert.deepEqual(error, {
    code: "INTERNAL_ERROR",
    message: "服務暫時無法使用，請稍後再試。",
  });
});

test("retired skeleton endpoints always return 410 without fake acceptance", async () => {
  const responses = [
    await getMealPhotos(),
    await postMealPhotos(),
    await getInbodyScans(),
    await postInbodyScans(),
    await postHealthAssessments(),
  ];

  for (const response of responses) {
    assert.equal(response.status, 410);
    assert.deepEqual(await response.json(), {
      error: {
        code: "ENDPOINT_RETIRED",
        message: "This endpoint is no longer available.",
      },
    });
  }
});

test("service worker only caches public immutable assets and supports logout purge", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

  assert.match(sw, /static-v9/);
  assert.match(sw, /PURGE_APP_CACHE/);
  assert.match(sw, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw, /pathname\.startsWith\("\/_next\/static\/"\)/);
  assert.doesNotMatch(sw, /CACHEABLE_PAGES/);
  assert.doesNotMatch(sw, /PAGE_CACHE/);
  assert.doesNotMatch(sw, /cache\.put\(request[\s\S]*isHtmlResponse/);
  assert.doesNotMatch(sw, /"\/dashboard"|"\/nutrition"|"\/inbody"/);
});

test("logout uses browser auth and the current Supabase cookie adapter", () => {
  const form = readFileSync(
    new URL("../src/components/secure-sign-out-form.tsx", import.meta.url),
    "utf8",
  );
  const server = readFileSync(
    new URL("../src/lib/supabase/server.ts", import.meta.url),
    "utf8",
  );
  const middleware = readFileSync(
    new URL("../middleware.ts", import.meta.url),
    "utf8",
  );

  assert.match(form, /performSecureSignOut/);
  assert.match(form, /hasBrowserSupabaseConfig/);
  assert.match(form, /supabase\.auth\.signOut\(\{ scope \}\)/);
  assert.doesNotMatch(form, /signOutAction/);
  assert.match(server, /getAll\(\)/);
  assert.match(server, /setAll\(cookiesToSet\)/);
  assert.match(middleware, /getAll\(\)/);
  assert.match(middleware, /setAll\(cookiesToSet, headers\)/);
});
