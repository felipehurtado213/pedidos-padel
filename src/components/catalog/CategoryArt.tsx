import type { ProductCategory } from "@/types/db";

/**
 * Ilustración ligera (SVG inline, ~1 KB) que se muestra cuando el producto
 * aún no tiene foto. No hace peticiones de red.
 */
export function CategoryArt({ category, className }: { category: ProductCategory; className?: string }) {
  const id = `g-${category}`;
  const bg: Record<ProductCategory, [string, string]> = {
    bebidas: ["#ffeab3", "#fdc9b4"],
    helados: ["#e5f3c8", "#ffeab3"],
    snacks: ["#ffeab3", "#e5f3c8"],
    otros: ["#ecdccb", "#ffeab3"],
  };

  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" role="presentation">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg[category][0]} />
          <stop offset="1" stopColor={bg[category][1]} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#${id})`} />
      <circle cx="98" cy="18" r="26" fill="#fff" opacity=".35" />

      {category === "bebidas" && (
        <g>
          {/* pitillo */}
          <rect x="66" y="16" width="6" height="44" rx="3" fill="#e4572e" transform="rotate(14 69 38)" />
          {/* vaso con borde de chamoy y cubos de hielo */}
          <path d="M34 40h52l-7 58a8 8 0 0 1-8 7H49a8 8 0 0 1-8-7z" fill="#fff" opacity=".9" />
          <path d="M37 52h46l-5 45a6 6 0 0 1-6 5H48a6 6 0 0 1-6-5z" fill="#8a4a24" />
          <rect x="44" y="56" width="11" height="11" rx="2.5" fill="#fff" opacity=".55" transform="rotate(-10 49 61)" />
          <rect x="60" y="62" width="11" height="11" rx="2.5" fill="#fff" opacity=".5" transform="rotate(12 65 67)" />
          <path d="M34 40h52v6H34z" fill="#c2321c" />
          {/* gotas de chamoy */}
          <path d="M42 46h4v5a2 2 0 0 1-4 0z" fill="#c2321c" />
          <path d="M60 46h4v8a2 2 0 0 1-4 0z" fill="#c2321c" />
          <path d="M74 46h4v4a2 2 0 0 1-4 0z" fill="#c2321c" />
          {/* rodaja de limón */}
          <circle cx="86" cy="42" r="12" fill="#7cb518" />
          <circle cx="86" cy="42" r="9" fill="#e5f3c8" />
          <path d="M86 33v18M77 42h18M80 36l12 12M92 36 80 48" stroke="#7cb518" strokeWidth="1.4" />
        </g>
      )}

      {category === "helados" && (
        <g>
          <rect x="55" y="78" width="10" height="30" rx="5" fill="#d9b48a" />
          <path d="M38 40a22 22 0 0 1 44 0v38a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6z" fill="#ffb627" />
          <path d="M38 62h44v16a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6z" fill="#e4572e" opacity=".85" />
          <circle cx="82" cy="34" r="8" fill={bg.helados[0]} />
          <path d="M47 34q4-8 10-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".7" />
        </g>
      )}

      {category === "snacks" && (
        <g>
          {/* tiras de mango biche */}
          <rect x="40" y="22" width="9" height="52" rx="4" fill="#b6d84a" transform="rotate(-12 44 48)" />
          <rect x="54" y="16" width="9" height="56" rx="4" fill="#cde06a" />
          <rect x="68" y="20" width="9" height="54" rx="4" fill="#a8cf3a" transform="rotate(12 72 47)" />
          {/* pimienta */}
          <circle cx="58" cy="30" r="1.5" fill="#2b1a10" />
          <circle cx="45" cy="40" r="1.3" fill="#2b1a10" />
          <circle cx="73" cy="36" r="1.5" fill="#2b1a10" />
          <circle cx="59" cy="48" r="1.2" fill="#2b1a10" />
          <circle cx="71" cy="52" r="1.2" fill="#2b1a10" />
          {/* vaso de papel */}
          <path d="M32 62h56l-8 44H40z" fill="#fff" />
          <path d="M36 74h48l-2 10H38z" fill="#7cb518" />
        </g>
      )}

      {category === "otros" && (
        <g>
          <circle cx="60" cy="64" r="30" fill="#ffb627" />
          <path d="M60 34c10 14 10 46 0 60M30 64h60" stroke="#fff" strokeWidth="4" fill="none" opacity=".8" />
        </g>
      )}
    </svg>
  );
}
