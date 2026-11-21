import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const isPasswordSetup = request.nextUrl.pathname.startsWith("/change-password");

  if (!user && !isLogin) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    return NextResponse.redirect(destination);
  }
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("must_change_password").eq("id", user.id).maybeSingle();
    const mustChangePassword = profile?.must_change_password === true;
    if (mustChangePassword && !isPasswordSetup) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/change-password";
      return NextResponse.redirect(destination);
    }
    if (!mustChangePassword && isPasswordSetup) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/";
      return NextResponse.redirect(destination);
    }
    if (!mustChangePassword && isLogin) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/";
      return NextResponse.redirect(destination);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|sw.js).*)"]
};