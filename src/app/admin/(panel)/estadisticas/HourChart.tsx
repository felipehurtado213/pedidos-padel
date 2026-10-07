"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCOP } from "@/lib/format";

interface HourRow {
  hour: number;
  units: number;
  revenue: number;
}

const BRAND = "#e4572e"; // chile: una sola serie → un solo color, sin leyenda
const GRID = "#efe3d1";
const AXIS_TEXT = "#6b5a4e";

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;

/** Columnas de unidades por hora. Rellena con 0 las horas vacías entre la primera y la última venta. */
export function HourChart({ data }: { data: HourRow[] }) {
  const hours = data.map((d) => d.hour);
  const min = Math.min(...hours);
  const max = Math.max(...hours);
  const filled: HourRow[] = [];
  for (let h = min; h <= max; h++) filled.push(data.find((d) => d.hour === h) ?? { hour: h, units: 0, revenue: 0 });

  const peak = filled.reduce((a, b) => (b.units > a.units ? b : a), filled[0]);

  return (
    <figure>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filled} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis
              dataKey="hour"
              tickFormatter={hourLabel}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "rgba(107,58,30,0.06)" }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as HourRow | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-xl bg-ink px-3 py-2 text-sm text-white shadow-lg">
                    <p className="font-bold">
                      {hourLabel(row.hour)} – {hourLabel((row.hour + 1) % 24)}
                    </p>
                    <p>
                      {row.units} uds · {formatCOP(row.revenue)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="units" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 text-sm text-ink/70">
        Hora pico: <strong className="text-ink">{hourLabel(peak.hour)}</strong> con {peak.units} uds ({formatCOP(peak.revenue)}).
      </figcaption>

      {/* Vista de tabla (accesible y para revisar números exactos) */}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-bold text-tamarindo">Ver tabla</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-ink/70">
            <tr>
              <th className="py-1 font-bold">Hora</th>
              <th className="py-1 text-right font-bold">Unidades</th>
              <th className="py-1 text-right font-bold">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {filled.map((r) => (
              <tr key={r.hour} className="border-t border-arena">
                <td className="py-1">{hourLabel(r.hour)}</td>
                <td className="py-1 text-right">{r.units}</td>
                <td className="py-1 text-right">{formatCOP(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
