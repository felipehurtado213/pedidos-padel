-- =====================================================================
--  PEDIDOS PÁDEL · Esquema completo para Supabase (Postgres)
-- ---------------------------------------------------------------------
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run.
--  Es idempotente: puedes volver a ejecutarlo sin romper nada
--  (los datos semilla solo se insertan si la tabla products está vacía).
--
--  Dinero: pesos colombianos ENTEROS (sin centavos) → columnas integer.
--  Zona horaria del negocio: America/Bogota.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Utilidades
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 1. ADMINS · quién es administrador (se llena a mano, nunca desde la app)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ¿El usuario de la sesión actual es admin?
-- SECURITY DEFINER para poder leer public.admins sin depender de sus políticas.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;


-- ---------------------------------------------------------------------
-- 2. PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(btrim(name)) between 1 and 80),
  description         text not null default '' check (char_length(description) <= 240),
  category            text not null default 'otros'
                        check (category in ('bebidas', 'helados', 'snacks', 'otros')),
  image_url           text check (image_url is null or image_url ~ '^https://'),
  price               integer not null check (price between 0 and 10000000),
  unit_cost           integer check (unit_cost is null or unit_cost between 0 and 10000000),
  stock               integer not null default 0 check (stock >= 0),   -- nunca negativo
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  is_active           boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists products_active_sort_idx on public.products (is_active, sort_order);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 2b. PROMOTIONS · combos con precio especial (ej. 2 helados por $8.000)
--     "quantity" unidades de cualquier producto de "category" (se pueden
--     mezclar sabores) por "price" en total.
-- ---------------------------------------------------------------------
create table if not exists public.promotions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  category    text not null check (category in ('bebidas', 'helados', 'snacks', 'otros')),
  quantity    integer not null check (quantity between 2 and 10),
  price       integer not null check (price between 0 and 10000000),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 3. SALES · una fila por venta registrada
