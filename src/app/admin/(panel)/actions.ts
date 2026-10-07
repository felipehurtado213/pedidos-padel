"use server";

import { revalidatePath } from "next/cache";
import { adminClientOrNull } from "@/lib/auth";

/**
 * Refresca el catálogo público al instante (p. ej. cuando un producto se agota
 * o vuelve a tener stock tras deshacer una venta). Solo admin.
 */
export async function revalidateCatalog(): Promise<void> {
  if (!(await adminClientOrNull())) return;
  revalidatePath("/");
}
