"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Hoja inferior (bottom sheet) en celular / modal centrado en pantallas grandes.
 * Usa <dialog> nativo: foco atrapado, tecla Esc y accesibilidad gratis.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Tocar fuera del contenido (el fondo) cierra.
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="sheet-title"
      className="animate-fade-up m-0 mx-auto mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-crema p-0 text-ink shadow-2xl backdrop:bg-ink/50 sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      {open && (
        <div className="px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div aria-hidden className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-tamarindo/20 sm:hidden" />
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="sheet-title" className="font-display text-2xl font-bold text-tamarindo">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-2xl leading-none text-tamarindo shadow-sm"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
