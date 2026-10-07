import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/types/db";

/** Esquemas compartidos (cliente: aviso rápido · servidor: validación real). */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")
  .refine((d) => {
    const t = Date.parse(`${d}T12:00:00Z`);
    return !Number.isNaN(t) && d >= "2020-01-01" && t <= Date.now() + 2 * 86_400_000;
  }, "La fecha no puede ser futura.");

export const expenseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Escribe una descripción.")
    .max(120, "Descripción: máximo 120 caracteres."),
  amount: z
    .number({ message: "Escribe el monto." })
    .int("Monto: sin decimales.")
    .min(1, "El monto debe ser mayor a $0.")
    .max(100_000_000, "Monto demasiado alto."),
  category: z.enum(EXPENSE_CATEGORIES, { message: "Elige una categoría." }),
  spent_on: isoDate,
  supply_id: z.uuid().nullable(),
  quantity: z
    .number()
    .positive("La cantidad debe ser mayor a 0.")
    .max(100_000, "Cantidad demasiado alta.")
    .transform((q) => Math.round(q * 100) / 100) // máx. 2 decimales (ej. 1,5 kg)
    .nullable(),
});

export type ExpenseInput = z.input<typeof expenseSchema>;

export const supplySchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre del insumo.").max(60, "Nombre: máximo 60 caracteres."),
  unit: z.string().trim().min(1, "Escribe la unidad (ej. paquete, kg).").max(20, "Unidad: máximo 20 caracteres."),
  category: z.enum(EXPENSE_CATEGORIES, { message: "Elige una categoría." }),
  default_unit_cost: z
    .number()
    .int()
    .min(0)
    .max(10_000_000, "Costo demasiado alto.")
    .nullable(),
  is_active: z.boolean(),
});

export type SupplyInput = z.input<typeof supplySchema>;

export const expenseIdSchema = z.number().int().positive();
export const supplyIdSchema = z.uuid();

/** "1,5" o "1.5" → 1.5 ; "" → null */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
