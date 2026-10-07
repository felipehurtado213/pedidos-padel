import { requireAdmin } from "@/lib/auth";
import type { Product, Promotion } from "@/types/db";
import { InventoryManager } from "./InventoryManager";

export const metadata = { title: "Inventario" };

export default async function InventarioPage() {
  const { supabase } = await requireAdmin();

  const [{ data, error }, promosRes] = await Promise.all([
    supabase.from("products").select("*").order("sort_order").order("name").returns<Product[]>(),
    supabase.from("promotions").select("*").order("name").returns<Promotion[]>(),
  ]);

  return <InventoryManager products={data ?? []} promotions={promosRes.data ?? []} loadError={error ? "No se pudo cargar el inventario." : null} />;
}
