"use client";

import { useEffect } from "react";

/** Error dentro del panel: se mantiene la barra inferior para seguir vendiendo en otras secciones. */
export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[panel]", error.digest ?? error.message);
  }, [error]);

  return (
    <section role="alert" className="rounded-3xl bg-white p-6 text-center shadow-card">
      <h1 className="font-display text-2xl font-bold text-tamarindo">No se pudo cargar esta sección</h1>
      <p className="mt-1 text-ink/70">Puede ser la señal. Tus datos están a salvo.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 h-14 rounded-2xl bg-mango px-8 font-display text-lg font-semibold text-tamarindo-dark"
      >
        Reintentar
      </button>
    </section>
  );
}
