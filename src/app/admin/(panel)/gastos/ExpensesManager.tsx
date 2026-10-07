"use client";

import { useState } from "react";
import { Sheet } from "@/components/admin/Sheet";
import { formatCOP } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS, formatDay, formatQty } from "@/lib/labels";
import type { ExpenseCategory, ExpenseDetailed, Supply } from "@/types/db";
import { ExpenseForm } from "./ExpenseForm";
import { SupplyForm } from "./SupplyForm";

type Tab = "gastos" | "insumos";
type ExpenseSheet = { kind: "new"; supply: Supply | null } | { kind: "edit"; id: number } | null;
type SupplySheet = { kind: "new" } | { kind: "edit"; id: string } | null;

interface Props {
  expenses: ExpenseDetailed[];
  supplies: Supply[];
  loadError: string | null;
}

export function ExpensesManager({ expenses, supplies, loadError }: Props) {
  const [tab, setTab] = useState<Tab>("gastos");
  const [expenseSheet, setExpenseSheet] = useState<ExpenseSheet>(null);
  const [supplySheet, setSupplySheet] = useState<SupplySheet>(null);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  // Agrupar por día (ya vienen ordenados de más reciente a más antiguo).
  const days: { day: string; items: ExpenseDetailed[]; sum: number }[] = [];
  for (const e of expenses) {
    const last = days[days.length - 1];
    if (last?.day === e.spent_on) {
      last.items.push(e);
      last.sum += e.amount;
    } else days.push({ day: e.spent_on, items: [e], sum: e.amount });
  }

  const editingExpense = expenseSheet?.kind === "edit" ? expenses.find((e) => e.id === expenseSheet.id) ?? null : null;
  const editingSupply = supplySheet?.kind === "edit" ? supplies.find((s) => s.id === supplySheet.id) ?? null : null;
  const activeSupplies = supplies.filter((s) => s.is_active);

  return (
    <>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-tamarindo">Gastos</h1>
        <button
          type="button"
          onClick={() => (tab === "gastos" ? setExpenseSheet({ kind: "new", supply: null }) : setSupplySheet({ kind: "new" }))}
          className="h-12 shrink-0 rounded-2xl bg-tamarindo px-4 font-display text-lg font-semibold text-white shadow-[0_3px_0_0_#4a2612] active:translate-y-0.5 active:shadow-none"
        >
          {tab === "gastos" ? "+ Gasto" : "+ Insumo"}
        </button>
      </div>

      <div role="tablist" aria-label="Sección" className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-sm">
        {(["gastos", "insumos"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-11 rounded-xl font-bold transition ${tab === t ? "bg-mango text-tamarindo-dark" : "text-tamarindo/70"}`}
          >
            {t === "gastos" ? "Gastos" : `Insumos (${supplies.length})`}
          </button>
        ))}
      </div>

      {loadError && (
        <p role="alert" className="mb-4 rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {loadError}
        </p>
      )}

      {tab === "gastos" ? (
        <>
          {/* Total */}
          <section className="mb-4 rounded-3xl bg-white p-4 shadow-card" aria-label="Total gastado">
            <p className="text-xs font-extrabold tracking-wide text-ink/70 uppercase">Total gastado</p>
            <p className="font-display text-3xl font-bold tabular-nums text-tamarindo-dark">{formatCOP(total)}</p>
            {byCategory.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
                {byCategory.map(([cat, sum]) => (
                  <li key={cat} className="rounded-full bg-crema px-2.5 py-1 font-bold text-tamarindo">
                    {EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory]} {formatCOP(sum)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Registro rápido por insumo */}
          {activeSupplies.length > 0 && (
            <section className="mb-5" aria-labelledby="quick-exp">
              <h2 id="quick-exp" className="mb-2 font-display text-lg font-semibold text-tamarindo">
                Registro rápido
              </h2>
              <div className="flex flex-wrap gap-2">
                {activeSupplies.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setExpenseSheet({ kind: "new", supply: s })}
                    className="h-11 rounded-xl bg-white px-3 font-bold text-tamarindo-dark shadow-sm active:scale-95"
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Lista por día */}
          {days.length === 0 ? (
            <p className="rounded-3xl bg-white p-6 text-center shadow-card">
              Aún no hay gastos. Usa el registro rápido o “+ Gasto”.
            </p>
          ) : (
            <div className="space-y-4">
              {days.map(({ day, items, sum }) => (
                <section key={day} aria-label={formatDay(day)}>
                  <div className="mb-1.5 flex items-baseline justify-between px-1">
                    <h3 className="font-bold text-tamarindo">{formatDay(day)}</h3>
                    <span className="text-sm font-bold text-ink/70 tabular-nums">{formatCOP(sum)}</span>
                  </div>
                  <ul className="divide-y divide-arena rounded-2xl bg-white shadow-sm">
                    {items.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => setExpenseSheet({ kind: "edit", id: e.id })}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold">{e.description}</span>
                            <span className="block text-sm text-ink/70">
                              {EXPENSE_CATEGORY_LABELS[e.category]}
                              {e.supply_name && e.quantity != null && ` · ${formatQty(e.quantity)} ${e.supply_unit}`}
                            </span>
                          </span>
                          <span className="font-display text-lg font-semibold tabular-nums text-tamarindo-dark">
                            {formatCOP(e.amount)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/70">
            Cosas que no se venden pero cuestan: bolsas, guantes, limones, vasos… Tócalas en “Registro rápido”
            para anotar el gasto en segundos.
          </p>
          {supplies.length === 0 ? (
            <p className="rounded-3xl bg-white p-6 text-center shadow-card">Aún no hay insumos. Crea uno con “+ Insumo”.</p>
          ) : (
            <ul className="divide-y divide-arena rounded-2xl bg-white shadow-sm">
              {supplies.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSupplySheet({ kind: "edit", id: s.id })}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${s.is_active ? "" : "opacity-55"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">
                        {s.name}
                        {!s.is_active && <span className="ml-2 text-xs font-bold text-ink/70">(oculto)</span>}
                      </span>
                      <span className="block text-sm text-ink/70">
                        {EXPENSE_CATEGORY_LABELS[s.category]} · por {s.unit}
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums text-tamarindo">
                      {s.default_unit_cost != null ? formatCOP(s.default_unit_cost) : "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Sheet
        open={expenseSheet !== null}
        onClose={() => setExpenseSheet(null)}
        title={
          expenseSheet?.kind === "edit"
            ? "Editar gasto"
            : expenseSheet?.supply
              ? `Gasto · ${expenseSheet.supply.name}`
              : "Nuevo gasto"
        }
      >
        {expenseSheet && (
          <ExpenseForm
            key={expenseSheet.kind === "edit" ? `e${expenseSheet.id}` : `n${expenseSheet.supply?.id ?? ""}`}
            expense={editingExpense}
            presetSupply={expenseSheet.kind === "new" ? expenseSheet.supply : null}
            supplies={supplies}
            onClose={() => setExpenseSheet(null)}
          />
        )}
      </Sheet>

      <Sheet
        open={supplySheet !== null}
        onClose={() => setSupplySheet(null)}
        title={supplySheet?.kind === "edit" ? "Editar insumo" : "Nuevo insumo"}
      >
        {supplySheet && (
          <SupplyForm
            key={supplySheet.kind === "edit" ? supplySheet.id : "new"}
            supply={editingSupply}
            onClose={() => setSupplySheet(null)}
          />
        )}
      </Sheet>
    </>
  );
}
