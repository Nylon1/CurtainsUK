import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { consultationResumePath } from "@/lib/storefront/consultation-entry";
import { hasStagingReviewRole } from "@/lib/storefront/review-authz";
import { hasSupplierAdminRole } from "@/lib/supplier-intelligence/authz";

function privateAdminResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/admin/login";
  const reviewer = user && hasStagingReviewRole({ appMetadata: user.app_metadata,
    authUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, environment: process.env.VERCEL_ENV,
    anonymous: user.is_anonymous });
  const isCurtainsStaging = process.env.NEXT_PUBLIC_SUPABASE_URL === "https://hqysjumypgeapgmqkcrx.supabase.co"
    && process.env.VERCEL_ENV === "preview";
  if (isCurtainsStaging && !isLoginRoute && (user || pathname.startsWith("/api/admin/"))) {
    const reviewPath = pathname === "/admin/curtain-consultation" || /^\/api\/admin\/curtain-consultation(?:\/|$)/.test(pathname)
      || pathname === "/admin/daily-stock" || pathname === "/api/admin/daily-stock"
      || /^\/admin\/reviews(?:\/|$)/.test(pathname)
      || /^\/api\/admin\/reviews(?:\/|$)/.test(pathname)
      || /^\/api\/admin\/review-evidence\/[^/]+\/(access-token|download)$/.test(pathname);
    if (!user || user.is_anonymous || (!hasSupplierAdminRole(user.app_metadata) && !(reviewer && reviewPath))) {
      if (reviewer && (pathname === "/admin" || pathname === "/admin/")) {
        return privateAdminResponse(NextResponse.redirect(new URL("/admin/reviews", request.url)));
      }
      return privateAdminResponse(NextResponse.json({ error: user ? "STAFF_ROLE_REQUIRED" : "AUTHENTICATION_REQUIRED" }, { status: user ? 403 : 401 }));
    }
  }

  if (isAdminRoute && !isLoginRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return privateAdminResponse(NextResponse.redirect(loginUrl));
  }

  if (isLoginRoute && user) {
    const consultationPath = consultationResumePath(request.nextUrl.searchParams);
    if (consultationPath) return privateAdminResponse(NextResponse.redirect(new URL(consultationPath, request.url)));
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = reviewer ? "/admin/reviews" : "/admin";
    adminUrl.search = "";
    return privateAdminResponse(NextResponse.redirect(adminUrl));
  }

  return privateAdminResponse(response);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
