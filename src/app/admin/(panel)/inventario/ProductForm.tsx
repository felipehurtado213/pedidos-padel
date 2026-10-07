"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { Field, IntInput, MoneyInput, Toggle, inputClass } from "@/components/admin/inputs";
import { useToast } from "@/components/admin/Toaster";
import { formatCOP } from "@/lib/format";
import { removeProductImages } from "@/lib/images";
import { productCreateSchema, productUpdateSchema } from "@/lib/validation/product";
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from "@/types/db";
import { createProduct, deleteProduct, updateProduct } from "./actions";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bebidas: "Bebidas",
  helados: "Helados",
  snacks: "Para picar",
  otros: "Otros",
};

const digits = (n: number | null | undefined) => (n == null ? "" : String(n));

interface Props {
  product: Product | null; // null = nuevo
  nextSortOrder: number;
  onClose: () => void;
}

export function ProductForm({ product, nextSortOrder, onClose }: Props) {
  const toast = useToast();
  const isNew = product === null;

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? "bebidas");
  const [price, setPrice] = useState(digits(product?.price));
  const [cost, setCost] = useState(digits(product?.unit_cost));
  const [stock, setStock] = useState("0");
  const [threshold, setThreshold] = useState(digits(product?.low_stock_threshold ?? 5));
  const [sortOrder, setSortOrder] = useState(digits(product?.sort_order ?? nextSortOrder));
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null);

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // Fotos subidas en esta edición: si no se guardan, se borran del bucket al cerrar.
  const uploaded = useRef<string[]>([]);
  const savedUrl = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const list = uploaded.current;
    return () => {
      const orphans = list.filter((u) => u !== savedUrl.current);
      if (orphans.length) void removeProductImages(orphans);
    };
  }, []);

  const margin =
    price && cost && Number(price) > 0
      ? Math.round(((Number(price) - Number(cost)) / Number(price)) * 100)
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (price === "") return setError("Escribe el precio de venta.");

    const base = {
      name,
      description,
      category,
      price: Number(price),
      unit_cost: cost === "" ? null : Number(cost),
      low_stock_threshold: Number(threshold || 0),
      sort_order: Number(sortOrder || 0),
      is_active: isActive,
      image_url: imageUrl,
    };

    // Validación inmediata en el cliente (el servidor valida otra vez).
    const check = isNew
      ? productCreateSchema.safeParse({ ...base, stock: Number(stock || 0) })
      : productUpdateSchema.safeParse(base);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Revisa los datos.");
    setError(null);

    startTransition(async () => {
      const result = isNew ? await createProduct(check.data) : await updateProduct(product.id, check.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      savedUrl.current = imageUrl;
      toast(isNew ? "Producto creado" : "Cambios guardados", "success");
      onClose();
    });
  }

  function handleDelete() {
    if (!product) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (!result.ok) {
        setError(result.error);
        setConfirmDelete(false);
        return;
      }
      toast("Producto eliminado", "success");
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ImagePicker
        value={imageUrl}
        category={category}
        onChange={setImageUrl}
        onUploaded={(url) => uploaded.current.push(url)}
        onBusyChange={setUploading}
      />

      <Field label="Nombre" htmlFor="pf-name">
        <input
          id="pf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          className={inputClass}
          placeholder="Ej: Cerveza michelada"
        />
      </Field>

      <Field label="Descripción corta" htmlFor="pf-desc" hint={`${description.length}/240`}>
        <textarea
          id="pf-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={240}
          rows={2}
          className={`${inputClass} h-auto py-3 text-base`}
          placeholder="Ej: Con limón, sal y borde de tajín"
        />
      </Field>

      <Field label="Categoría" htmlFor="pf-cat">
        <div id="pf-cat" role="radiogroup" className="grid grid-cols-4 gap-2">
          {PRODUCT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={`h-11 rounded-xl text-sm font-bold transition ${
                category === c ? "bg-tamarindo text-white" : "bg-white text-tamarindo shadow-sm"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio de venta" htmlFor="pf-price">
          <MoneyInput id="pf-price" value={price} onChange={setPrice} placeholder="8.000" />
        </Field>
        <Field
          label="Costo unitario"
          htmlFor="pf-cost"
          hint={margin !== null ? `Margen ${margin}%` : "Opcional · privado"}
        >
          <MoneyInput id="pf-cost" value={cost} onChange={setCost} placeholder="—" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isNew ? (
          <Field label="Stock inicial" htmlFor="pf-stock">
            <IntInput id="pf-stock" value={stock} onChange={setStock} />
          </Field>
        ) : (
          <div>
            <p className="mb-1 font-bold text-tamarindo-dark">Stock</p>
            <p className="flex h-13 items-center rounded-2xl bg-arena/60 px-4 text-lg font-semibold">
              {product.stock} <span className="ml-2 text-xs text-ink/70">(usa “Ajustar”)</span>
            </p>
          </div>
        )}
        <Field label="Alerta de poco stock" htmlFor="pf-low" hint="Avisa al llegar a este número">
          <IntInput id="pf-low" value={threshold} onChange={setThreshold} maxDigits={4} />
        </Field>
      </div>

      <Field label="Orden en el menú" htmlFor="pf-order" hint="Menor número = aparece primero">
        <IntInput id="pf-order" value={sortOrder} onChange={setSortOrder} maxDigits={4} />
      </Field>

      <Toggle
        checked={isActive}
        onChange={setIsActive}
        label={isActive ? "Visible en el menú" : "Oculto del menú"}
        description="Los productos ocultos no los ve el público"
      />

      {error && (
        <p role="alert" className="rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className="h-14 w-full rounded-2xl bg-limon-dark font-display text-xl font-semibold text-white shadow-[0_4px_0_0_#365807] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        {pending ? "Guardando…" : isNew ? "Crear producto" : `Guardar · ${price ? formatCOP(Number(price)) : ""}`}
      </button>

      {!isNew && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={`h-12 w-full rounded-2xl font-bold transition ${
            confirmDelete ? "bg-chile-dark text-white" : "text-chile-dark"
          }`}
        >
          {confirmDelete ? "¿Seguro? Toca otra vez para eliminar" : "Eliminar producto"}
        </button>
      )}
    </form>
  );
}
