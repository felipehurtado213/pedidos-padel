import { env } from "@/lib/env";

/**
 * Manifiesto de la app del VENDEDOR: al instalar desde /admin abre directo en
 * "Venta rápida". No contiene datos privados (por eso el proxy lo deja pasar sin sesión).
 */
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    id: "/admin",
    name: `Ventas · ${env.NEXT_PUBLIC_BUSINESS_NAME}`,
    short_name: "Ventas",
    description: "Panel de ventas rápidas, inventario y gastos.",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait",
    lang: "es-CO",
    background_color: "#fff8ec",
    theme_color: "#6b3a1e",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
