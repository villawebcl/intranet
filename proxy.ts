import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTE = "/login";
const DASHBOARD_ROUTE = "/dashboard";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboardRoute = request.nextUrl.pathname.startsWith(DASHBOARD_ROUTE);
  const isAuthRoute = request.nextUrl.pathname === AUTH_ROUTE;

  if (!user && isDashboardRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AUTH_ROUTE;
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = DASHBOARD_ROUTE;
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};
