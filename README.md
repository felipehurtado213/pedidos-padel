# Pedidos Pádel 🍹🥭

App para vender en un club de pádel durante un torneo: los clientes piden por **WhatsApp** desde
su lugar escaneando un QR, y el vendedor registra ventas, inventario y gastos desde el celular.

**👉 Para ponerla en marcha desde cero, sigue [GUIA-DESPLIEGUE.md](GUIA-DESPLIEGUE.md).**

**Stack:** Next.js 16 (App Router, TypeScript) · Supabase (plan gratuito) · Tailwind CSS 4 · Recharts · Vercel.

## Funciones

**Clientes (`/`)**
- Catálogo por secciones con foto, precio, selector de cantidad y "Agotado".
- Ubicación recordada en el celular; botón **Pedir** abre WhatsApp con el mensaje listo.
- Instalable como app (PWA) y pantalla "Sin conexión" si se cae la señal.

**Vendedor (`/admin`, protegido)**
- **Vender:** un toque = una venta, ×2…×5, mantener presionado para otra cantidad, **Deshacer** y anular ventas.
- **Inventario:** crear/editar productos con foto (comprimida a WebP), +/− rápido, ajustes con historial.
- **Gastos:** registro rápido por insumo (bolsas, guantes, limones…), edición y totales.
- **Números:** ganancia neta, ingresos, gastos, más vendidos, ventas por hora, stock; filtro hoy / todo / fechas.
- **QR:** descarga PNG y hoja carta para imprimir.
- Instalable aparte como app "Ventas".

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # desarrollo en http://localhost:3000
npm run check      # TypeScript + ESLint
npm run build      # compilación de producción
```

## Estructura

```
supabase/schema.sql            Script SQL único: tablas, RLS, RPC, vistas, storage, datos semilla
src/proxy.ts                   Protege /admin y renueva la sesión (antes "middleware")
src/app/page.tsx               Catálogo público
src/app/admin/login/           Inicio de sesión
src/app/admin/(panel)/         Vender · inventario · gastos · estadisticas · qr
src/app/admin/(print)/         Hoja del QR para imprimir
src/app/manifest.ts, icon.tsx  PWA de clientes · src/app/admin/manifest.webmanifest → PWA del vendedor
src/lib/                       env (zod), auth, supabase/*, validation/*, formato, fechas, qr
src/components/                Catálogo y componentes del panel
public/sw.js, offline.html     Service worker mínimo (solo pantalla sin conexión)
```

## Seguridad (resumen)

- **Supabase Auth** con email + contraseña; registro público desactivado; usuarios creados a mano.
- **Rol admin en base de datos** (`public.admins`), verificado en RLS, funciones RPC, servidor y proxy.
- **RLS en todas las tablas.** El público solo lee la vista `public_products` (sin costos ni stock exacto).
- **Ventas, deshacer y ajustes de stock** solo por funciones RPC atómicas (`SECURITY DEFINER`), sin stock negativo.
- **Validación con zod** en cliente y servidor; ubicación limpiada y URL-encodeada en el enlace de WhatsApp.
- **Cabeceras:** CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`.
- **Solo la anon key** en variables `NEXT_PUBLIC_*`; la `service_role` nunca se usa. `.env.local` no se versiona.
