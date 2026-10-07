import { requireAdmin } from "@/lib/auth";
import { bogotaDayStart } from "@/lib/dates";
import type { DashboardStats, Promotion, SaleDetailed } from "@/types/db";
import { QuickSale, type QuickProduct } from "./QuickSale";

export const metadata = { title: "Venta rápida" };

export default async function VentaRapidaPage() {
  const { supabase } = await requireAdmin();
  const dayStart = bogotaDayStart();

  const [productsRes, statsRes, recentRes, promosRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, price, stock, low_stock_threshold, image_url, category")
      .eq("is_active", true)
      .order("sort_order")
      .order("name")
      .returns<QuickProduct[]>(),
    supabase.rpc("get_dashboard_stats", { p_from: dayStart.toISOString(), p_to: null }),
    supabase
      .from("sales_detailed")
      .select("*")
      .order("id", { ascending: false })
      .limit(30)
      .returns<SaleDetailed[]>(),
    supabase.from("promotions").select("*").eq("is_active", true).order("name").returns<Promotion[]>(),
  ]);

  const stats = statsRes.data as DashboardStats | null;
  const products = productsRes.data ?? [];

  // "Huella" de los datos: si al refrescar (router.refresh) algo cambió, el key cambia
  // y el componente se reinicia con los datos frescos del servidor.
  const dataKey = [
    stats?.sales_count ?? 0,
    recentRes.data?.[0]?.id ?? 0,
    products.map((p) => `${p.id}:${p.stock}:${p.price}`).join(","),
    (promosRes.data ?? []).map((p) => `${p.id}:${p.price}:${p.quantity}`).join(","),
  ].join("|");

  return (
    <QuickSale
      key={dataKey}
      initialProducts={products}
      initialTotals={{
        revenue: Number(stats?.revenue ?? 0),
        units: Number(stats?.units ?? 0),
        sales_count: Number(stats?.sales_count ?? 0),
      }}
      initialRecent={recentRes.data ?? []}
      promotions={promosRes.data ?? []}
      dayStartIso={dayStart.toISOString()}
      loadError={productsRes.error ? "No se pudieron cargar los productos." : null}
    />
  );
}
