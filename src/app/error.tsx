"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-3xl font-bold text-tamarindo">Ups, algo salió mal</p>
      <p className="text-ink/70">Revisa tu conexión e inténtalo de nuevo.</p>
      <button
        type="button"
        onClick={reset}
        className="h-14 rounded-2xl bg-mango px-8 font-display text-lg font-semibold text-tamarindo-dark"
      >
        Reintentar
      </button>
    </main>
  );
}
