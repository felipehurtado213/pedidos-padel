import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { bogotaDateStart, bogotaDayStart, bogotaToday } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS, formatDay, formatQty } from "@/lib/labels";
import type { DashboardStats } from "@/types/db";
import { HourChart } from "./HourChart";
import { RangeFilter, type Range } from "./RangeFilter";

export const metadata = { title: "Estadísticas" };

const DAY_MS = 86_400_000;
const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Traduce ?rango=&desde=&hasta= a un intervalo [from, to) en UTC. Valores inválidos → "hoy". */
function resolveRange(params: Record<string, string | string[] | undefined>): {
  range: Range;
  from: Date | null;
  to: Date | null;
  label: string;
  desde: string;
  hasta: string;
} {
  const today = bogotaToday();
  const rango = params.rango;
  if (rango === "todo") return { range: "todo", from: null, to: null, label: "Todo el evento", desde: today, hasta: today };

  if (rango === "fechas") {
    const desde = dateParam.safeParse(params.desde);
    const hasta = dateParam.safeParse(params.hasta);
    if (desde.success && hasta.success) {
      const [a, b] = desde.data <= hasta.data ? [desde.data, hasta.data] : [hasta.data, desde.data];
      return {
        range: "fechas",
        from: bogotaDateStart(a),
        to: new Date(bogotaDateStart(b).getTime() + DAY_MS),
        label: a === b ? formatDay(a) : `${formatDay(a)} – ${formatDay(b)}`,
        desde: a,
        hasta: b,
      };
    }
  }

  const start = bogotaDayStart();
  return { range: "hoy", from: start, to: new Date(start.getTime() + DAY_MS), label: "Hoy", desde: today, hasta: today };
}

