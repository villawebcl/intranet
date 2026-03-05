import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTE = "/login";
const DASHBOARD_ROUTE = "/dashboard";
const API_ROUTE = "/api/";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  // The response must be recreated inside setAll so that updated session cookies
  // are forwarded to the browser. Using the original response object would lose
  // the cookies added by the Supabase client after it was constructed.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // MUST use getUser() — not getSession() — to validate the token server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /dashboard routes: redirect unauthenticated users to login.
  if (!user && pathname.startsWith(DASHBOARD_ROUTE)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AUTH_ROUTE;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect /api routes: return 401 instead of redirect.
  if (!user && pathname.startsWith(API_ROUTE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Avoid redirect loop: send authenticated users away from login page.
  if (user && pathname === AUTH_ROUTE) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = DASHBOARD_ROUTE;
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/api/:path*"],
};
