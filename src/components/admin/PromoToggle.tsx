"use client";

import { useState, useTransition } from "react";
import { setPromotionActive } from "@/app/admin/(panel)/inventario/actions";
import { useToast } from "@/components/admin/Toaster";
import { formatCOP } from "@/lib/format";
import type { Promotion } from "@/types/db";

/**
 * Interruptor de UN toque para encender/apagar una promoción.
 * Apagada: desaparece el aviso del menú, la etiqueta "Promo" de cada producto
 * y el botón de venta en promo; se vende al precio normal.
 */
export function PromoToggle({ promotion }: { promotion: Promotion }) {
  const toast = useToast();
  const [active, setActive] = useState(promotion.is_active);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !active;
    setActive(next); // se ve al instante
    startTransition(async () => {
      const r = await setPromotionActive(promotion.id, next);
      if (!r.ok) {
        setActive(!next);
        toast(r.error, "error");
        return;
      }
      toast(
        next ? `Promo ${promotion.name} ACTIVADA: ya se ve en el menú` : `Promo ${promotion.name} apagada: precio normal`,
        next ? "success" : "info",
      );
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={toggle}
      disabled={pending}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
        active ? "border-chile-dark bg-chile-soft" : "border-arena bg-white"
      } ${pending ? "opacity-70" : ""}`}
    >
      <span aria-hidden className="text-2xl">
        {promotion.category === "helados" ? "🍦" : "🎉"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-tight font-bold text-tamarindo-dark">
          Promo {promotion.name} por {formatCOP(promotion.price)}
        </span>
        <span className={`block text-xs font-bold ${active ? "text-chile-dark" : "text-ink/70"}`}>
          {pending ? "Guardando…" : active ? "ACTIVA · se ve en el menú" : "Apagada · se vende a precio normal"}
        </span>
      </span>
      {/* Interruptor visual */}
      <span
        aria-hidden
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${active ? "bg-chile-dark" : "bg-tamarindo/25"}`}
      >
        <span
          className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${active ? "left-7" : "left-1"}`}
        />
      </span>
    </button>
  );
}
