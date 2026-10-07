"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="h-12 rounded-2xl bg-white font-bold text-tamarindo shadow-sm active:scale-[0.98]"
      aria-live="polite"
    >
      {copied ? "✓ Enlace copiado" : "Copiar enlace del menú"}
    </button>
  );
}
