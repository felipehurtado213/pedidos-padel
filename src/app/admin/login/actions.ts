"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeAdminPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
  email: string;
}

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(6).max(128),
});

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: "Escribe un correo y una contraseña válidos.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // Mensaje genérico: no revelamos si el correo existe.
    const msg =
      error?.status === 429
        ? "Demasiados intentos. Espera un minuto e inténtalo de nuevo."
        : "Correo o contraseña incorrectos.";
    return { error: msg, email };
  }

  // Tener cuenta no basta: debe estar en public.admins.
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!adminRow) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene permisos de administrador.", email };
  }

  redirect(safeAdminPath(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
