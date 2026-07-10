#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3001";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000);

const pageChecks = [
  "/",
  "/privacy",
  "/terms",
  "/medical-disclaimer",
  "/support",
  "/demo-tour",
  "/dashboard",
  "/assessment",
  "/training",
  "/nutrition",
  "/inbody",
  "/medications",
  "/appointments",
  "/clinic/dashboard",
  "/clinic/patients",
  "/clinic/appointments",
  "/clinic/reminders",
  "/clinic/pilot",
  "/clinic/pilot/demo-pilot-14d",
  "/clinic/audit-logs",
  "/clinic/billing",
  "/clinic/demo-checklist",
  "/clinic/feedback",
  "/clinic/team",
  "/clinic/settings",
].map((path) => ({
  name: `page ${path}`,
  path,
  allowedStatuses: [200],
  expectHtml: true,
}));

const assetChecks = [
  {
    name: "asset /manifest.webmanifest",
    path: "/manifest.webmanifest",
    allowedStatuses: [200],
  },
  {
    name: "asset /sw.js",
    path: "/sw.js",
    allowedStatuses: [200],
  },
];

const apiChecks = [
  "/api/food-logs/today",
  "/api/food-logs/history",
  "/api/inbody-records/latest",
  "/api/inbody-records/history",
  "/api/glp1-logs/latest",
  "/api/glp1-logs/history",
  "/api/glp1-side-effects/latest",
  "/api/appointments/me",
  "/api/reminders/me",
  "/api/tasks/today",
  "/api/streaks/me",
  "/api/badges/me",
  "/api/ai/coach-insight/today",
  "/api/ai/coach-insight/history",
  "/api/health",
  "/api/clinic/dashboard",
  "/api/clinic/patients",
  "/api/clinic/appointments",
  "/api/clinic/reminders",
  "/api/clinic/pilot",
  "/api/clinic/pilot/demo-pilot-14d/report",
  "/api/clinic/audit-logs",
  "/api/clinic/feedback",
  "/api/clinic/subscription",
].map((path) => ({
  name: `api ${path}`,
  path,
  allowedStatuses: [200, 202, 401, 403],
  expectJson: true,
}));

apiChecks.push({
  name: "api /api/engagement/recalculate",
  path: "/api/engagement/recalculate",
  method: "POST",
  allowedStatuses: [200, 401, 403],
  expectJson: true,
});

apiChecks.push({
  name: "api /api/feedback",
  path: "/api/feedback",
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    pagePath: "/demo-tour",
    feedbackType: "idea",
    message: "Smoke test demo feedback item.",
  }),
  allowedStatuses: [201, 202, 401, 403],
  expectJson: true,
});

apiChecks.push({
  name: "api /api/clinic/pilot",
  path: "/api/clinic/pilot",
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Smoke Test Pilot",
    startDate: "2026-07-10",
    endDate: "2026-07-23",
    status: "active",
    goal: "Smoke test pilot cohort creation.",
  }),
  allowedStatuses: [201, 202, 401, 403],
  expectJson: true,
});

apiChecks.push({
  name: "api /api/ai/coach-insight/generate",
  path: "/api/ai/coach-insight/generate",
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ force: true }),
  allowedStatuses: [201, 202, 401, 403],
  expectJson: true,
});

const checks = [...pageChecks, ...assetChecks, ...apiChecks];

function urlFor(path) {
  return new URL(path, baseUrl).toString();
}

function summarizeBody(body) {
  return body.replace(/\s+/g, " ").trim().slice(0, 140);
}

async function runCheck(check) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(urlFor(check.path), {
      method: check.method || "GET",
      headers: check.headers,
      body: check.body,
      signal: controller.signal,
      redirect: "follow",
    });
    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";

    if (!check.allowedStatuses.includes(response.status)) {
      return {
        ok: false,
        name: check.name,
        detail: `unexpected status ${response.status}: ${summarizeBody(body)}`,
      };
    }

    if (check.expectHtml && !contentType.includes("text/html")) {
      return {
        ok: false,
        name: check.name,
        detail: `expected HTML, got ${contentType || "unknown content-type"}`,
      };
    }

    if (
      check.expectHtml &&
      (body.includes("Application error") ||
        body.includes("Unhandled Runtime Error") ||
        body.includes("NEXT_STATIC_GEN_BAILOUT"))
    ) {
      return {
        ok: false,
        name: check.name,
        detail: `page rendered an error marker: ${summarizeBody(body)}`,
      };
    }

    if (check.expectJson && response.status < 300) {
      try {
        JSON.parse(body);
      } catch {
        return {
          ok: false,
          name: check.name,
          detail: `expected JSON, got ${contentType || "unknown content-type"}`,
        };
      }
    }

    const authGated =
      check.expectJson && (response.status === 401 || response.status === 403);
    return {
      ok: true,
      name: check.name,
      detail: authGated
        ? `${response.status} auth-gated`
        : `${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      name: check.name,
      detail:
        error instanceof Error
          ? error.message
          : "request failed with an unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

console.log(`Smoke test base URL: ${baseUrl}`);

const results = [];
for (const check of checks) {
  const result = await runCheck(check);
  results.push(result);
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name} (${result.detail})`);
}

const failures = results.filter((result) => !result.ok);

console.log("");
console.log(
  `Smoke summary: ${results.length - failures.length}/${results.length} passed`,
);

if (failures.length > 0) {
  console.log("Failures:");
  for (const failure of failures) {
    console.log(`- ${failure.name}: ${failure.detail}`);
  }
  process.exit(1);
}
