import { z } from "zod";

/**
 * Ubicación escrita por el cliente.
 * 1) Limpia: quita caracteres de control (saltos de línea, tabs...) y espacios repetidos.
 * 2) Valida: no vacía, mínimo 3 y máximo 100 caracteres.
 * El texto final se URL-encodea en buildWhatsAppUrl, así que no puede "romper" el enlace.
 */
export const locationSchema = z
  .string()
  .transform((s) => s.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Escribe dónde estás para poder llevarte el pedido.")
      .min(3, "Danos un poco más de detalle (ej. Cancha 3, gradas norte).")
      .max(100, "Máximo 100 caracteres."),
  );

export const MAX_QTY = 20;

const orderSchema = z.object({
  sellerName: z.string().trim().min(1).max(40),
  productName: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(MAX_QTY),
  location: locationSchema,
});

export type OrderInput = z.input<typeof orderSchema>;

/** "Hola Felipe, quiero 2 Cerveza michelada. Estoy ubicado en Cancha 3." */
export function buildOrderMessage(input: OrderInput): string {
  const o = orderSchema.parse(input);
  return `Hola ${o.sellerName}, quiero ${o.quantity} ${o.productName}. Estoy ubicado en ${o.location}.`;
}

/** Enlace wa.me con el mensaje URL-encodeado. `phone`: solo dígitos con código de país. */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
