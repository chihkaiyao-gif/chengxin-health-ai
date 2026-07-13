#!/usr/bin/env node

const baseUrl =
  process.env.VERIFY_STAGING_BASE_URL ||
  process.env.STAGING_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3001";

const timeoutMs = Number(process.env.VERIFY_STAGING_TIMEOUT_MS || 15000);
const parsedBaseUrl = new URL(baseUrl);
const isLocalTarget = ["localhost", "127.0.0.1", "::1"].includes(
  parsedBaseUrl.hostname,
);
const strict =
  process.env.VERIFY_STAGING_STRICT === "true" ||
  (!isLocalTarget && process.env.VERIFY_STAGING_STRICT !== "false");

const pageChecks = [
  "/dashboard",
  "/nutrition",
  "/inbody",
  "/medications",
  "/clinic/dashboard",
];

function urlFor(path) {
  return new URL(path, baseUrl).toString();
}

function summarize(body) {
  return body.replace(/\s+/g, " ").trim().slice(0, 180);
}

async function fetchWithTimeout(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(urlFor(path), {
      redirect: "follow",
      ...init,
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      response,
      body,
      contentType: response.headers.get("content-type") || "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getHealthPayload(json) {
  return json?.data && typeof json.data === "object" ? json.data : json;
}

async function checkHealth() {
  const { response, body, contentType } = await fetchWithTimeout("/api/health");
  if (response.status !== 200) {
    return {
      ok: false,
      name: "/api/health",
      detail: `HTTP ${response.status}: ${summarize(body)}`,
    };
  }
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      name: "/api/health",
      detail: `expected JSON, got ${contentType || "unknown content-type"}`,
    };
  }

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    return {
      ok: false,
      name: "/api/health",
      detail: "response was not valid JSON",
    };
  }

  const payload = getHealthPayload(json);
  const requiredKeys = [
    "environment",
    "demoMode",
    "supabaseConfigured",
    "supabasePublishableKeyConfigured",
    "supabaseAdminConfigured",
    "aiProviderConfigured",
    "openaiModelConfigured",
    "storageBucketsConfigured",
    "requiredConfigurationMissing",
  ];
  for (const key of requiredKeys) {
    if (!(key in payload)) {
      return {
        ok: false,
        name: "/api/health",
        detail: `missing health field: ${key}`,
      };
    }
  }

  if (strict) {
    const blockers = [];
    if (payload.status !== "ok") {
      blockers.push(`status is ${payload.status || "missing"}`);
    }
    if (payload.demoMode !== false) {
      blockers.push("demoMode must be false for staging");
    }
    if (payload.supabaseConfigured !== true) {
      blockers.push("Supabase is not configured");
    }
    if (payload.supabasePublishableKeyConfigured !== true) {
      blockers.push("Supabase publishable key is not configured");
    }
    if (payload.aiProviderConfigured !== true) {
      blockers.push("AI provider is not configured");
    }
    if (payload.openaiModelConfigured !== true) {
      blockers.push("OpenAI model is not configured");
    }
    if (payload.storageBucketsConfigured !== true) {
      blockers.push("storage buckets are not configured");
    }
    if (payload.requiredConfigurationMissing !== false) {
      blockers.push("required configuration is missing");
    }
    if (blockers.length > 0) {
      return {
        ok: false,
        name: "/api/health",
        detail: blockers.join("; "),
      };
    }
  }

  const mode = strict ? "strict staging" : "local compatibility";
  return {
    ok: true,
    name: "/api/health",
    detail: `${response.status}, ${mode} mode, demoMode=${payload.demoMode}`,
  };
}

async function checkPage(path) {
  const { response, body, contentType } = await fetchWithTimeout(path);
  if (response.status !== 200) {
    return {
      ok: false,
      name: path,
      detail: `HTTP ${response.status}: ${summarize(body)}`,
    };
  }
  if (!contentType.includes("text/html")) {
    return {
      ok: false,
      name: path,
      detail: `expected HTML, got ${contentType || "unknown content-type"}`,
    };
  }
  if (
    body.includes("Application error") ||
    body.includes("Unhandled Runtime Error") ||
    body.includes("NEXT_STATIC_GEN_BAILOUT")
  ) {
    return {
      ok: false,
      name: path,
      detail: `page rendered an error marker: ${summarize(body)}`,
    };
  }
  return {
    ok: true,
    name: path,
    detail: "200",
  };
}

console.log(`Staging verification base URL: ${baseUrl}`);
console.log(
  `Mode: ${strict ? "strict staging checks" : "local compatibility checks"}`,
);

const checks = [await checkHealth()];
for (const path of pageChecks) {
  checks.push(await checkPage(path));
}

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name} (${check.detail})`);
}

const failures = checks.filter((check) => !check.ok);

console.log("");
console.log(
  `Verify staging summary: ${checks.length - failures.length}/${checks.length} passed`,
);

if (failures.length > 0) {
  console.log("Failures:");
  for (const failure of failures) {
    console.log(`- ${failure.name}: ${failure.detail}`);
  }
  process.exit(1);
}
