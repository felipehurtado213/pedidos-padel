/** Esqueleto mientras carga una sección del panel. */
export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-arena" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/70" />
      ))}
    </div>
  );
}
