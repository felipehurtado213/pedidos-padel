-- =====================================================================
--  ACTUALIZACIÓN DE PRODUCTOS E INSUMOS (para una base YA creada)
-- ---------------------------------------------------------------------
--  Úsalo SOLO si ya ejecutaste schema.sql antes de este cambio.
--  (schema.sql no modifica productos existentes: solo los crea si la
--   tabla está vacía.)
--
--  Qué hace:
--   1. Bebidas: limón, sal, hielo al gusto y salsa chamoy (sin tajín/chile).
--   2. Mango biche en tiras: solo pimienta.
--   3. Helados: mango biche, coco, maracuyá y maracumango (20 de cada uno).
--      Renombra "Helado de mango" → "mango biche" y "Helado de limón" →
--      "maracumango" (se renombran en vez de borrar para no perder ventas).
--   4. Insumos: "Tajín / chile" → "Salsa chamoy" y agrega "Pimienta".
--
--  Es seguro ejecutarlo más de una vez. Todo o nada (transacción).
-- =====================================================================
begin;

-- 1 y 2. Descripciones
update public.products set description = 'Tamarindo con limón, sal, hielo al gusto y salsa chamoy.'
 where name = 'Tamarindo michelado';
update public.products set description = 'Cerveza helada con limón, sal, hielo al gusto y salsa chamoy.'
 where name = 'Cerveza michelada';
update public.products set description = 'Mango verde en tiras con limón, sal y pimienta.'
 where name = 'Mango biche en tiras';

-- 3. Helados: renombrar sabores (solo si el nombre nuevo aún no existe)
update public.products
   set name = 'Helado de mango biche', description = 'Paleta artesanal de mango biche, ácida y refrescante.'
 where name = 'Helado de mango'
   and not exists (select 1 from public.products where name = 'Helado de mango biche');

update public.products
   set name = 'Helado de maracumango', description = 'Paleta artesanal de maracuyá con mango.'
 where name = 'Helado de limón'
   and not exists (select 1 from public.products where name = 'Helado de maracumango');

-- Si algún sabor no existe (p. ej. lo borraste), se crea.
insert into public.products (name, description, category, price, unit_cost, stock, low_stock_threshold, sort_order)
select v.name, v.description, 'helados', 6000, 2500, 0, 5, v.sort_order
  from (values
    ('Helado de mango biche', 'Paleta artesanal de mango biche, ácida y refrescante.', 30),
    ('Helado de coco',        'Paleta artesanal cremosa de coco.',                      40),
    ('Helado de maracuyá',    'Paleta artesanal de maracuyá, dulce y ácida.',           50),
    ('Helado de maracumango', 'Paleta artesanal de maracuyá con mango.',                60)
  ) as v(name, description, sort_order)
 where not exists (select 1 from public.products p where p.name = v.name);

-- Orden en el menú y visibles
update public.products p
   set sort_order = v.sort_order, is_active = true
  from (values ('Helado de mango biche', 30), ('Helado de coco', 40),
               ('Helado de maracuyá', 50), ('Helado de maracumango', 60)) as v(name, sort_order)
 where p.name = v.name;

-- Stock: 20 de cada sabor. Primero queda registrado el ajuste en la bitácora…
insert into public.stock_movements (product_id, delta, reason, note)
select id, 20 - stock, 'ajuste', 'Stock del torneo: 20 por sabor'
  from public.products
 where name in ('Helado de mango biche', 'Helado de coco', 'Helado de maracuyá', 'Helado de maracumango')
   and stock <> 20;

-- …y luego se fija el stock.
update public.products set stock = 20
 where name in ('Helado de mango biche', 'Helado de coco', 'Helado de maracuyá', 'Helado de maracumango');

-- 4. Insumos
update public.supplies set name = 'Salsa chamoy'
 where name = 'Tajín / chile'
   and not exists (select 1 from public.supplies where lower(btrim(name)) = 'salsa chamoy');

insert into public.supplies (name, unit, category, default_unit_cost)
values ('Salsa chamoy', 'frasco', 'insumos', 12000),
       ('Pimienta',     'frasco', 'insumos', 5000)
on conflict do nothing;

commit;

-- Comprobación: revisa el resultado abajo en "Results".
select name, description, stock, is_active
  from public.products
 order by sort_order, name;
