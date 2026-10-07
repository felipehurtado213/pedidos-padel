"use client";

import { useEffect, useRef, useState } from "react";
import { buildOrderMessage, buildWhatsAppUrl, locationSchema } from "@/lib/whatsapp";
import type { ProductCategory, PublicProduct } from "@/types/db";
import { PinIcon } from "./icons";
import { ProductCard } from "./ProductCard";

const STORAGE_KEY = "pedidos:ubicacion";

const SECTIONS: { category: ProductCategory; title: string; subtitle: string }[] = [
  { category: "bebidas", title: "Bebidas micheladas", subtitle: "Con limón, sal, hielo al gusto y salsa chamoy" },
  { category: "helados", title: "Helados", subtitle: "Paletas artesanales: mango biche, coco, maracuyá y maracumango" },
  { category: "snacks", title: "Para picar", subtitle: "Con limón, sal y pimienta" },
  { category: "otros", title: "Otros", subtitle: "" },
];

interface Props {
  products: PublicProduct[];
  sellerName: string;
  whatsappNumber: string;
}

export function Catalog({ products, sellerName, whatsappNumber }: Props) {
  // El input es NO controlado: el valor guardado se escribe directo en el DOM
  // al montar (evita desajustes de hidratación y re-renders al escribir).
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && inputRef.current && !inputRef.current.value) inputRef.current.value = saved;
    } catch {
      // localStorage bloqueado (modo privado): se ignora.
    }
  }, []);

  function handleChange(value: string) {
    if (error) setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* sin almacenamiento disponible */
    }
  }

  function handleOrder(product: PublicProduct, quantity: number): boolean {
    const parsed = locationSchema.safeParse(inputRef.current?.value ?? "");
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Escribe dónde estás.");
      setShake(true);
      inputRef.current?.focus();
      return false;
    }

    const message = buildOrderMessage({
      sellerName,
      productName: product.name,
      quantity,
      location: parsed.data,
    });
    window.open(buildWhatsAppUrl(whatsappNumber, message), "_blank", "noopener,noreferrer");
    return true;
  }

  let cardIndex = 0;

  return (
    <>
      {/* Ubicación: fija arriba para que siempre esté a mano mientras se baja por el menú */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-arena/80 bg-crema/90 px-4 py-3 backdrop-blur-md">
        <label htmlFor="ubicacion" className="mb-1.5 flex items-center gap-1.5 font-display text-lg font-semibold text-tamarindo-dark">
          <PinIcon className="size-5 text-chile" />
          ¿Dónde estás ubicado?
        </label>
        <div className={shake ? "animate-shake" : ""} onAnimationEnd={() => setShake(false)}>
          <input
            ref={inputRef}
            id="ubicacion"
            name="ubicacion"
            type="text"
            inputMode="text"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={100}
            placeholder="Ej: Cancha 3, gradas lado norte"
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-invalid={error ? true : undefined}
            aria-describedby="ubicacion-ayuda"
            className={`h-14 w-full rounded-2xl border-2 px-4 text-lg font-semibold text-ink shadow-sm outline-none transition placeholder:font-normal placeholder:text-ink/40 focus:border-mango-dark ${
              error ? "border-chile bg-chile-soft" : "border-arena bg-white"
            }`}
          />
        </div>
        <p
          id="ubicacion-ayuda"
          role={error ? "alert" : undefined}
          className={`mt-1.5 text-sm ${error ? "font-bold text-chile-dark" : "text-ink/70"}`}
        >
          {error ?? "Lo recordamos para tus próximos pedidos."}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="mt-10 rounded-3xl bg-white p-6 text-center text-lg shadow-card">
          Estamos preparando el menú. ¡Vuelve en un momento! 🍹
        </p>
      ) : (
        SECTIONS.map(({ category, title, subtitle }) => {
          const items = products.filter((p) => p.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} aria-labelledby={`sec-${category}`} className="mt-7">
              <div className="mb-3">
                <h2 id={`sec-${category}`} className="font-display text-2xl leading-tight font-bold text-tamarindo">
                  {title}
                </h2>
                {subtitle && <p className="text-sm text-ink/70">{subtitle}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} index={cardIndex++} onOrder={handleOrder} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
