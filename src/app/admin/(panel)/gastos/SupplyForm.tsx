"use client";

import { useState, useTransition } from "react";
import { Field, MoneyInput, Toggle, inputClass } from "@/components/admin/inputs";
import { useToast } from "@/components/admin/Toaster";
import { EXPENSE_CATEGORY_LABELS, UNIT_SUGGESTIONS } from "@/lib/labels";
import { supplySchema } from "@/lib/validation/expense";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Supply } from "@/types/db";
import { createSupply, deleteSupply, updateSupply } from "./actions";

export function SupplyForm({ supply, onClose }: { supply: Supply | null; onClose: () => void }) {
  const toast = useToast();
  const isNew = supply === null;
  const [name, setName] = useState(supply?.name ?? "");
  const [unit, setUnit] = useState(supply?.unit ?? "unidad");
  const [category, setCategory] = useState<ExpenseCategory>(supply?.category ?? "insumos");
  const [cost, setCost] = useState(supply?.default_unit_cost != null ? String(supply.default_unit_cost) : "");
  const [isActive, setIsActive] = useState(supply?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const check = supplySchema.safeParse({
      name,
      unit,
      category,
      default_unit_cost: cost === "" ? null : Number(cost),
      is_active: isActive,
    });
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Revisa los datos.");
    setError(null);
    startTransition(async () => {
      const r = isNew ? await createSupply(check.data) : await updateSupply(supply.id, check.data);
      if (!r.ok) return setError(r.error);
      toast(isNew ? "Insumo creado" : "Insumo actualizado", "success");
      onClose();
    });
  }

  function handleDelete() {
    if (!supply) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const r = await deleteSupply(supply.id);
      if (!r.ok) {
        setConfirmDelete(false);
        return setError(r.error);
      }
      toast("Insumo eliminado (sus gastos se conservan)", "success");
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Nombre" htmlFor="sf-name">
        <input
          id="sf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className={inputClass}
          placeholder="Ej: Guantes, Limones, Vasos…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Unidad" htmlFor="sf-unit">
          <input
            id="sf-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={20}
            list="unit-suggestions"
            className={inputClass}
          />
          <datalist id="unit-suggestions">
            {UNIT_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
        <Field label="Costo por unidad" htmlFor="sf-cost" hint="Opcional: autocompleta el monto">
          <MoneyInput id="sf-cost" value={cost} onChange={setCost} placeholder="—" />
        </Field>
      </div>

      <Field label="Categoría" htmlFor="sf-cat">
        <div id="sf-cat" role="radiogroup" className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={`h-11 rounded-xl px-3 text-sm font-bold ${
                category === c ? "bg-tamarindo text-white" : "bg-white text-tamarindo shadow-sm"
              }`}
            >
              {EXPENSE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Field>

      <Toggle
        checked={isActive}
        onChange={setIsActive}
        label={isActive ? "Visible en registro rápido" : "Oculto del registro rápido"}
        description="Los gastos anteriores no se ven afectados"
      />

      {error && (
        <p role="alert" className="rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-2xl bg-limon-dark font-display text-xl font-semibold text-white shadow-[0_4px_0_0_#365807] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        {pending ? "Guardando…" : isNew ? "Crear insumo" : "Guardar"}
      </button>

      {!isNew && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={`h-12 w-full rounded-2xl font-bold ${confirmDelete ? "bg-chile-dark text-white" : "text-chile-dark"}`}
        >
          {confirmDelete ? "¿Seguro? Toca otra vez para eliminar" : "Eliminar insumo"}
        </button>
      )}
    </form>
  );
}
