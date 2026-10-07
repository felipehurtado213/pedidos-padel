import { requireAdmin } from "@/lib/auth";
import type { ExpenseDetailed, Supply } from "@/types/db";
import { ExpensesManager } from "./ExpensesManager";

export const metadata = { title: "Gastos" };

export default async function GastosPage() {
  const { supabase } = await requireAdmin();

  const [expensesRes, suppliesRes] = await Promise.all([
    supabase
      .from("expenses_detailed")
      .select("*")
      .order("spent_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000)
      .returns<ExpenseDetailed[]>(),
    supabase.from("supplies").select("*").order("name").returns<Supply[]>(),
  ]);

  // Normaliza la fecha a "YYYY-MM-DD" y la cantidad a número (numeric puede llegar como texto).
  const expenses = (expensesRes.data ?? []).map((e) => ({
    ...e,
    spent_on: String(e.spent_on).slice(0, 10),
    quantity: e.quantity == null ? null : Number(e.quantity),
  }));

  return (
    <ExpensesManager
      expenses={expenses}
      supplies={suppliesRes.data ?? []}
      loadError={expensesRes.error || suppliesRes.error ? "No se pudieron cargar los gastos." : null}
    />
  );
}
