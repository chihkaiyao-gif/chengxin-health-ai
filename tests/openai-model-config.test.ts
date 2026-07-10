import assert from "node:assert/strict";
import test from "node:test";
import {
  getOpenAiEnvStatus,
  getOpenAiModelConfig,
  getOpenAiReasoningEffort,
} from "../src/lib/ai/openai-model-config";

test("reads OpenAI model env and status without exposing model values", () => {
  const env = {
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "primary-model",
    OPENAI_FALLBACK_MODEL: "fallback-model",
    NEXT_PUBLIC_DEMO_MODE: "false",
  };

  assert.deepEqual(getOpenAiModelConfig(env), {
    primaryModel: "primary-model",
    fallbackModel: "fallback-model",
  });

  assert.deepEqual(getOpenAiEnvStatus(env), {
    openaiProvider: "openai",
    openaiProviderConfigured: true,
    openaiModelConfigured: true,
    openaiFallbackConfigured: true,
  });
});

test("fails clearly when production-like env lacks OPENAI_MODEL", () => {
  assert.throws(
    () =>
      getOpenAiModelConfig({
        OPENAI_API_KEY: "test-key",
        OPENAI_FALLBACK_MODEL: "fallback-model",
        NEXT_PUBLIC_DEMO_MODE: "false",
      }),
    /OPENAI_MODEL is required/,
  );
});

test("uses fallback model as demo-only primary when OPENAI_MODEL is absent", () => {
  assert.deepEqual(
    getOpenAiModelConfig({
      OPENAI_FALLBACK_MODEL: "fallback-model",
      NEXT_PUBLIC_DEMO_MODE: "true",
    }),
    {
      primaryModel: "fallback-model",
      fallbackModel: null,
    },
  );
});

test("uses task defaults and per-task env overrides for reasoning effort", () => {
  assert.equal(getOpenAiReasoningEffort("food", {}), "low");
  assert.equal(getOpenAiReasoningEffort("inbody", {}), "low");
  assert.equal(getOpenAiReasoningEffort("coach", {}), "medium");
  assert.equal(getOpenAiReasoningEffort("visit_report", {}), "medium");
  assert.equal(
    getOpenAiReasoningEffort("food", {
      OPENAI_REASONING_EFFORT_FOOD: "medium",
    }),
    "medium",
  );
});

test("rejects invalid reasoning effort values", () => {
  assert.throws(
    () =>
      getOpenAiReasoningEffort("coach", {
        OPENAI_REASONING_EFFORT_COACH: "turbo",
      }),
    /OPENAI_REASONING_EFFORT_COACH must be one of/,
  );
});
