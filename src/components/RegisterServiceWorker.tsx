"use client";

import { useEffect } from "react";

/** Registra /sw.js solo en producción (en desarrollo estorba con la recarga en caliente). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sin SW la app funciona igual */
    });
  }, []);
  return null;
}