export default async function EstadisticasPage({ searchParams }: PageProps<"/admin/estadisticas">) {
  const { supabase } = await requireAdmin();
  const r = resolveRange(await searchParams);

  const { data, error } = await supabase.rpc("get_dashboard_stats", {
    p_from: r.from?.toISOString() ?? null,
    p_to: r.to?.toISOString() ?? null,
  });
  const s = data as DashboardStats | null;

  const revenue = Number(s?.revenue ?? 0);
  const expenses = Number(s?.expenses ?? 0);
  const net = revenue - expenses;
  const units = Number(s?.units ?? 0);
  const salesCount = Number(s?.sales_count ?? 0);
  const cogs = Number(s?.cogs ?? 0);
  const top = s?.top_products ?? [];
  const maxUnits = Math.max(1, ...top.map((t) => Number(t.units)));
  const stock = (s?.stock ?? []).filter((p) => p.is_active);
  const maxStock = Math.max(1, ...stock.map((p) => p.stock));
  const byCategory = s?.expenses_by_category ?? [];
  const bySupply = s?.expenses_by_supply ?? [];
  const maxSupply = Math.max(1, ...bySupply.map((x) => Number(x.amount)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-tamarindo">Números</h1>
        <p className="text-sm text-ink/70">{r.label}</p>
      </div>

      <RangeFilter
        key={`${r.range}${r.desde}${r.hasta}`}
        range={r.range}
        desde={r.desde}
        hasta={r.hasta}
        today={bogotaToday()}
      />

      {error && (
        <p role="alert" className="rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          No se pudieron cargar las estadísticas.
        </p>
      )}

      {/* Tarjetas principales */}
      <section aria-label="Resumen" className="grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-3xl bg-white p-4 shadow-card">
          <p className="text-xs font-extrabold tracking-wide text-ink/70 uppercase">
            {net >= 0 ? "Ganancia neta" : "Pérdida neta"}
          </p>
          <p
            className={`font-display text-4xl font-bold tabular-nums ${net >= 0 ? "text-limon-dark" : "text-chile-dark"}`}
          >
            {formatCOP(net)}
          </p>
          <p className="text-sm text-ink/70">Ingresos − gastos registrados</p>
        </div>
        <Stat label="Ingresos" value={formatCOP(revenue)} />
        <Stat label="Gastos" value={formatCOP(expenses)} />
        <Stat label="Unidades" value={String(units)} sub="vendidas" />
        <Stat
          label="Ventas"
          value={String(salesCount)}
          sub={salesCount > 0 ? `Ticket prom. ${formatCOP(Math.round(revenue / salesCount))}` : undefined}
        />
      </section>
      {cogs > 0 && (
        <p className="-mt-2 rounded-2xl bg-mango-soft/70 px-4 py-2 text-sm">
          Margen bruto estimado según costos unitarios: <strong>{formatCOP(revenue - cogs)}</strong> (
          {Math.round(((revenue - cogs) / Math.max(1, revenue)) * 100)}%). Es una referencia: la ganancia neta ya
          descuenta lo que registraste como gasto.
        </p>
      )}

      {/* Ranking */}
      <Card title="Más vendidos">
        {top.length === 0 ? (
          <Empty>Sin ventas en este rango.</Empty>
        ) : (
          <ol className="space-y-2.5">
            {top.map((t, i) => (
              <li key={t.product_id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-bold">
                    {i + 1}. {t.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-ink/70">
                    {t.units} uds · {formatCOP(Number(t.revenue))}
                  </span>
                </div>
                <Bar ratio={Number(t.units) / maxUnits} />
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Ventas por hora */}
      <Card title="Ventas por hora" subtitle="Unidades vendidas en cada hora (hora de Colombia)">
        {(s?.by_hour ?? []).length === 0 ? (
          <Empty>Sin ventas en este rango.</Empty>
        ) : (
          <HourChart data={(s?.by_hour ?? []).map((h) => ({ ...h, units: Number(h.units), revenue: Number(h.revenue) }))} />
        )}
      </Card>

      {/* Stock restante */}
      <Card title="Stock restante" subtitle="Productos activos · ahora mismo">
        {stock.length === 0 ? (
          <Empty>No hay productos activos.</Empty>
        ) : (
          <ul className="space-y-2.5">
            {stock.map((p) => {
              const out = p.stock === 0;
              const low = !out && p.stock <= p.low_stock_threshold;
              return (
                <li key={p.product_id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-bold">{p.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {out ? (
                        <span className="font-bold text-chile-dark">✕ Agotado</span>
                      ) : low ? (
                        <span className="font-bold text-chile-dark">⚠ {p.stock} · ¡poco!</span>
                      ) : (
                        <span className="text-ink/70">{p.stock}</span>
                      )}
                    </span>
                  </div>
                  <Bar ratio={p.stock / maxStock} tone={out || low ? "alert" : "neutral"} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Gastos */}
      <Card title="Gastos del rango" subtitle={`Total ${formatCOP(expenses)}`}>
        {byCategory.length === 0 ? (
          <Empty>Sin gastos en este rango.</Empty>
        ) : (
          <>
            <ul className="mb-4 flex flex-wrap gap-1.5 text-sm">
              {byCategory.map((c) => (
                <li key={c.category} className="rounded-full bg-crema px-2.5 py-1 font-bold text-tamarindo">
                  {EXPENSE_CATEGORY_LABELS[c.category]} {formatCOP(Number(c.amount))}
                </li>
              ))}
            </ul>
            {bySupply.length > 0 && (
              <>
                <h3 className="mb-2 text-sm font-extrabold tracking-wide text-ink/70 uppercase">Por insumo</h3>
                <ul className="space-y-2.5">
                  {bySupply.map((x) => (
                    <li key={x.supply_id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-bold">
                          {x.name}
                          {x.quantity != null && (
                            <span className="font-normal text-ink/70">
                              {" "}
                              · {formatQty(x.quantity)} {x.unit}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 tabular-nums text-ink/70">{formatCOP(Number(x.amount))}</span>
                      </div>
                      <Bar ratio={Number(x.amount) / maxSupply} tone="neutral" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <p className="text-xs font-extrabold tracking-wide text-ink/70 uppercase">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums text-tamarindo-dark">{value}</p>
      {sub && <p className="text-sm text-ink/70 tabular-nums">{sub}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-card" aria-label={title}>
      <h2 className="font-display text-xl font-semibold text-tamarindo">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-ink/70">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-ink/70">{children}</p>;
}

/** Barra horizontal fina: extremo redondeado, base recta, sin borde. */
function Bar({ ratio, tone = "brand" }: { ratio: number; tone?: "brand" | "neutral" | "alert" }) {
  const color = tone === "brand" ? "bg-chile" : tone === "alert" ? "bg-chile-dark" : "bg-tamarindo/45";
  return (
    <div className="h-2.5 w-full rounded-r bg-crema" aria-hidden>
      <div
        className={`h-full rounded-r ${color}`}
        style={{ width: `${Math.max(ratio > 0 ? 2 : 0, Math.min(100, ratio * 100))}%` }}
      />
    </div>
  );
}
