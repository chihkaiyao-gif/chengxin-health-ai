import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/health/route";

const envKeys = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_FALLBACK_MODEL",
  "NEXT_PUBLIC_DEMO_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
];

async function withEnv<T>(
  values: Record<string, string | undefined>,
  run: () => Promise<T>,
) {
  const previous = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]]),
  );

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("/api/health does not expose model names, API keys, or env values", async () => {
  await withEnv(
    {
      NEXT_PUBLIC_DEMO_MODE: "false",
      OPENAI_API_KEY: "redacted-openai-test-key-1234567890",
      OPENAI_MODEL: "primary-model-name-that-must-not-leak",
      OPENAI_FALLBACK_MODEL: "fallback-model-name-that-must-not-leak",
    },
    async () => {
      const response = await GET();
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.equal(body.includes("redacted-openai-test-key-1234567890"), false);
      assert.equal(body.includes("primary-model-name-that-must-not-leak"), false);
      assert.equal(body.includes("fallback-model-name-that-must-not-leak"), false);
      assert.equal(body.includes("OPENAI_API_KEY="), false);
    },
  );
});
