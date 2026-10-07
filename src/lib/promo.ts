import type { ProductCategory, PublicPromotion } from "@/types/db";

/** Promo activa para una categoría (si hay varias, la primera). */
export function promoFor(promos: PublicPromotion[], category: ProductCategory): PublicPromotion | null {
  return promos.find((p) => p.category === category) ?? null;
}

/**
 * Precio a pagar por `qty` unidades aplicando la promo por paquetes:
 * 2 helados por $8.000 y 1 por $5.000 → 3 helados = 8.000 + 5.000.
 * Solo aplica si de verdad es más barato que el precio normal.
 */
export function priceWithPromo(unitPrice: number, qty: number, promo: PublicPromotion | null): number {
  const normal = unitPrice * qty;
  if (!promo || promo.price >= unitPrice * promo.quantity) return normal;
  const packs = Math.floor(qty / promo.quantity);
  return packs * promo.price + (qty - packs * promo.quantity) * unitPrice;
}
