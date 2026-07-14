import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoModeEnv } from "@/lib/app-mode";
import {
  applySupabaseCookies,
  applySupabaseResponseHeaders,
} from "@/lib/supabase/cookie-adapter";

const protectedPagePrefixes = [
  "/dashboard",
  "/assessment",
  "/training",
  "/nutrition",
  "/inbody",
  "/medications",
  "/appointments",
  "/clinic",
];

export function isProtectedPagePath(pathname: string) {
  if (pathname.startsWith("/api/")) {
    return false;
  }

  return protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function buildLoginRedirectUrl(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("message", "請先登入後再使用健康管理功能。");
  loginUrl.searchParams.set(
    "redirectTo",
    `${redirectUrl.pathname}${redirectUrl.search}`,
  );

  return loginUrl;
}

export function shouldRedirectToLogin(user: unknown, pathname: string) {
  return !user && isProtectedPagePath(pathname);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (
    isDemoModeEnv() ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          applySupabaseCookies(request.cookies, cookiesToSet);
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          applySupabaseCookies(response.cookies, cookiesToSet);
          applySupabaseResponseHeaders(response.headers, headers);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (shouldRedirectToLogin(user, request.nextUrl.pathname)) {
    return NextResponse.redirect(buildLoginRedirectUrl(request));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js).*)",
  ],
};
