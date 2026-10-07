import type { z } from "zod";

/** Respuesta uniforme de las server actions (nunca lanzan errores al cliente). */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: string): ActionResult<T> {
  return { ok: false, error };
}

export const SESSION_EXPIRED = "Tu sesión expiró o no tienes permisos. Vuelve a entrar.";

/** Primer mensaje de error de zod, para mostrarlo tal cual. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

/** Traduce errores de Postgres/PostgREST comunes. */
export function dbErrorMessage(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case "23503":
      return "No se puede borrar: tiene registros asociados (ventas). Mejor desactívalo.";
    case "23505":
      return "Ya existe un registro con ese nombre.";
    case "23514":
      return "Algún valor no es válido (revisa números y textos).";
    case "42501":
      return "No tienes permisos para esta acción.";
    default:
      return "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
  }
}
