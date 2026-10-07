"use client";

import { useState, useTransition } from "react";
import { Field, IntInput, MoneyInput, Toggle, inputClass } from "@/components/admin/inputs";
import { useToast } from "@/components/admin/Toaster";
import { formatCOP } from "@/lib/format";
import { promotionSchema } from "@/lib/validation/promotion";
import { PRODUCT_CATEGORIES, type ProductCategory, type Promotion } from "@/types/db";
import { createPromotion, updatePromotion } from "./actions";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bebidas: "Bebidas",
  helados: "Helados",
  snacks: "Para picar",
  otros: "Otros",
};

/** Crear/editar una promoción (ej. 2 helados por $8.000). */
export function PromotionForm({ promotion, onClose }: { promotion: Promotion | null; onClose: () => void }) {
  const toast = useToast();
  const isNew = promotion === null;
  const [name, setName] = useState(promotion?.name ?? "2 helados");
  const [category, setCategory] = useState<ProductCategory>(promotion?.category ?? "helados");
  const [quantity, setQuantity] = useState(String(promotion?.quantity ?? 2));
  const [price, setPrice] = useState(String(promotion?.price ?? 8000));
  const [isActive, setIsActive] = useState(promotion?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const check = promotionSchema.safeParse({
      name,
      category,
      quantity: Number(quantity || 0),
      price: price === "" ? NaN : Number(price),
      is_active: isActive,
    });
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Revisa los datos.");
    setError(null);
    startTransition(async () => {
      const r = isNew ? await createPromotion(check.data) : await updatePromotion(promotion.id, check.data);
      if (!r.ok) return setError(r.error);
      toast(isNew ? "Promoción creada" : "Promoción guardada", "success");
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="rounded-2xl bg-mango-soft/70 px-4 py-3 text-sm">
        Se vende desde <strong>Vender → botón de la promo</strong>, eligiendo los sabores. El precio se reparte entre
        las unidades para que la caja cuadre exacto.
      </p>

      <Field label="Nombre" htmlFor="pr-name" hint="Se muestra en el menú: “¡Promoción! 2 helados por $8.000”">
        <input id="pr-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
      </Field>

      <Field label="Aplica a" htmlFor="pr-cat">
        <div id="pr-cat" role="radiogroup" className="grid grid-cols-4 gap-2">
          {PRODUCT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={`h-11 rounded-xl text-sm font-bold ${
                category === c ? "bg-tamarindo text-white" : "bg-white text-tamarindo shadow-sm"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Unidades" htmlFor="pr-qty">
          <IntInput id="pr-qty" value={quantity} onChange={setQuantity} maxDigits={2} />
        </Field>
        <Field label="Precio total" htmlFor="pr-price">
          <MoneyInput id="pr-price" value={price} onChange={setPrice} />
        </Field>
      </div>

      <Toggle
        checked={isActive}
        onChange={setIsActive}
        label={isActive ? "Promoción activa" : "Promoción pausada"}
        description="Si la pausas, desaparece del menú y del botón de Vender"
      />

      {error && (
        <p role="alert" className="rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-2xl bg-limon-dark font-display text-xl font-semibold text-white shadow-[0_4px_0_0_#365807] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        {pending ? "Guardando…" : `Guardar · ${quantity || "?"} por ${price ? formatCOP(Number(price)) : "$?"}`}
      </button>
    </form>
  );
}
