import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
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
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
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
