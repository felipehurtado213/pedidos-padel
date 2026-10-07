import { requireAdmin } from "@/lib/auth";

/** Layout limpio (sin encabezado ni barra inferior) para páginas que se imprimen. */
export default async function PrintLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return <div className="min-h-dvh bg-white print:min-h-0">{children}</div>;
}
