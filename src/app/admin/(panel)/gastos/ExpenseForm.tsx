"use client";

import { useState, useTransition } from "react";
import { Field, MoneyInput, inputClass } from "@/components/admin/inputs";
import { useToast } from "@/components/admin/Toaster";
import { bogotaToday } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS, formatQty } from "@/lib/labels";
import { expenseSchema, parseDecimal } from "@/lib/validation/expense";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseDetailed, type Supply } from "@/types/db";
import { createExpense, deleteExpense, updateExpense } from "./actions";

interface Props {
  expense: ExpenseDetailed | null; // null = nuevo
  presetSupply: Supply | null; // al tocar un insumo del registro rápido
  supplies: Supply[];
  onClose: () => void;
}

export function ExpenseForm({ expense, presetSupply, supplies, onClose }: Props) {
  const toast = useToast();
  const isNew = expense === null;
  const initialSupply = expense ? supplies.find((s) => s.id === expense.supply_id) ?? null : presetSupply;

  const [supplyId, setSupplyId] = useState<string>(initialSupply?.id ?? "");
  const [quantity, setQuantity] = useState(
    expense ? formatQty(expense.quantity) : presetSupply ? "1" : "",
  );
  const [amount, setAmount] = useState(
    expense ? String(expense.amount) : presetSupply?.default_unit_cost ? String(presetSupply.default_unit_cost) : "",
  );
  const [amountTouched, setAmountTouched] = useState(!isNew);
  const [description, setDescription] = useState(expense?.description ?? presetSupply?.name ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(
    expense?.category ?? presetSupply?.category ?? "insumos",
  );
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? bogotaToday());
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const supply = supplies.find((s) => s.id === supplyId) ?? null;

  /** Si no has escrito el monto a mano, se calcula: cantidad × costo por unidad del insumo. */
  function autoAmount(nextSupply: Supply | null, qtyText: string) {
    if (amountTouched || !nextSupply?.default_unit_cost) return;
    const q = parseDecimal(qtyText);
    if (q && q > 0) setAmount(String(Math.round(q * nextSupply.default_unit_cost)));
  }

  function chooseSupply(id: string) {
    const next = supplies.find((s) => s.id === id) ?? null;
    const prevName = supply?.name ?? "";
    setSupplyId(id);
    if (next) {
      setCategory(next.category);
      if (!description || description === prevName) setDescription(next.name);
      const q = quantity || "1";
      if (!quantity) setQuantity("1");
      autoAmount(next, q);
    } else {
      setQuantity("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = supplyId ? parseDecimal(quantity) : null;
    if (Number.isNaN(q)) return setError("Cantidad inválida.");

    const check = expenseSchema.safeParse({
      description,
      amount: amount === "" ? NaN : Number(amount),
      category,
      spent_on: spentOn,
      supply_id: supplyId || null,
      quantity: q,
    });
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Revisa los datos.");
    setError(null);

    startTransition(async () => {
      const r = isNew ? await createExpense(check.data) : await updateExpense(expense.id, check.data);
      if (!r.ok) return setError(r.error);
      toast(isNew ? `Gasto registrado · ${formatCOP(check.data.amount)}` : "Gasto actualizado", "success");
      onClose();
    });
  }

  function handleDelete() {
    if (!expense) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const r = await deleteExpense(expense.id);
      if (!r.ok) {
        setConfirmDelete(false);
        return setError(r.error);
      }
      toast("Gasto eliminado", "success");
      onClose();
    });
  }

  const activeSupplies = supplies.filter((s) => s.is_active || s.id === supplyId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Insumo" htmlFor="ef-supply" hint="Opcional. Elige uno para llevar la cuenta por insumo.">
        <select id="ef-supply" value={supplyId} onChange={(e) => chooseSupply(e.target.value)} className={inputClass}>
          <option value="">— Otro gasto (sin insumo) —</option>
          {activeSupplies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.unit})
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        {supply && (
          <Field label={`Cantidad (${supply.unit})`} htmlFor="ef-qty">
            <input
              id="ef-qty"
              value={quantity}
              inputMode="decimal"
              autoComplete="off"
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.,]/g, "").slice(0, 9);
                setQuantity(v);
                autoAmount(supply, v);
              }}
              className={`${inputClass} font-semibold tabular-nums`}
              placeholder="1"
            />
          </Field>
        )}
        <Field
          label="Monto total"
          htmlFor="ef-amount"
          hint={supply?.default_unit_cost ? `${formatCOP(supply.default_unit_cost)} por ${supply.unit}` : undefined}
        >
          <MoneyInput
            id="ef-amount"
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setAmountTouched(true);
            }}
            placeholder="15.000"
          />
        </Field>
      </div>

      <Field label="Descripción" htmlFor="ef-desc">
        <input
          id="ef-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
          className={inputClass}
          placeholder="Ej: Taxi al club, bolsas de hielo…"
        />
      </Field>

      <Field label="Categoría" htmlFor="ef-cat">
        <div id="ef-cat" role="radiogroup" className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={`h-11 rounded-xl px-3 text-sm font-bold transition ${
                category === c ? "bg-tamarindo text-white" : "bg-white text-tamarindo shadow-sm"
              }`}
            >
              {EXPENSE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Fecha" htmlFor="ef-date">
        <input
          id="ef-date"
          type="date"
          value={spentOn}
          max={bogotaToday()}
          onChange={(e) => setSpentOn(e.target.value)}
          className={inputClass}
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-2xl bg-tamarindo font-display text-xl font-semibold text-white shadow-[0_4px_0_0_#4a2612] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        {pending ? "Guardando…" : `${isNew ? "Registrar" : "Guardar"}${amount ? ` · ${formatCOP(Number(amount))}` : ""}`}
      </button>

      {!isNew && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={`h-12 w-full rounded-2xl font-bold ${confirmDelete ? "bg-chile-dark text-white" : "text-chile-dark"}`}
        >
          {confirmDelete ? "¿Seguro? Toca otra vez para eliminar" : "Eliminar gasto"}
        </button>
      )}
    </form>
  );
}
