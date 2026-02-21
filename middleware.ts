import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/", "/login", "/auth/callback", "/api/stripe/webhook"];

const AUTH_ONLY_ROUTES = ["/subscribe", "/api/stripe/checkout", "/api/stripe/portal"];

const SUBSCRIPTION_ROUTES = ["/chat", "/api/chat"];

function isPublic(pathname: string) {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.match(/\.(ico|png|svg|jpg|js|css|woff2?)$/)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    // Still refresh the session cookie on public routes
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { user, supabaseResponse, supabase } = await updateSession(request);

  // All non-public routes require auth
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if this route also requires an active subscription
  const needsSub = SUBSCRIPTION_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (needsSub) {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      const subscribeUrl = request.nextUrl.clone();
      subscribeUrl.pathname = "/subscribe";
      return NextResponse.redirect(subscribeUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/).*)",
  ],
};
