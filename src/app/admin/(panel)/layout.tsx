import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/admin/Toaster";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { signOut } from "../login/actions";

/**
 * Layout del panel. requireAdmin() valida sesión + rol en el SERVIDOR
 * (no basta con la redirección del proxy). Cada página y acción lo vuelve a validar.
 */
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const { email } = await requireAdmin();

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-arena bg-crema/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
            <Link href="/admin" className="min-w-0">
              <span className="block truncate font-display text-lg leading-tight font-bold text-tamarindo">
                {env.NEXT_PUBLIC_BUSINESS_NAME}
              </span>
              <span className="block truncate text-xs text-ink/70">{email}</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className="h-10 rounded-xl px-3 text-sm leading-10 font-bold text-tamarindo"
              >
                Ver menú
              </Link>
              <form action={signOut}>
                <button type="submit" className="h-10 rounded-xl bg-white px-3 text-sm font-bold text-chile-dark shadow-sm">
                  Salir
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28">{children}</main>
        <AdminNav />
      </div>
    </ToastProvider>
  );
}
