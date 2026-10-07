import { z } from "zod";
import { isProductImageUrl } from "@/lib/storage";
import { PRODUCT_CATEGORIES } from "@/types/db";

/** Esquemas compartidos: el cliente los usa para avisar rápido y el servidor para validar de verdad. */

const money = (label: string) =>
  z
    .number({ message: `${label}: escribe un número` })
    .int(`${label}: sin decimales`)
    .min(0, `${label}: no puede ser negativo`)
    .max(10_000_000, `${label}: valor demasiado alto`);

export const productBaseSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre del producto.").max(80, "Nombre: máximo 80 caracteres."),
  description: z.string().trim().max(240, "Descripción: máximo 240 caracteres."),
  category: z.enum(PRODUCT_CATEGORIES, { message: "Elige una categoría." }),
  price: money("Precio"),
  unit_cost: money("Costo").nullable(),
  low_stock_threshold: z
    .number({ message: "Alerta de stock: escribe un número" })
    .int()
    .min(0)
    .max(10_000, "Alerta de stock: valor demasiado alto"),
  is_active: z.boolean(),
  sort_order: z.number().int().min(-10_000).max(10_000),
  image_url: z
    .string()
    .nullable()
    .refine((v) => v === null || isProductImageUrl(v), "La imagen no es válida."),
});

export const productCreateSchema = productBaseSchema.extend({
  stock: z
    .number({ message: "Stock: escribe un número" })
    .int()
    .min(0, "Stock: no puede ser negativo")
    .max(100_000, "Stock: valor demasiado alto"),
});

export const productUpdateSchema = productBaseSchema;

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productIdSchema = z.uuid("Producto inválido.");

export const stockAdjustSchema = z.object({
  productId: productIdSchema,
  delta: z
    .number()
    .int()
    .min(-10_000)
    .max(10_000)
    .refine((n) => n !== 0, "La cantidad no puede ser 0."),
  reason: z.enum(["reposicion", "ajuste"]),
  note: z.string().trim().max(200, "Nota: máximo 200 caracteres.").optional(),
});

export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
