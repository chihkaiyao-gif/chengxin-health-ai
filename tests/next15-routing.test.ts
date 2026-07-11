import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET as getPilotReport } from "../src/app/api/clinic/pilot/[cohortId]/report/route";
import {
  buildLoginRedirectUrl,
  isProtectedPagePath,
  shouldRedirectToLogin,
} from "../middleware";

test("route handler accepts Promise params in Next 15", async () => {
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const response = await getPilotReport(new Request("http://127.0.0.1/api"), {
    params: Promise.resolve({ cohortId: "demo-pilot-14d" }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.totalMembers, 5);
});

test("protected page paths redirect through login while API routes stay API-owned", () => {
  assert.equal(isProtectedPagePath("/dashboard"), true);
  assert.equal(isProtectedPagePath("/clinic/patients"), true);
  assert.equal(isProtectedPagePath("/nutrition"), true);
  assert.equal(isProtectedPagePath("/api/food-logs/today"), false);
  assert.equal(isProtectedPagePath("/privacy"), false);
});

test("protected routes require a user session and allow an active session", () => {
  assert.equal(shouldRedirectToLogin(null, "/dashboard"), true);
  assert.equal(shouldRedirectToLogin({ id: "user_123" }, "/dashboard"), false);
  assert.equal(shouldRedirectToLogin(null, "/privacy"), false);
});

test("login redirect keeps the requested protected destination", () => {
  const request = new NextRequest("https://example.test/dashboard?tab=today");

  const redirectUrl = buildLoginRedirectUrl(request);

  assert.equal(redirectUrl.pathname, "/login");
  assert.equal(redirectUrl.searchParams.get("redirectTo"), "/dashboard?tab=today");
  assert.equal(
    redirectUrl.searchParams.get("message"),
    "請先登入後再使用健康管理功能。",
  );
});
