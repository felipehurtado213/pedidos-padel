import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Cliente de Supabase para Client Components (navegador).
 * Usa solo la anon/publishable key; la sesión del admin vive en cookies.
 */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
