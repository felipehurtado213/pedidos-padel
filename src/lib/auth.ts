import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sesión + rol del usuario actual, verificado EN EL SERVIDOR.
 * - getClaims() valida el JWT de la cookie.
 * - El rol admin se consulta en la tabla public.admins (RLS: cada quien solo ve su fila).
 * cache(): se ejecuta una sola vez por request aunque lo llamen layout, página y acciones.
 */
export const getAdmin = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const email = (data?.claims?.email as string | undefined) ?? null;

  if (error || !userId) return { supabase, userId: null, email: null, isAdmin: false };

  const { data: row } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return { supabase, userId, email, isAdmin: Boolean(row) };
});

/** Para páginas y layouts del panel: redirige si no hay sesión de admin. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin.userId) redirect("/admin/login");
  if (!admin.isAdmin) redirect("/admin/login?error=no-admin");
  return admin;
}

/** Para server actions: devuelve el cliente si es admin, o null (la acción responde error). */
export async function adminClientOrNull() {
  const admin = await getAdmin();
  return admin.isAdmin ? admin.supabase : null;
}

/** Evita "open redirects": solo se permite volver a rutas internas del panel. */
export function safeAdminPath(next: unknown): string {
  return typeof next === "string" && /^\/admin(\/[\w\-/]*)?(\?[\w=&\-]*)?$/.test(next) && next !== "/admin/login"
    ? next
    : "/admin";
}
