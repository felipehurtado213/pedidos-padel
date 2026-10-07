"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-11 rounded-xl bg-tamarindo px-5 font-display text-lg font-semibold text-white"
    >
      🖨️ Imprimir
    </button>
  );
}
