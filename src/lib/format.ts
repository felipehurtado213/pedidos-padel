/**
 * Formatea pesos colombianos como "$12.000".
 * Se hace a mano (no Intl) para que servidor y navegador den exactamente el
 * mismo texto y "$8.000" lleve punto (algunos locales "es" no agrupan 4 cifras).
 */
export function formatCOP(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(Math.round(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}$${digits}`;
}

const dateTimeFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "7 oct, 3:45 p. m." en hora de Colombia. Usar solo en el cliente o con la misma zona. */
export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export const STOCK_REASON_LABELS: Record<string, string> = {
  venta: "Venta",
  reposicion: "Reposición",
  ajuste: "Ajuste",
  deshacer: "Venta anulada",
};

/** Traduce los códigos de error de las RPC de Supabase a mensajes en español. */
export function rpcErrorMessage(message: string | undefined): string {
  const map: Record<string, string> = {
    NOT_AUTHORIZED: "No tienes permisos de administrador.",
    INVALID_QUANTITY: "Cantidad inválida.",
    INVALID_REASON: "Motivo de ajuste inválido.",
    INVALID_NOTE: "La nota es demasiado larga.",
    INSUFFICIENT_STOCK: "No hay stock suficiente.",
    PRODUCT_NOT_FOUND: "El producto no existe.",
    NOTHING_TO_UNDO: "No hay ventas para deshacer.",
    PROMO_NOT_FOUND: "La promoción no está activa.",
    PROMO_INVALID_PRODUCT: "Esos productos no aplican para la promoción.",
  };
  if (!message) return "Ocurrió un error inesperado.";
  const code = Object.keys(map).find((k) => message.includes(k));
  return code ? map[code] : "No se pudo completar la acción. Revisa tu conexión.";
}
