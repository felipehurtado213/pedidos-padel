import type { ExpenseCategory } from "@/types/db";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  insumos: "Insumos",
  transporte: "Transporte",
  hielo: "Hielo",
  empaques: "Empaques",
  otros: "Otros",
};

export const UNIT_SUGGESTIONS = ["unidad", "paquete", "caja", "bolsa", "kg", "frasco", "litro", "docena"];

/** 1.5 → "1,5" (formato colombiano, sin ceros sobrantes). */
export function formatQty(n: number | string | null | undefined): string {
  if (n == null || n === "") return "";
  return String(Number(n)).replace(".", ",");
}

/** "2026-10-07" → "mié 7 oct" (sin depender de la zona horaria). */
export function formatDay(isoDate: string): string {
  const [y, m, d] = String(isoDate).slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return String(isoDate);
  const text = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
