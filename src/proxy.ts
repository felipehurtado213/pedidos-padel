import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (antes "middleware" en Next ≤15). Corre ANTES de cada request a /admin:
 * 1) Refresca la sesión de Supabase y reescribe las cookies si el token se renovó.
 * 2) Si no hay sesión válida, redirige a /admin/login (chequeo rápido/optimista).
 *
 * La verificación de que el usuario es ADMIN se hace después, en el servidor
 * (layout, páginas y server actions vía requireAdmin) y en la base de datos (RLS + RPC).
 */
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
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // Cabeceras anti-caché que exige @supabase/ssr al escribir cookies de sesión.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // getClaims() valida la firma del JWT (no confía ciegamente en la cookie).
  // No poner código entre createServerClient y esta llamada.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  // El manifiesto no tiene datos privados y el navegador lo pide sin cookies.
  if (pathname === "/admin/manifest.webmanifest") return response;

  if (!isLoggedIn && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(url);
    // Conservar cookies que Supabase haya limpiado/renovado.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  // Solo el panel. La parte pública no lee cookies y queda cacheada.
  matcher: ["/admin/:path*"],
};
