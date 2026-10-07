/** Tipos de dominio que reflejan supabase/schema.sql. */

export const PRODUCT_CATEGORIES = ["bebidas", "helados", "snacks", "otros"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const EXPENSE_CATEGORIES = ["insumos", "transporte", "hielo", "empaques", "otros"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type StockReason = "venta" | "reposicion" | "ajuste" | "deshacer";

/** Fila de la vista public_products (lo único que ve el público). */
export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  image_url: string | null;
  price: number;
  available: boolean;
  sort_order: number;
}

/** Fila completa de products (solo admin). */
export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  image_url: string | null;
  price: number;
  unit_cost: number | null;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SaleDetailed {
  id: number;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number | null;
  total: number;
  created_at: string;
}

export interface StockMovement {
  id: number;
  product_id: string;
  delta: number;
  reason: StockReason;
  sale_id: number | null;
  note: string | null;
  created_at: string;
}

/** Insumo que no se vende pero genera gasto (bolsas, guantes, limones...). */
export interface Supply {
  id: string;
  name: string;
  unit: string; // "unidad", "paquete", "kg", "caja"...
  category: ExpenseCategory;
  default_unit_cost: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: ExpenseCategory;
  spent_on: string; // YYYY-MM-DD
  supply_id: string | null;
  quantity: number | null;
  created_at: string;
  updated_at: string;
}

/** Fila de la vista expenses_detailed (gasto + datos del insumo). */
export interface ExpenseDetailed extends Expense {
  supply_name: string | null;
  supply_unit: string | null;
}

/** Respuesta de register_sale / undo_sale. */
export interface SaleResult {
  sale_id: number;
  product_id: string;
  quantity: number;
  total: number;
  stock: number;
}

/** Respuesta de get_dashboard_stats. */
export interface DashboardStats {
  revenue: number;
  units: number;
  sales_count: number;
  cogs: number;
  expenses: number;
  top_products: { product_id: string; name: string; units: number; revenue: number }[];
  by_hour: { hour: number; units: number; revenue: number }[];
  expenses_by_category: { category: ExpenseCategory; amount: number }[];
  expenses_by_supply: {
    supply_id: string;
    name: string;
    unit: string;
    quantity: number | null;
    amount: number;
  }[];
  stock: {
    product_id: string;
    name: string;
    stock: number;
    low_stock_threshold: number;
    is_active: boolean;
  }[];
}
