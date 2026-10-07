import Link from "next/link";
import { BallIcon } from "@/components/catalog/icons";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <BallIcon className="size-16" />
      <h1 className="font-display text-3xl font-bold text-tamarindo">¡Fuera de la cancha!</h1>
      <p className="text-ink/70">Esta página no existe. Vuelve al menú para hacer tu pedido.</p>
      <Link
        href="/"
        className="grid h-14 place-items-center rounded-2xl bg-mango px-8 font-display text-lg font-semibold text-tamarindo-dark"
      >
        Ir al menú
      </Link>
    </main>
  );
}
