import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const allowedFeatures = (token as any)?.allowed_features || ["overview", "tiktok", "shopee", "ads", "analytics"];

    // Edge guards for feature-specific pages
    if (path.startsWith("/settings") && !allowedFeatures.includes("settings")) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }
    if ((path.startsWith("/debug-table") || path.startsWith("/debug-table-ikram")) && !allowedFeatures.includes("debug")) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }
    if (path.startsWith("/tiktok-shops") && !allowedFeatures.includes("tiktok")) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }
    if (path.startsWith("/shopee") && !allowedFeatures.includes("shopee")) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }
    if (path.startsWith("/ads") && !allowedFeatures.includes("ads")) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }
    if (path.startsWith("/analytics") && !allowedFeatures.includes("analytics")) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }
    if (path.startsWith("/refresh-token") && !allowedFeatures.includes("refresh_token")) {
      return NextResponse.rewrite(new URL("/unauthorized", req.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    }
  }
);

export const config = {
  // Protect everything except: auth routes, cron routes (use CRON_SECRET Bearer auth),
  // next internals, login page, unauthorized page, and public assets
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|login|unauthorized).*)"],
};
