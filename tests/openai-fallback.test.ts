import assert from "node:assert/strict";
import test from "node:test";
import {
  OpenAiModelRequestError,
  runWithOpenAiModelFallback,
} from "../src/lib/ai/openai-fallback";

function apiError(input: {
  status?: number;
  code?: string;
  type?: string;
  message?: string;
  name?: string;
}) {
  return Object.assign(new Error(input.message || "OpenAI test error"), input);
}

test("primary success does not trigger fallback", async () => {
  const attempts: string[] = [];
  const result = await runWithOpenAiModelFallback({
    primaryModel: "primary-model",
    fallbackModel: "fallback-model",
    operation: async (model) => {
      attempts.push(model);
      return { ok: true };
    },
  });

  assert.deepEqual(attempts, ["primary-model"]);
  assert.deepEqual(result.data, { ok: true });
  assert.equal(result.metadata.primaryModelFailed, false);
  assert.equal(result.metadata.fallbackUsed, false);
});

test("retryable primary error triggers exactly one fallback model attempt", async () => {
  const attempts: string[] = [];
  const result = await runWithOpenAiModelFallback({
    primaryModel: "primary-model",
    fallbackModel: "fallback-model",
    operation: async (model) => {
      attempts.push(model);

      if (model === "primary-model") {
        throw apiError({
          status: 429,
          code: "rate_limit_exceeded",
          message: "rate limit",
        });
      }

      return { ok: true, model };
    },
  });

  assert.deepEqual(attempts, ["primary-model", "fallback-model"]);
  assert.equal(result.metadata.primaryModelFailed, true);
  assert.equal(result.metadata.fallbackAttempted, true);
  assert.equal(result.metadata.fallbackUsed, true);
  assert.equal(result.metadata.primaryError?.category, "rate_limited");
});

test("primary timeout triggers fallback once", async () => {
  const attempts: string[] = [];
  const result = await runWithOpenAiModelFallback({
    primaryModel: "primary-model",
    fallbackModel: "fallback-model",
    operation: async (model) => {
      attempts.push(model);

      if (model === "primary-model") {
        throw apiError({
          name: "APIConnectionTimeoutError",
          message: "request timed out",
        });
      }

      return { ok: true, model };
    },
  });

  assert.deepEqual(attempts, ["primary-model", "fallback-model"]);
  assert.deepEqual(result.data, { ok: true, model: "fallback-model" });
  assert.equal(result.metadata.primaryError?.category, "network_error");
  assert.equal(result.metadata.fallbackUsed, true);
});

test("fallback success returns one final result", async () => {
  const finalResults: Array<{ ok: true; model: string }> = [];
  const result = await runWithOpenAiModelFallback({
    primaryModel: "primary-model",
    fallbackModel: "fallback-model",
    operation: async (model) => {
      if (model === "primary-model") {
        throw apiError({
          status: 429,
          code: "rate_limit_exceeded",
          message: "rate limit",
        });
      }

      const finalResult = { ok: true as const, model };
      finalResults.push(finalResult);
      return finalResult;
    },
  });

  assert.deepEqual(finalResults, [{ ok: true, model: "fallback-model" }]);
  assert.deepEqual(result.data, finalResults[0]);
  assert.equal(result.metadata.fallbackUsed, true);
});

test("401, quota, and invalid request errors do not trigger fallback", async () => {
  const nonRetryableErrors = [
    apiError({ status: 401, message: "bad key" }),
    apiError({
      status: 429,
      code: "insufficient_quota",
      message: "billing quota",
    }),
    apiError({
      status: 400,
      type: "invalid_request_error",
      message: "invalid request",
    }),
  ];

  for (const error of nonRetryableErrors) {
    const attempts: string[] = [];

    await assert.rejects(
      runWithOpenAiModelFallback({
        primaryModel: "primary-model",
        fallbackModel: "fallback-model",
        operation: async (model) => {
          attempts.push(model);
          throw error;
        },
      }),
      OpenAiModelRequestError,
    );

    assert.deepEqual(attempts, ["primary-model"]);
  }
});

test("model_not_found triggers fallback", async () => {
  const attempts: string[] = [];
  const result = await runWithOpenAiModelFallback({
    primaryModel: "primary-model",
    fallbackModel: "fallback-model",
    operation: async (model) => {
      attempts.push(model);

      if (model === "primary-model") {
        throw apiError({
          status: 404,
          code: "model_not_found",
          message: "model_not_found",
        });
      }

      return { ok: true };
    },
  });

  assert.deepEqual(attempts, ["primary-model", "fallback-model"]);
  assert.equal(result.metadata.fallbackUsed, true);
  assert.equal(result.metadata.primaryError?.category, "model_unavailable");
});

test("fallback failure preserves safe context without leaking sensitive input", async () => {
  const sensitiveValues = [
    "patient-photo-base64-and-health-note",
    "data:image/jpeg;base64,AAAABBBBCCCCDDDDEEEEFFFF",
    "redacted-openai-test-key",
  ];

  await assert.rejects(
    async () => {
      await runWithOpenAiModelFallback({
        primaryModel: "primary-model",
        fallbackModel: "fallback-model",
        operation: async (model) => {
          if (model === "primary-model") {
            throw apiError({
              status: 500,
              message: `server failed with ${sensitiveValues.join(" ")}`,
            });
          }

          throw apiError({
            name: "APIConnectionTimeoutError",
            message: `timeout with ${sensitiveValues.join(" ")}`,
          });
        },
      });
    },
    (error) => {
      assert.ok(error instanceof OpenAiModelRequestError);
      assert.equal(error.safeContext.primaryError?.category, "server_error");
      assert.equal(error.safeContext.fallbackError?.category, "network_error");
      const serialized = JSON.stringify(error.safeContext);
      for (const sensitiveValue of sensitiveValues) {
        assert.equal(serialized.includes(sensitiveValue), false);
        assert.equal(error.message.includes(sensitiveValue), false);
      }
      return true;
    },
  );
});

test("request abort does not trigger fallback or wait indefinitely", async () => {
  const attempts: string[] = [];
  const startedAt = Date.now();

  await assert.rejects(
    runWithOpenAiModelFallback({
      primaryModel: "primary-model",
      fallbackModel: "fallback-model",
      operation: async (model) => {
        attempts.push(model);
        throw apiError({
          name: "AbortError",
          message: "The operation was aborted.",
        });
      },
    }),
    OpenAiModelRequestError,
  );

  assert.deepEqual(attempts, ["primary-model"]);
  assert.ok(Date.now() - startedAt < 1000);
});
