import { requireAdmin } from "@/lib/auth";
import type { Product } from "@/types/db";
import { InventoryManager } from "./InventoryManager";

export const metadata = { title: "Inventario" };

export default async function InventarioPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order")
    .order("name")
    .returns<Product[]>();

  return <InventoryManager products={data ?? []} loadError={error ? "No se pudo cargar el inventario." : null} />;
}
