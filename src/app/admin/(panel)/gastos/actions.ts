"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionResult,
  dbErrorMessage,
  fail,
  firstIssue,
  ok,
  SESSION_EXPIRED,
} from "@/lib/action-result";
import { adminClientOrNull } from "@/lib/auth";
import {
  expenseIdSchema,
  expenseSchema,
  supplyIdSchema,
  supplySchema,
} from "@/lib/validation/expense";

/** Mismo patrón que inventario: admin en servidor + zod + RLS en la base de datos. */

function refresh() {
  revalidatePath("/admin/gastos");
  revalidatePath("/admin/estadisticas");
}

/* ------------------------------ Gastos ------------------------------ */

export async function createExpense(input: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { error } = await supabase.from("expenses").insert(parsed.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok(undefined);
}

export async function updateExpense(id: unknown, input: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsedId = expenseIdSchema.safeParse(id);
  const parsed = expenseSchema.safeParse(input);
  if (!parsedId.success) return fail("Gasto inválido.");
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { error } = await supabase.from("expenses").update(parsed.data).eq("id", parsedId.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok(undefined);
}

export async function deleteExpense(id: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsedId = expenseIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Gasto inválido.");

  const { error } = await supabase.from("expenses").delete().eq("id", parsedId.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok(undefined);
}

/* ------------------------------ Insumos ------------------------------ */

export async function createSupply(input: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsed = supplySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { error } = await supabase.from("supplies").insert(parsed.data);
  if (error) return fail(error.code === "23505" ? "Ya existe un insumo con ese nombre." : dbErrorMessage(error));
  refresh();
  return ok(undefined);
}

export async function updateSupply(id: unknown, input: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsedId = supplyIdSchema.safeParse(id);
  const parsed = supplySchema.safeParse(input);
  if (!parsedId.success) return fail("Insumo inválido.");
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { error } = await supabase.from("supplies").update(parsed.data).eq("id", parsedId.data);
  if (error) return fail(error.code === "23505" ? "Ya existe un insumo con ese nombre." : dbErrorMessage(error));
  refresh();
  return ok(undefined);
}

/** Borra el insumo; sus gastos se conservan (supply_id queda en null). */
export async function deleteSupply(id: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsedId = supplyIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Insumo inválido.");

  const { error } = await supabase.from("supplies").delete().eq("id", parsedId.data);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok(undefined);
}
