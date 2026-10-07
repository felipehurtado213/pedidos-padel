"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { CategoryArt } from "@/components/catalog/CategoryArt";
import { uploadProductImage } from "@/lib/images";
import type { ProductCategory } from "@/types/db";

interface Props {
  value: string | null;
  category: ProductCategory;
  onChange: (url: string | null) => void;
  /** Se llama con cada foto subida (para limpiar las que no se usen). */
  onUploaded: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
}

export function ImagePicker({ value, category, onChange, onUploaded, onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    try {
      const url = await uploadProductImage(file);
      onUploaded(url);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setBusy(false);
      onBusyChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-arena">
        {value ? (
          <Image src={value} alt="Foto del producto" width={192} height={192} className="size-full object-cover" />
        ) : (
          <CategoryArt category={category} className="size-full" />
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-bold text-tamarindo">
            Subiendo…
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          id="product-photo"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={busy}
        />
        <label
          htmlFor="product-photo"
          className={`grid h-12 cursor-pointer place-items-center rounded-2xl bg-mango px-4 font-bold text-tamarindo-dark ${busy ? "opacity-50" : ""}`}
        >
          {value ? "Cambiar foto" : "Subir o tomar foto"}
        </label>
        {value && !busy && (
          <button type="button" onClick={() => onChange(null)} className="h-10 rounded-2xl text-sm font-bold text-chile-dark">
            Quitar foto
          </button>
        )}
        {error && (
          <p role="alert" className="text-sm font-bold text-chile-dark">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
