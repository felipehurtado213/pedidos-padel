/**
 * Fechas en hora de Colombia (UTC-5 fijo, sin horario de verano).
 * Sirve igual en servidor (Vercel corre en UTC) y en el navegador.
 */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Instante (UTC) en que empezó el día de hoy en Bogotá. */
export function bogotaDayStart(now: Date = new Date()): Date {
  const local = new Date(now.getTime() - BOGOTA_OFFSET_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + BOGOTA_OFFSET_MS,
  );
}

/** "2026-10-07" (fecha de hoy en Bogotá). */
export function bogotaToday(now: Date = new Date()): string {
  return new Date(now.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Inicio (UTC) del día "YYYY-MM-DD" en Bogotá. */
export function bogotaDateStart(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + BOGOTA_OFFSET_MS);
}
