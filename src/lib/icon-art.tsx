/**
 * Ícono de la app (para next/og ImageResponse): pelota de pádel sobre degradado mango → chile.
 * `padding` deja margen para íconos "maskable" (Android recorta en círculo/gota).
 */
export function IconArt({ size, padding = 0.18 }: { size: number; padding?: number }) {
  const ball = Math.round(size * (1 - padding * 2));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ffb627 0%, #ffb627 45%, #e4572e 100%)",
      }}
    >
      <svg width={ball} height={ball} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="#d7ec3a" />
        <circle cx="24" cy="24" r="22" fill="none" stroke="#4a2612" strokeOpacity="0.15" strokeWidth="1.5" />
        <path
          d="M6 14c8 4 10 16 4 26M42 34c-8-4-10-16-4-26"
          stroke="#ffffff"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
