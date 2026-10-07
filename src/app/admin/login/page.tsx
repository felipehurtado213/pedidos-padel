import { redirect } from "next/navigation";
import { BallIcon } from "@/components/catalog/icons";
import { getAdmin, safeAdminPath } from "@/lib/auth";
import { env } from "@/lib/env";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const next = safeAdminPath(params.next);

  // Si ya es admin, directo al panel.
  const admin = await getAdmin();
  if (admin.isAdmin) redirect(next);

  const initialError =
    params.error === "no-admin" || (admin.userId && !admin.isAdmin)
      ? "Esta cuenta no tiene permisos de administrador."
      : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <BallIcon className="size-12" />
        <h1 className="mt-3 font-display text-3xl font-bold text-tamarindo">Panel de ventas</h1>
        <p className="text-ink/70">{env.NEXT_PUBLIC_BUSINESS_NAME}</p>
        <LoginForm next={next} initialError={initialError} />
      </div>
    </main>
  );
}
