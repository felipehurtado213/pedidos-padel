"use client";

import Image from "next/image";
import { useState } from "react";
import { formatCOP } from "@/lib/format";
import { priceWithPromo } from "@/lib/promo";
import { MAX_QTY } from "@/lib/whatsapp";
import type { PublicProduct, PublicPromotion } from "@/types/db";
import { CategoryArt } from "./CategoryArt";
import { WhatsAppIcon } from "./icons";

interface Props {
  product: PublicProduct;
  /** Promo de la categoría (ej. 2 helados por $8.000), si hay. */
  promo?: PublicPromotion | null;
  index: number;
  /** Devuelve true si se abrió WhatsApp (false si falta la ubicación). */
  onOrder: (product: PublicProduct, quantity: number) => boolean;
}

export function ProductCard({ product, promo = null, index, onOrder }: Props) {
  const [qty, setQty] = useState(1);
  const [sent, setSent] = useState(false);
  const soldOut = !product.available;
  const total = priceWithPromo(product.price, qty, promo);
  // ¿La promo es un descuento real para este producto?
  const promoApplies = promo !== null && priceWithPromo(product.price, promo.quantity, promo) < product.price * promo.quantity;

  function handleOrder() {
    if (soldOut) return;
    if (onOrder(product, qty)) {
      setSent(true);
      window.setTimeout(() => setSent(false), 2500);
    }
  }

  return (
    <article
      className="animate-fade-up flex flex-col gap-3 rounded-3xl bg-white p-3 shadow-card"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      aria-labelledby={`p-${product.id}`}
    >
      <div className="flex gap-3">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-arena">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={224}
              height={224}
              className={`size-full object-cover ${soldOut ? "grayscale" : ""}`}
              loading={index < 2 ? "eager" : "lazy"}
            />
          ) : (
            <CategoryArt category={product.category} className={`size-full ${soldOut ? "grayscale" : ""}`} />
          )}
          {soldOut && (
            <span className="absolute inset-x-0 bottom-0 bg-tamarindo-dark/85 py-1 text-center text-xs font-extrabold tracking-wide text-white uppercase">
              Agotado
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 id={`p-${product.id}`} className="font-display text-xl leading-tight font-semibold text-tamarindo-dark">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-3 text-sm leading-snug text-ink/70">{product.description}</p>
          )}
          <p className="mt-auto pt-1 font-display text-2xl font-bold text-chile">{formatCOP(product.price)}</p>
          {promoApplies && promo && !soldOut && (
            <p className="text-xs font-extrabold text-chile-dark">
              Promo: {promo.quantity} por {formatCOP(promo.price)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Selector de cantidad - 1 + */}
        <div
          className={`flex h-14 items-center rounded-2xl bg-crema ${soldOut ? "opacity-40" : ""}`}
          role="group"
          aria-label={`Cantidad de ${product.name}`}
        >
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={soldOut || qty <= 1}
            className="grid size-14 place-items-center rounded-2xl text-2xl font-bold text-tamarindo transition active:scale-90 disabled:text-tamarindo/30"
            aria-label="Quitar uno"
          >
            −
          </button>
          <output className="w-8 text-center font-display text-xl font-semibold tabular-nums" aria-live="polite">
            {qty}
          </output>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
            disabled={soldOut || qty >= MAX_QTY}
            className="grid size-14 place-items-center rounded-2xl text-2xl font-bold text-tamarindo transition active:scale-90 disabled:text-tamarindo/30"
            aria-label="Agregar uno"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleOrder}
          disabled={soldOut}
          className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-limon-dark px-3 font-display text-lg font-semibold text-white shadow-[0_4px_0_0_#365807] transition active:translate-y-1 active:shadow-none disabled:bg-tamarindo-soft disabled:text-tamarindo/80 disabled:shadow-none"
        >
          {soldOut ? (
            "Agotado"
          ) : sent ? (
            "¡Listo! Envía el chat"
          ) : (
            <>
              <WhatsAppIcon className="size-5 shrink-0" />
              <span className="truncate">
                Pedir{qty > 1 ? ` · ${formatCOP(total)}` : ""}
              </span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
