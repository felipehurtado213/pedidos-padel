import { z } from "zod";
import { PRODUCT_CATEGORIES } from "@/types/db";

export const promotionSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre (ej. 2 helados).").max(60, "Nombre: máximo 60 caracteres."),
  category: z.enum(PRODUCT_CATEGORIES, { message: "Elige una categoría." }),
  quantity: z
    .number({ message: "Cantidad: escribe un número." })
    .int()
    .min(2, "La promo debe ser de al menos 2 unidades.")
    .max(10, "Máximo 10 unidades por promo."),
  price: z
    .number({ message: "Escribe el precio de la promo." })
    .int()
    .min(0)
    .max(10_000_000, "Precio demasiado alto."),
  is_active: z.boolean(),
});

export type PromotionInput = z.infer<typeof promotionSchema>;
export const promotionIdSchema = z.uuid("Promoción inválida.");
