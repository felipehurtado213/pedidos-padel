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
import { rpcErrorMessage } from "@/lib/format";
import { PRODUCT_IMAGES_BUCKET, storagePathFromUrl } from "@/lib/storage";
import { promotionIdSchema, promotionSchema } from "@/lib/validation/promotion";
import {
  productCreateSchema,
  productIdSchema,
  productUpdateSchema,
  stockAdjustSchema,
} from "@/lib/validation/product";

/**
 * Todas las acciones: 1) verifican admin en el servidor, 2) validan con zod,
 * 3) la base de datos vuelve a verificar con RLS / RPC. Triple candado.
 */

function refresh() {
  revalidatePath("/admin/inventario");
  revalidatePath("/"); // el catálogo público refleja el cambio al instante
}

type Supabase = NonNullable<Awaited<ReturnType<typeof adminClientOrNull>>>;

async function removeImage(supabase: Supabase, url: string | null | undefined) {
  const path = storagePathFromUrl(url);
  if (path) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
}

export async function createProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  // El stock inicial queda en la bitácora gracias al trigger log_initial_stock.
  const { data, error } = await supabase.from("products").insert(parsed.data).select("id").single();
  if (error) return fail(dbErrorMessage(error));

  refresh();
  return ok({ id: data.id as string });
}

export async function updateProduct(id: unknown, input: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);

  const parsedId = productIdSchema.safeParse(id);
  const parsed = productUpdateSchema.safeParse(input);
  if (!parsedId.success) return fail("Producto inválido.");
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { data: before } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", parsedId.data)
    .maybeSingle();

  // Nota: "stock" no está en el esquema → no se puede cambiar por aquí (además
  // la base de datos no da permiso de UPDATE sobre esa columna). Solo vía adjustStock.
  const { error } = await supabase.from("products").update(parsed.data).eq("id", parsedId.data);
  if (error) return fail(dbErrorMessage(error));

  if (before?.image_url && before.image_url !== parsed.data.image_url) {
    await removeImage(supabase, before.image_url);
  }

  refresh();
  return ok(undefined);
}

export async function deleteProduct(id: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);

  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) return fail("Producto inválido.");

  const { data: before } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", parsedId.data)
    .maybeSingle();

  const { error } = await supabase.from("products").delete().eq("id", parsedId.data);
  if (error) return fail(dbErrorMessage(error));

  await removeImage(supabase, before?.image_url);
  refresh();
  return ok(undefined);
}

/* ------------------------------ Promociones ------------------------------ */

function refreshPromos() {
  revalidatePath("/admin/inventario");
  revalidatePath("/admin");
  revalidatePath("/"); // el aviso de la promo en el menú público
}

export async function createPromotion(input: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { error } = await supabase.from("promotions").insert(parsed.data);
  if (error) return fail(dbErrorMessage(error));
  refreshPromos();
  return ok(undefined);
}

export async function updatePromotion(id: unknown, input: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsedId = promotionIdSchema.safeParse(id);
  const parsed = promotionSchema.safeParse(input);
  if (!parsedId.success) return fail("Promoción inválida.");
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { error } = await supabase.from("promotions").update(parsed.data).eq("id", parsedId.data);
  if (error) return fail(dbErrorMessage(error));
  refreshPromos();
  return ok(undefined);
}

/** Interruptor de un toque: activa o apaga la promo (aviso del menú, etiquetas y botón de venta). */
export async function setPromotionActive(id: unknown, active: unknown): Promise<ActionResult> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);
  const parsedId = promotionIdSchema.safeParse(id);
  if (!parsedId.success || typeof active !== "boolean") return fail("Datos inválidos.");

  const { error } = await supabase.from("promotions").update({ is_active: active }).eq("id", parsedId.data);
  if (error) return fail(dbErrorMessage(error));
  refreshPromos();
  return ok(undefined);
}

export async function adjustStock(input: unknown): Promise<ActionResult<{ stock: number }>> {
  const supabase = await adminClientOrNull();
  if (!supabase) return fail(SESSION_EXPIRED);

  const parsed = stockAdjustSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { productId, delta, reason, note } = parsed.data;
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_delta: delta,
    p_reason: reason,
    p_note: note || null,
  });
  if (error) return fail(rpcErrorMessage(error.message));

  refresh();
  return ok({ stock: (data as { stock: number }).stock });
}
