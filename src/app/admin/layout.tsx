import type { Metadata } from "next";

// El panel no debe aparecer en buscadores.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  // App instalable aparte para el vendedor (abre directo en Venta rápida).
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ventas", statusBarStyle: "default" },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
