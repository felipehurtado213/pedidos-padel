import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** Manifiesto de la app de CLIENTES (instalable desde "/"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: env.NEXT_PUBLIC_BUSINESS_NAME,
    short_name: env.NEXT_PUBLIC_BUSINESS_NAME.slice(0, 12),
    description: "Pide micheladas, helados y mango biche desde tu lugar en el club.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-CO",
    background_color: "#fff8ec",
    theme_color: "#ffb627",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
