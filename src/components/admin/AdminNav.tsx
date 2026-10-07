"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/admin",
    label: "Vender",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
    ),
  },
  {
    href: "/admin/inventario",
    label: "Inventario",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />
      </svg>
    ),
  },
  {
    href: "/admin/gastos",
    label: "Gastos",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </svg>
    ),
  },
  {
    href: "/admin/estadisticas",
    label: "Números",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    href: "/admin/qr",
    label: "QR",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3M21 14v7h-7" />
      </svg>
    ),
  },
];

/** Barra de pestañas inferior: al alcance del pulgar. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones del panel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-arena bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold transition ${
                  active ? "text-chile-dark" : "text-tamarindo/80"
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition ${active ? "bg-chile-soft" : ""}`}
                >
                  <span className="size-6">{item.icon}</span>
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