-- ---------------------------------------------------------------------
create table if not exists public.sales (
  id          bigint generated always as identity primary key,
  product_id  uuid not null references public.products (id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  unit_price  integer not null check (unit_price >= 0),          -- precio congelado al vender
  unit_cost   integer check (unit_cost is null or unit_cost >= 0), -- costo congelado (opcional)
  total       integer generated always as (quantity * unit_price) stored,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Ventas de una promoción: varias filas (una por unidad) con el mismo group_id.
-- Se agregan con ALTER para que funcione también en bases ya creadas.
alter table public.sales add column if not exists group_id uuid;
alter table public.sales
  add column if not exists promotion_id uuid references public.promotions (id) on delete set null;

create index if not exists sales_created_at_idx on public.sales (created_at desc);
create index if not exists sales_product_idx    on public.sales (product_id);
create index if not exists sales_group_idx      on public.sales (group_id) where group_id is not null;


-- ---------------------------------------------------------------------
-- 4. STOCK_MOVEMENTS · bitácora de todo cambio de inventario
-- ---------------------------------------------------------------------
create table if not exists public.stock_movements (
  id          bigint generated always as identity primary key,
  product_id  uuid not null references public.products (id) on delete cascade,
  delta       integer not null check (delta <> 0),
  reason      text not null check (reason in ('venta', 'reposicion', 'ajuste', 'deshacer')),
  sale_id     bigint references public.sales (id) on delete set null,
  note        text check (note is null or char_length(note) <= 200),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

-- Al crear un producto con stock inicial, queda registrado como reposición.
create or replace function public.log_initial_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stock > 0 then
    insert into public.stock_movements (product_id, delta, reason, note)
    values (new.id, new.stock, 'reposicion', 'Stock inicial');
  end if;
  return new;
end;
$$;

drop trigger if exists products_log_initial_stock on public.products;
create trigger products_log_initial_stock
  after insert on public.products
  for each row execute function public.log_initial_stock();


-- ---------------------------------------------------------------------
-- 5a. SUPPLIES · insumos que NO se venden pero generan gasto
--     (bolsas, guantes, limones, vasos, chamoy...). Catálogo reutilizable
--     para registrar gastos rápido y ver cuánto se va en cada insumo.
-- ---------------------------------------------------------------------
create table if not exists public.supplies (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 1 and 60),
  unit              text not null default 'unidad' check (char_length(btrim(unit)) between 1 and 20),
  category          text not null default 'insumos'
                      check (category in ('insumos', 'transporte', 'hielo', 'empaques', 'otros')),
  default_unit_cost integer check (default_unit_cost is null or default_unit_cost between 0 and 10000000),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Sin duplicados tipo "Limones" / "limones".
create unique index if not exists supplies_name_unique_idx on public.supplies (lower(btrim(name)));

drop trigger if exists supplies_set_updated_at on public.supplies;
create trigger supplies_set_updated_at
  before update on public.supplies
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 5b. EXPENSES · gastos (opcionalmente ligados a un insumo)
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id          bigint generated always as identity primary key,
  description text not null check (char_length(btrim(description)) between 1 and 120),
  amount      integer not null check (amount > 0 and amount <= 100000000),
  category    text not null check (category in ('insumos', 'transporte', 'hielo', 'empaques', 'otros')),
  spent_on    date not null default ((now() at time zone 'America/Bogota')::date),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Columnas para ligar el gasto a un insumo (con ALTER para que funcione
-- también si ya habías ejecutado una versión anterior del script).
alter table public.expenses
  add column if not exists supply_id uuid references public.supplies (id) on delete set null;
alter table public.expenses
  add column if not exists quantity numeric(10, 2) check (quantity is null or quantity > 0);

create index if not exists expenses_spent_on_idx on public.expenses (spent_on desc);
create index if not exists expenses_supply_idx   on public.expenses (supply_id);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();


-- =====================================================================
-- 6. ROW LEVEL SECURITY · activado en TODAS las tablas
-- =====================================================================
alter table public.admins          enable row level security;
alter table public.products        enable row level security;
alter table public.sales           enable row level security;
alter table public.stock_movements enable row level security;
alter table public.expenses        enable row level security;
alter table public.supplies        enable row level security;
alter table public.promotions      enable row level security;

-- admins: cada usuario solo puede ver SU propia fila (para saber si es admin).
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- products: CRUD completo solo para admin. El público NO lee la tabla,
-- lee la vista public_products (sin costos ni stock exacto).
drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- sales y stock_movements: el admin solo LEE. Escribir únicamente vía RPC.
drop policy if exists sales_admin_select on public.sales;
create policy sales_admin_select on public.sales
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists stock_movements_admin_select on public.stock_movements;
create policy stock_movements_admin_select on public.stock_movements
  for select to authenticated
  using ((select public.is_admin()));

-- expenses: CRUD completo solo para admin.
drop policy if exists expenses_admin_all on public.expenses;
create policy expenses_admin_all on public.expenses
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- supplies: CRUD completo solo para admin.
drop policy if exists supplies_admin_all on public.supplies;
create policy supplies_admin_all on public.supplies
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- promotions: el admin las edita; el público solo ve las activas vía public_promotions.
drop policy if exists promotions_admin_all on public.promotions;
create policy promotions_admin_all on public.promotions
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ---------------------------------------------------------------------
-- 6b. Privilegios (defensa en profundidad, además de RLS)
-- ---------------------------------------------------------------------
-- anon (visitantes sin sesión) no toca ninguna tabla directamente.
revoke all on public.admins, public.products, public.sales,
              public.stock_movements, public.expenses, public.supplies,
              public.promotions
  from anon;

-- Nadie escribe ventas, movimientos ni admins desde la API: solo las RPC.
revoke insert, update, delete on public.sales, public.stock_movements, public.admins
  from authenticated;

-- El stock de un producto solo cambia vía RPC (para que quede en la bitácora):
-- se quita UPDATE general y se permite actualizar el resto de columnas.
revoke update on public.products from authenticated;
grant update (name, description, category, image_url, price, unit_cost,
              low_stock_threshold, is_active, sort_order)
  on public.products to authenticated;


-- =====================================================================
-- 7. VISTAS
-- =====================================================================

-- Catálogo público: solo productos activos y solo columnas seguras.
-- Corre con los permisos de su dueño (security_invoker = false) a propósito:
-- así anon puede leerla SIN tener acceso a la tabla products.
-- (El linter de Supabase avisará "Security Definer View": es intencional.)
drop view if exists public.public_products;
create view public.public_products
with (security_invoker = false) as
  select
    p.id,
    p.name,
    p.description,
    p.category,
    p.image_url,
    p.price,
    (p.stock > 0) as available,   -- solo disponible / agotado, nunca el número
    p.sort_order
  from public.products p
  where p.is_active;

revoke all on public.public_products from anon, authenticated;
grant select on public.public_products to anon, authenticated;

-- Promociones activas para el público (solo lo necesario para mostrar el aviso).
drop view if exists public.public_promotions;
create view public.public_promotions
with (security_invoker = false) as
  select pr.id, pr.name, pr.category, pr.quantity, pr.price
  from public.promotions pr
  where pr.is_active;

revoke all on public.public_promotions from anon, authenticated;
grant select on public.public_promotions to anon, authenticated;

-- Ventas con nombre de producto (para el admin). security_invoker = true:
-- respeta el RLS de sales → solo el admin ve filas.
drop view if exists public.sales_detailed;
create view public.sales_detailed
with (security_invoker = true) as
  select
    s.id,
    s.product_id,
    p.name as product_name,
    s.quantity,
    s.unit_price,
    s.unit_cost,
    s.total,
    s.created_at,
    s.group_id,
    pr.name as promotion_name
  from public.sales s
  join public.products p on p.id = s.product_id
  left join public.promotions pr on pr.id = s.promotion_id;

revoke all on public.sales_detailed from anon, authenticated;
grant select on public.sales_detailed to authenticated;

-- Gastos con nombre y unidad del insumo (si tiene). Respeta RLS (solo admin).
drop view if exists public.expenses_detailed;
create view public.expenses_detailed
with (security_invoker = true) as
  select
    e.id,
    e.description,
    e.amount,
    e.category,
    e.spent_on,
    e.supply_id,
    s.name as supply_name,
    s.unit as supply_unit,
    e.quantity,
    e.created_at,
    e.updated_at
  from public.expenses e
  left join public.supplies s on s.id = e.supply_id;

revoke all on public.expenses_detailed from anon, authenticated;
grant select on public.expenses_detailed to authenticated;


-- =====================================================================
-- 8. FUNCIONES RPC TRANSACCIONALES
--    Todas: SECURITY DEFINER + verificación is_admin() + search_path vacío.
--    Errores con códigos en inglés que el frontend traduce:
--    NOT_AUTHORIZED, INVALID_QUANTITY, INVALID_REASON, INVALID_NOTE,
--    INSUFFICIENT_STOCK, PRODUCT_NOT_FOUND, NOTHING_TO_UNDO
-- =====================================================================

-- Registrar venta: descuenta stock + crea venta + bitácora, todo o nada.
create or replace function public.register_sale(
  p_product_id uuid,
  p_quantity   integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock   integer;
  v_price   integer;
  v_cost    integer;
  v_sale_id bigint;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 200 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  -- UPDATE condicional: bloquea la fila del producto y solo descuenta si
  -- alcanza. Dos ventas simultáneas se serializan aquí → nunca stock negativo.
  update public.products
     set stock = stock - p_quantity
   where id = p_product_id
     and stock >= p_quantity
  returning stock, price, unit_cost into v_stock, v_price, v_cost;

  if not found then
    if exists (select 1 from public.products where id = p_product_id) then
      raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
    else
      raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  insert into public.sales (product_id, quantity, unit_price, unit_cost)
  values (p_product_id, p_quantity, v_price, v_cost)
  returning id into v_sale_id;

  insert into public.stock_movements (product_id, delta, reason, sale_id)
  values (p_product_id, -p_quantity, 'venta', v_sale_id);

  return jsonb_build_object(
    'sale_id',    v_sale_id,
    'product_id', p_product_id,
    'quantity',   p_quantity,
    'total',      p_quantity * v_price,
    'stock',      v_stock
  );
end;
$$;


-- Deshacer venta: si p_sale_id es null, deshace la ÚLTIMA venta registrada.
-- Si la venta es parte de una PROMOCIÓN, anula la promoción completa
-- (todas las filas del mismo group_id). Devuelve el stock, deja constancia
-- en la bitácora y borra las ventas.
create or replace function public.undo_sale(
  p_sale_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale  public.sales;
  v_row   public.sales;
  v_stock integer;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_qty   integer := 0;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  -- FOR UPDATE: si dos personas tocan "Deshacer" a la vez, no se deshace dos veces.
  if p_sale_id is null then
    select * into v_sale from public.sales order by id desc limit 1 for update;
  else
    select * into v_sale from public.sales where id = p_sale_id for update;
  end if;

  if not found then
    raise exception 'NOTHING_TO_UNDO' using errcode = 'P0002';
  end if;

  for v_row in
    select * from public.sales
     where id = v_sale.id
        or (v_sale.group_id is not null and group_id = v_sale.group_id)
     order by id
     for update
  loop
    update public.products
       set stock = stock + v_row.quantity
     where id = v_row.product_id
    returning stock into v_stock;

    insert into public.stock_movements (product_id, delta, reason, note)
    values (v_row.product_id, v_row.quantity, 'deshacer', 'Venta #' || v_row.id || ' anulada');

    delete from public.sales where id = v_row.id;

    v_items := v_items || jsonb_build_object(
      'sale_id', v_row.id, 'product_id', v_row.product_id,
      'quantity', v_row.quantity, 'stock', v_stock);
    v_total := v_total + v_row.total;
    v_qty   := v_qty + v_row.quantity;
  end loop;

  return jsonb_build_object(
    'sale_id',    v_sale.id,
    'group_id',   v_sale.group_id,
    'product_id', v_sale.product_id,
    'quantity',   v_qty,
    'total',      v_total,
    'stock',      (v_items -> 0 ->> 'stock')::int,
    'items',      v_items
  );
end;
$$;


-- Vender una PROMOCIÓN (ej. 2 helados por $8.000), todo o nada.
-- p_product_ids: un id por unidad (se puede repetir: 2 de coco = [coco, coco]).
-- El precio de la promo se reparte entre las unidades (8.000 → 4.000 + 4.000),
-- así los totales de caja y el ranking por producto cuadran exacto.
create or replace function public.register_promo_sale(
  p_promotion_id uuid,
  p_product_ids  uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_promo  public.promotions;
  v_group  uuid := gen_random_uuid();
  v_n      integer := coalesce(array_length(p_product_ids, 1), 0);
  v_base   integer;
  v_extra  integer;
  v_i      integer := 0;
  v_pid    uuid;
  v_price  integer;
  v_stock  integer;
  v_cost   integer;
  v_sale   bigint;
  v_items  jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select * into v_promo from public.promotions where id = p_promotion_id and is_active;
  if not found then
    raise exception 'PROMO_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_n <> v_promo.quantity then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  -- Todos los productos deben existir, estar activos y ser de la categoría de la promo.
  if exists (
    select 1
      from unnest(p_product_ids) as u(pid)
      left join public.products p on p.id = u.pid
     where p.id is null or p.category <> v_promo.category or not p.is_active
  ) then
    raise exception 'PROMO_INVALID_PRODUCT' using errcode = '22023';
  end if;

  -- Bloquear los productos en orden fijo (evita bloqueos cruzados entre dos celulares).
  perform 1 from public.products where id = any (p_product_ids) order by id for update;

  v_base  := v_promo.price / v_n;
  v_extra := v_promo.price - v_base * v_n;  -- si no divide exacto, el sobrante va a la 1.ª unidad

  foreach v_pid in array p_product_ids loop
    v_i := v_i + 1;
    v_price := v_base + case when v_i = 1 then v_extra else 0 end;

    update public.products
       set stock = stock - 1
     where id = v_pid and stock >= 1
    returning stock, unit_cost into v_stock, v_cost;

    if not found then
      -- Se revierte TODO lo anterior de esta llamada (nada queda a medias).
      raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
    end if;

    insert into public.sales (product_id, quantity, unit_price, unit_cost, group_id, promotion_id)
    values (v_pid, 1, v_price, v_cost, v_group, v_promo.id)
    returning id into v_sale;

    insert into public.stock_movements (product_id, delta, reason, sale_id, note)
    values (v_pid, -1, 'venta', v_sale, 'Promo: ' || v_promo.name);

    v_items := v_items || jsonb_build_object(
      'sale_id', v_sale, 'product_id', v_pid, 'stock', v_stock, 'unit_price', v_price);
  end loop;

  return jsonb_build_object(
    'group_id',  v_group,
    'promotion', v_promo.name,
    'quantity',  v_n,
    'total',     v_promo.price,
    'items',     v_items
  );
end;
$$;


-- Ajustar stock manualmente (reposición o corrección), con bitácora.
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_delta      integer,
  p_reason     text default 'ajuste',
  p_note       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock integer;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if coalesce(p_reason, '') not in ('reposicion', 'ajuste') then
    raise exception 'INVALID_REASON' using errcode = '22023';
  end if;

  if p_delta is null or p_delta = 0 or abs(p_delta) > 10000 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  if p_note is not null and char_length(p_note) > 200 then
    raise exception 'INVALID_NOTE' using errcode = '22023';
  end if;

  update public.products
     set stock = stock + p_delta
   where id = p_product_id
     and stock + p_delta >= 0
  returning stock into v_stock;

  if not found then
    if exists (select 1 from public.products where id = p_product_id) then
      raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
    else
      raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  insert into public.stock_movements (product_id, delta, reason, note)
  values (p_product_id, p_delta, p_reason, nullif(btrim(p_note), ''));

  return jsonb_build_object('product_id', p_product_id, 'stock', v_stock);
end;
$$;


-- Estadísticas del dashboard en una sola llamada.
-- Rango [p_from, p_to): p_to es EXCLUSIVO. null = sin límite (todo el evento).
-- Gastos se filtran por fecha (spent_on) usando la hora de Bogotá.
create or replace function public.get_dashboard_stats(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from   timestamptz := coalesce(p_from, '-infinity'::timestamptz);
  v_to     timestamptz := coalesce(p_to,   'infinity'::timestamptz);
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  with
  s as (
    select * from public.sales
     where created_at >= v_from and created_at < v_to
  ),
  e as (
    select * from public.expenses
     where spent_on >= (v_from at time zone 'America/Bogota')::date
       and spent_on <  (v_to   at time zone 'America/Bogota')::date
  )
  select jsonb_build_object(
    'revenue',     coalesce((select sum(total)    from s), 0),
    'units',       coalesce((select sum(quantity) from s), 0),
    -- Una promoción (varias filas con el mismo group_id) cuenta como UNA venta.
    'sales_count', (select count(distinct coalesce(s.group_id::text, s.id::text)) from s),
    'cogs',        coalesce((select sum(quantity * unit_cost) from s where unit_cost is not null), 0),
    'expenses',    coalesce((select sum(amount) from e), 0),

    'top_products', coalesce((
      select jsonb_agg(t order by t.units desc, t.revenue desc)
        from (
          select p.id as product_id, p.name,
                 sum(s.quantity)::bigint as units,
                 sum(s.total)::bigint    as revenue
            from s
            join public.products p on p.id = s.product_id
           group by p.id, p.name
        ) t
    ), '[]'::jsonb),

    'by_hour', coalesce((
      select jsonb_agg(h order by h.hour)
        from (
          select extract(hour from (s.created_at at time zone 'America/Bogota'))::int as hour,
                 sum(s.quantity)::bigint as units,
                 sum(s.total)::bigint    as revenue
            from s
           group by 1
        ) h
    ), '[]'::jsonb),

    'expenses_by_category', coalesce((
      select jsonb_agg(c order by c.amount desc)
        from (
          select e.category, sum(e.amount)::bigint as amount
            from e
           group by e.category
        ) c
    ), '[]'::jsonb),

    -- Cuánto se gastó en cada insumo (bolsas, limones, guantes...).
    'expenses_by_supply', coalesce((
      select jsonb_agg(x order by x.amount desc)
        from (
          select sp.id as supply_id, sp.name, sp.unit,
                 sum(e.quantity)        as quantity,
                 sum(e.amount)::bigint  as amount
            from e
            join public.supplies sp on sp.id = e.supply_id
           group by sp.id, sp.name, sp.unit
        ) x
    ), '[]'::jsonb),

    'stock', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'product_id',          p.id,
                 'name',                p.name,
                 'stock',               p.stock,
                 'low_stock_threshold', p.low_stock_threshold,
                 'is_active',           p.is_active
               ) order by p.sort_order, p.name)
        from public.products p
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;


-- ---------------------------------------------------------------------
-- 8b. Permisos de ejecución: anon NO puede llamar ninguna función.
-- (Supabase da EXECUTE a anon por defecto en funciones nuevas → lo quitamos.)
-- ---------------------------------------------------------------------
revoke all on function public.is_admin()                                from public, anon;
revoke all on function public.register_sale(uuid, integer)              from public, anon;
revoke all on function public.undo_sale(bigint)                         from public, anon;
revoke all on function public.register_promo_sale(uuid, uuid[])         from public, anon;
revoke all on function public.adjust_stock(uuid, integer, text, text)   from public, anon;
revoke all on function public.get_dashboard_stats(timestamptz, timestamptz) from public, anon;
revoke all on function public.log_initial_stock()                       from public, anon, authenticated;
revoke all on function public.set_updated_at()                          from public, anon, authenticated;

grant execute on function public.is_admin()                                to authenticated;
grant execute on function public.register_sale(uuid, integer)              to authenticated;
grant execute on function public.undo_sale(bigint)                         to authenticated;
grant execute on function public.register_promo_sale(uuid, uuid[])         to authenticated;
grant execute on function public.adjust_stock(uuid, integer, text, text)   to authenticated;
grant execute on function public.get_dashboard_stats(timestamptz, timestamptz) to authenticated;


-- =====================================================================
-- 9. STORAGE · bucket público de imágenes; solo el admin sube/edita/borra
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152,             -- 2 MB máx.
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública: la hace el CDN por la URL pública del bucket, sin política.
-- (No damos SELECT a anon → nadie puede LISTAR el bucket.)
drop policy if exists product_images_admin_select on storage.objects;
create policy product_images_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using      (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));


-- =====================================================================
-- 10. DATOS SEMILLA (solo si no hay productos). Edita precios a tu gusto.
--     Los helados van como 4 productos para llevar stock por sabor.
-- =====================================================================
insert into public.products
  (name, description, category, price, unit_cost, stock, low_stock_threshold, sort_order)
select * from (values
  ('Tamarindo michelado',     'Tamarindo con limón, sal, hielo al gusto y salsa chamoy.',           'bebidas', 8000,  3500, 40, 8,  10),
  ('Cerveza michelada',       'Cerveza helada con limón, sal, hielo al gusto y salsa chamoy.',      'bebidas', 12000, 6000, 48, 10, 20),
  ('Helado de mango biche',   'Helado de mango biche, ácido y refrescante.',                        'helados', 5000,  2500, 20, 5,  30),
  ('Helado de coco',          'Helado cremoso de coco.',                                            'helados', 5000,  2500, 20, 5,  40),
  ('Helado de maracuyá',      'Helado de maracuyá, dulce y ácido.',                                 'helados', 5000,  2500, 20, 5,  50),
  ('Helado de maracumango',   'Helado de maracuyá con mango.',                                      'helados', 5000,  2500, 20, 5,  60),
  ('Mango biche en tiras',    'Mango verde en tiras con limón, sal y pimienta.',                    'snacks',  7000,  3000, 30, 6,  70)
) as v(name, description, category, price, unit_cost, stock, low_stock_threshold, sort_order)
where not exists (select 1 from public.products);

-- Insumos de ejemplo (no se venden). Costos por unidad de ejemplo, edítalos.
-- "on conflict do nothing": si ya existe uno con el mismo nombre, se salta.
insert into public.supplies (name, unit, category, default_unit_cost) values
  ('Bolsas',            'paquete', 'empaques', 5000),
  ('Vasos',             'paquete', 'empaques', 8000),
  ('Pitillos',          'paquete', 'empaques', 3000),
  ('Servilletas',       'paquete', 'empaques', 4000),
  ('Guantes',           'caja',    'insumos',  15000),
  ('Limones',           'kg',      'insumos',  4000),
  ('Salsa chamoy',      'frasco',  'insumos',  12000),
  ('Sal',               'kg',      'insumos',  2500),
  ('Pimienta',          'frasco',  'insumos',  5000),
  ('Hielo',             'bolsa',   'hielo',    6000)
on conflict do nothing;

-- Promoción inicial: 2 helados (de cualquier sabor) por $8.000. Editable en Inventario.
insert into public.promotions (name, category, quantity, price)
select '2 helados', 'helados', 2, 8000
where not exists (select 1 from public.promotions);


-- Recargar el esquema de la API (PostgREST) para que vea los cambios ya.
notify pgrst, 'reload schema';

-- =====================================================================
-- LISTO. Siguiente paso (manual, ver README):
--   1) Crear tu usuario en Authentication → Users → Add user.
--   2) Hacerte admin:
--        insert into public.admins (user_id)
--        select id from auth.users where email = 'TU_CORREO@ejemplo.com';
-- =====================================================================
