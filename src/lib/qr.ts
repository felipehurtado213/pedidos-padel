import QRCode, { type QRCodeToDataURLOptions, type QRCodeToStringOptions } from "qrcode";
import { env } from "@/lib/env";

/**
 * Generación del QR EN EL SERVIDOR (sin JavaScript extra en el navegador).
 * Tinta oscura sobre blanco: el contraste máximo es lo que hace que escanee rápido,
 * incluso con poca luz o el cartel arrugado. Nivel "M" (~15% de corrección de errores).
 */
const BASE = {
  errorCorrectionLevel: "M" as const,
  margin: 2, // "zona silenciosa" alrededor: necesaria para que los lectores lo detecten
  color: { dark: "#2b1a10", light: "#ffffff" },
};

/** URL pública a la que apunta el QR (sale de NEXT_PUBLIC_SITE_URL). */
export function publicSiteUrl(): string {
  return `${env.NEXT_PUBLIC_SITE_URL}/`;
}

/** true si la URL no sirve para clientes reales (localhost / red local). */
export function isLocalUrl(url: string): boolean {
  const host = new URL(url).hostname;
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

/** SVG vectorial (nítido en pantalla y al imprimir en cualquier tamaño). */
export function qrSvg(url: string): Promise<string> {
  const opts: QRCodeToStringOptions = { ...BASE, type: "svg" };
  return QRCode.toString(url, opts);
}

/** PNG de alta resolución como data URL, para descargar. */
export function qrPngDataUrl(url: string, width = 1024): Promise<string> {
  const opts: QRCodeToDataURLOptions = { ...BASE, type: "image/png", width };
  return QRCode.toDataURL(url, opts);
}

/** "Sabor de Cancha" → "sabor-de-cancha" (para el nombre del archivo). */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "menu"
  );
}
