# Guía paso a paso: de cero a vendiendo en el torneo

Esta guía asume que **no tienes ninguna cuenta creada y no has ejecutado nada**. Síguela en orden.
Tiempo total aproximado: **1 a 1,5 horas** la primera vez. Todo es **gratis**.

> En tu computador ya están instalados **Node.js 22** y **Git 2.47** (los verifiqué), y el
> proyecto está en `Documents\Claude Code\pedidos-padel`. No necesitas instalar nada más.

**Índice**

1. [Crear cuenta en GitHub](#1-crear-cuenta-en-github)
2. [Crear el proyecto en Supabase (base de datos)](#2-crear-el-proyecto-en-supabase-base-de-datos)
3. [Probar la app en tu computador](#3-probar-la-app-en-tu-computador)
4. [Subir el código a GitHub](#4-subir-el-código-a-github)
5. [Publicar en Vercel](#5-publicar-en-vercel)
6. [Ajustar la URL final (y el QR)](#6-ajustar-la-url-final-y-el-qr)
7. [Verificación en producción (obligatoria)](#7-verificación-en-producción-obligatoria)
8. [Instalar las apps en el celular](#8-instalar-las-apps-en-el-celular)
9. [Imprimir el QR](#9-imprimir-el-qr)
10. [Checklist del día del torneo](#10-checklist-del-día-del-torneo)
11. [Cómo actualizar la app después](#11-cómo-actualizar-la-app-después)
12. [Problemas comunes](#12-problemas-comunes)
13. [Límites gratuitos y avisos importantes](#13-límites-gratuitos-y-avisos-importantes)

---

## 1. Crear cuenta en GitHub

GitHub guarda tu código; Vercel lo toma de ahí para publicarlo.

1. Entra a <https://github.com/signup>.
2. Escribe tu correo, una contraseña y un nombre de usuario (ej. `felipehurtado`). Confirma el código que te llega al correo.
3. Si te pregunta por plan, elige **Free**.

✅ Listo cuando puedas ver tu perfil en `https://github.com/TU_USUARIO`.

---

## 2. Crear el proyecto en Supabase (base de datos)

### 2.1 Cuenta y proyecto

1. Entra a <https://supabase.com> → **Start your project** → **Continue with GitHub** (usa la cuenta del paso 1 y autoriza).
2. Si te pide crear una **organización**: nombre libre (ej. `Felipe`), tipo **Personal**, plan **Free**.
3. **New project**:
   - **Name:** `pedidos-padel`
   - **Database Password:** toca **Generate a password** y **guárdala** en un lugar seguro (no la necesitarás en la app, pero sí si algún día quieres administrar la base).
   - **Region:** **South America (São Paulo)** — la más cercana a Colombia (más rápido).
   - Plan **Free** → **Create new project**.
4. Espera 1–2 minutos mientras dice "Setting up project".

### 2.2 Crear las tablas (pegar el script SQL)

1. En tu computador abre el archivo `pedidos-padel\supabase\schema.sql` con el Bloc de notas o VS Code.
2. Selecciona todo (**Ctrl + A**) y copia (**Ctrl + C**).
3. En Supabase, menú izquierdo → **SQL Editor** → **New query** (o el botón **+**).
4. Pega (**Ctrl + V**) y toca **Run** (o **Ctrl + Enter**).
5. Debe decir **"Success. No rows returned"**.
   - Si aparece un aviso de "destructive operation" o similar, confirma **Run this query**: el script es seguro y se puede repetir.

Eso crea: tablas, seguridad (RLS), funciones, el espacio para fotos y 7 productos (2 micheladas, 4 helados de 20 unidades cada uno y mango biche) + 10 insumos de ejemplo.

✅ Comprueba en **Table Editor**: deben aparecer `products` (7 filas), `supplies` (10), `sales`, `stock_movements`, `expenses`, `admins`.

### 2.3 Cerrar el registro público (seguridad)

Nadie debe poder crearse una cuenta en tu app.

1. Menú izquierdo → **Authentication** → **Sign In / Providers** (en algunas versiones: **Authentication → Settings**).
2. Desactiva **Allow new users to sign up** → **Save**.
3. Deja **Email** habilitado (es con lo que entrarás tú).

### 2.4 Crear TU usuario de administrador

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Escribe tu correo y una **contraseña fuerte** (mínimo 10 caracteres, mezcla letras y números).
3. Marca **Auto Confirm User** ✔ → **Create user**.
4. Ve a **SQL Editor** → **New query**, pega esto **cambiando el correo por el tuyo** y toca **Run**:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'TU_CORREO@ejemplo.com';
   ```

5. Comprueba con otra consulta: `select * from public.admins;` → debe salir **1 fila**.

> Sin este paso podrás iniciar sesión pero la app te dirá "no tiene permisos de administrador". Es a propósito.

### 2.5 Copiar las dos claves que necesita la app

1. Menú izquierdo → **Project Settings** (ícono de engranaje) → **API Keys** (en algunas versiones: **Data API** o **API**).
2. Copia y guarda en un bloc de notas:
   - **Project URL** → algo como `https://abcdefghijkl.supabase.co`
   - La clave **anon public** (empieza por `eyJ...`) **o** la **publishable key** (empieza por `sb_publishable_...`). Cualquiera de las dos sirve.

> ⛔ **NUNCA** copies la **service_role** ni la **secret key**. Esa clave salta toda la seguridad.
> La app no la usa en ningún lado y no debe estar ni en tu computador ni en Vercel.

### 2.6 (Opcional) Ajustar precios ahora

**Table Editor** → `products` → doble clic en una celda de `price` para cambiar el precio (pesos, sin puntos: `8000`).
También lo puedes hacer después desde el panel de la app (más fácil).

---

## 3. Probar la app en tu computador

### 3.1 Abrir una terminal en la carpeta del proyecto

Opción A (VS Code): **File → Open Folder** → elige `pedidos-padel` → menú **Terminal → New Terminal**.
Opción B: en el Explorador de Windows entra a la carpeta `pedidos-padel`, clic en la barra de direcciones, escribe `powershell` y Enter.

### 3.2 Crear el archivo de configuración `.env.local`

En la terminal (PowerShell):

```powershell
Copy-Item .env.example .env.local
```

Abre `.env.local` con el Bloc de notas (`notepad .env.local`) y llena:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co      ← tu Project URL (paso 2.5)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...                    ← tu anon / publishable key
NEXT_PUBLIC_WHATSAPP_NUMBER=573001234567                       ← 57 + tu celular, SOLO números
NEXT_PUBLIC_SELLER_NAME=Felipe
NEXT_PUBLIC_BUSINESS_NAME=Sabor de Cancha                      ← el nombre que quieras
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Guarda (**Ctrl + S**). (No copies las flechas `←` ni lo que va después.)

> `.env.local` **nunca** se sube a GitHub (ya está bloqueado en `.gitignore`).

### 3.3 Arrancar

```powershell
npm install
npm run dev
```

Cuando diga `Ready`, abre <http://localhost:3000>.

### 3.4 Probar (5 minutos)

| Qué | Cómo | Debe pasar |
|---|---|---|
| Menú | Abre `http://localhost:3000` | Ves los 7 productos con precio |
| Pedido | Toca **Pedir** sin ubicación | El campo se pone rojo y pide la ubicación |
| Pedido | Escribe "Cancha 3" y toca **Pedir** | Se abre WhatsApp con el mensaje listo |
| Login | Abre `http://localhost:3000/admin` | Te manda a iniciar sesión → entra con tu usuario del paso 2.4 |
| Vender | Toca un producto en **Vender** | Baja el stock y sube "Vendido hoy" |
| Deshacer | Toca **↩ Deshacer** | Vuelve el stock |
| Foto | **Inventario** → toca un producto → **Subir o tomar foto** → Guardar | La foto aparece también en el menú |
| Gastos | **Gastos** → **+ Limones** → Registrar | Aparece en la lista y en **Números** |

**Desde tu celular (opcional):** conectado al mismo wifi, abre la dirección **Network** que muestra la terminal (ej. `http://192.168.1.20:3000`).

Para detener el servidor: **Ctrl + C** en la terminal.

> Las ventas de prueba quedan guardadas. Antes del torneo puedes anularlas con **Deshacer / Ver todas → Anular**
> o borrarlas en Supabase (**SQL Editor**): `delete from public.sales;` y luego ajustar el stock en **Inventario**.

---

## 4. Subir el código a GitHub

### 4.1 Crear el repositorio vacío

1. En GitHub, arriba a la derecha **+** → **New repository**.
2. **Repository name:** `pedidos-padel` · marca **Private** · **NO** marques "Add a README" ni nada más.
3. **Create repository**. Deja esa página abierta (muestra la dirección del repositorio).

### 4.2 Guardar y subir el código

En la terminal, dentro de `pedidos-padel` (si `npm run dev` está corriendo, detenlo con Ctrl + C o abre otra terminal):

```powershell
git add -A
git commit -m "App de pedidos y ventas para el torneo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pedidos-padel.git
git push -u origin main
```

- Cambia `TU_USUARIO` por tu usuario de GitHub.
- La primera vez se abrirá una ventana para **iniciar sesión en GitHub** → **Sign in with your browser** → autoriza.

✅ Recarga la página del repositorio en GitHub: deben aparecer las carpetas `src`, `supabase`, etc.
⚠️ Comprueba que **NO** aparezca `.env.local` (solo `.env.example`). Si aparece, avísame antes de seguir.

---

## 5. Publicar en Vercel

1. Entra a <https://vercel.com/signup> → plan **Hobby** → **Continue with GitHub** → autoriza.
2. **Add New… → Project**.
3. En "Import Git Repository" busca `pedidos-padel` → **Import**.
   - Si no aparece: **Adjust GitHub App Permissions** → da acceso al repositorio `pedidos-padel` → vuelve.
4. **Configure Project:**
   - **Framework Preset:** Next.js (se detecta solo). No cambies los comandos de build.
   - Despliega **Environment Variables** y agrega **las 6**, una por una (Key y Value), con los **mismos valores de tu `.env.local`** excepto la última:

     | Key | Value |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | tu Project URL |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon / publishable key |
     | `NEXT_PUBLIC_WHATSAPP_NUMBER` | `57` + tu celular |
     | `NEXT_PUBLIC_SELLER_NAME` | `Felipe` |
     | `NEXT_PUBLIC_BUSINESS_NAME` | el nombre de tu negocio |
     | `NEXT_PUBLIC_SITE_URL` | `https://pedidos-padel.vercel.app` (provisional, se corrige en el paso 6) |

     Tip: puedes pegar todo el contenido de `.env.local` de una vez en el primer campo "Key" y Vercel lo reparte solo; luego corrige `NEXT_PUBLIC_SITE_URL`.

5. **Deploy**. Tarda 1–3 minutos. Al final verás 🎉 **Congratulations** y una vista previa.

> El archivo `vercel.json` del proyecto ubica el servidor en **São Paulo (gru1)**, junto a tu base de datos: así cada venta responde más rápido.

---

## 6. Ajustar la URL final (y el QR)

Las variables `NEXT_PUBLIC_*` se "hornean" al compilar: **cada vez que cambies una, hay que volver a desplegar.**

1. En Vercel, entra al proyecto → pestaña **Settings → Domains**. Verás tu dirección, por ejemplo `pedidos-padel-xyz.vercel.app`.
   - *(Opcional)* toca **Edit** y cámbiala por una más bonita y libre, ej. `sabor-de-cancha.vercel.app` (gratis si nadie la tiene).
2. Copia la dirección definitiva (con `https://`).
3. **Settings → Environment Variables** → `NEXT_PUBLIC_SITE_URL` → **⋯ → Edit** → pega la dirección → **Save**.
4. **Deployments** → en el más reciente **⋯ → Redeploy** → **Redeploy**. Espera a que termine.
5. En **Supabase → Authentication → URL Configuration**, pon esa misma dirección en **Site URL** → **Save**.

✅ Abre `https://TU-DIRECCION.vercel.app/admin/qr`: **ya no debe salir el aviso rojo** de dirección local y debajo del QR debe aparecer tu dirección pública.

> ¿Dominio propio (ej. `sabordecancha.com`)? Es opcional y **cuesta** (se compra aparte). La dirección `.vercel.app` es gratuita y funciona igual.
> Si algún día cambias de dominio: repite los pasos 3–5 y **vuelve a imprimir el QR**.

---

## 7. Verificación en producción (obligatoria)

Hazlo desde **tu celular con datos móviles** (no wifi), como lo haría un cliente:

- [ ] `https://TU-DIRECCION.vercel.app` carga rápido y muestra los productos.
- [ ] Pedir sin ubicación → pide la ubicación. Con ubicación → abre WhatsApp con tu número y el mensaje correcto.
- [ ] `https://TU-DIRECCION.vercel.app/admin` → login → entras al panel.
- [ ] **Vender**: toca un producto → aparece "✓ … · $…" arriba y baja el stock.
- [ ] **↩ Deshacer** funciona.
- [ ] **Inventario** → sube una foto con la cámara → se ve en el menú público.
- [ ] **Gastos** → registra uno → aparece en **Números**.
- [ ] **QR** → escanéalo con otro celular → abre el menú.

> Estas pruebas también confirman que la política de seguridad del navegador (CSP) deja pasar las
> conexiones a tu Supabase. Si algo de esto falla (por ejemplo, vender no hace nada o la foto no sube),
> **no sigas**: copia el mensaje de error y escríbeme.

---

## 8. Instalar las apps en el celular

Hay **dos apps instalables**:

| App | Desde dónde | Abre en |
|---|---|---|
| **Clientes** ("Sabor de Cancha") | `https://TU-DIRECCION.vercel.app` | el menú |
| **Vendedor** ("Ventas") | `https://TU-DIRECCION.vercel.app/admin` | Venta rápida (tras iniciar sesión) |

- **Android (Chrome):** menú **⋮** → **Instalar app** / **Agregar a la pantalla principal**.
- **iPhone (Safari):** botón **Compartir** ⬆️ → **Agregar a inicio**.

Instala la de **Vendedor** en tu celular: queda como app con ícono propio, a pantalla completa, ideal para vender con una mano.
Si se cae la señal, la app muestra una pantalla "Sin conexión" con botón **Reintentar** (no guarda datos de ventas en el celular, por seguridad).

---

## 9. Imprimir el QR

1. Panel → **QR** (comprueba que la dirección debajo del QR sea la pública, **sin aviso rojo**).
2. **Hoja para imprimir** → **🖨️ Imprimir** → impresora o **Guardar como PDF** (para llevarlo a una papelería).
   - Tamaño **Carta**, márgenes **predeterminados**, escala **100%**, y activa **Gráficos de fondo** si la opción aparece.
3. **Escanéalo antes de imprimir varias copias.**
4. Tip: plastifícalo o mételo en un protector plástico (humedad de las bebidas).

También puedes **⬇ Descargar PNG** para estados de WhatsApp o redes.

---

## 10. Checklist del día del torneo

**2–3 días antes**
- [ ] Abre el panel de Supabase o la app (ver aviso de "pausa" en la sección 13).
- [ ] Ajusta precios y fotos en **Inventario**. Oculta lo que no vayas a vender.
- [ ] Revisa los **insumos** en **Gastos → Insumos** (agrega los que falten, ej. cucharas).
- [ ] Borra las ventas de prueba (sección 3.4).
- [ ] Imprime el QR (sección 9).

**El día**
- [ ] Carga el **stock real**: **Inventario → Ajustar → + Sumar** (motivo: Reposición).
- [ ] Registra los gastos de compras (hielo, limones, transporte…) con **Registro rápido**.
- [ ] Celular cargado + batería externa + datos móviles.
- [ ] Haz un pedido de prueba desde otro celular escaneando el QR.
- [ ] Vende con **Vender**: 1 toque = 1 unidad · **×2…×5** para varias · **mantén presionado** para otra cantidad · **↩ Deshacer** si te equivocas.

**Al cerrar**
- [ ] **Números → Todo el evento**: ingresos, gastos, ganancia neta, más vendidos y hora pico.

---

## 11. Cómo actualizar la app después

Cada cambio de código que subas a GitHub se publica solo en Vercel:

```powershell
git add -A
git commit -m "Describe el cambio"
git push
```

En 1–3 minutos queda en línea. Si solo cambias una variable de entorno en Vercel → **Redeploy** (sección 6, paso 4).
Si cambias `supabase/schema.sql`, vuelve a pegarlo y ejecutarlo en el **SQL Editor** (es seguro repetirlo).

> ⚠️ `schema.sql` **no modifica productos que ya existen** (solo crea los de ejemplo si la tabla está vacía).
> Para cambiar productos de una base ya creada, usa el panel (**Inventario**) o un script de actualización
> como `supabase/actualizacion-productos.sql` (sabores de helado, descripciones con chamoy, insumos).

---

## 12. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Vercel falla al compilar con "Variables de entorno inválidas" | Falta una variable o tiene formato malo | Revisa las 6 en **Settings → Environment Variables** (el número sin `+` ni espacios; las URL con `https://`) → Redeploy |
| El menú dice "No pudimos cargar el menú" | Supabase pausado, o URL/clave mal copiadas | Entra a Supabase: si dice **Paused** → **Restore project**. Si no, revisa URL y anon key |
| "Correo o contraseña incorrectos" | Usuario no creado o no confirmado | Paso 2.4 con **Auto Confirm User** marcado |
| "Esta cuenta no tiene permisos de administrador" | Falta el `insert into public.admins` | Paso 2.4, punto 4 (con el correo exacto) |
| Cambié precio/foto y el menú no cambia | El menú se refresca cada 20 s | Espera 20 s y recarga (los cambios desde el panel son inmediatos) |
| La foto no sube | El script SQL no terminó bien | Vuelve a ejecutar `schema.sql` y revisa en **Storage** que exista `product-images` |
| WhatsApp abre otro número o no abre | Número mal escrito | `NEXT_PUBLIC_WHATSAPP_NUMBER` = `57` + 10 dígitos, sin `+` → Redeploy |
| El QR abre `localhost` | `NEXT_PUBLIC_SITE_URL` sin actualizar | Sección 6 → Redeploy → vuelve a imprimir |
| Cambié una variable y no se nota | No se redesplegó | **Deployments → ⋯ → Redeploy** |

---

## 13. Límites gratuitos y avisos importantes

- **Supabase Free** se **pausa tras 7 días sin actividad**. Unos días antes del torneo abre tu proyecto;
  si dice *Paused*, toca **Restore project** (tarda unos minutos). Durante el torneo no se pausará.
  Límites (más que suficientes para un torneo): 500 MB de base de datos y 1 GB de fotos.
- **Vercel Hobby** es gratuito, pero según sus términos está pensado para **uso personal no comercial**.
  Para un puesto de un fin de semana el riesgo práctico es bajo, pero debes saberlo: si Vercel lo
  objetara, la alternativa es su plan Pro (de pago) u otro hosting. No hay pasarela de pagos ni costos ocultos en la app.
- **Seguridad que depende de ti:**
  - No compartas tu contraseña de administrador ni la de la base de datos.
  - Nunca pegues la **service_role / secret key** en ningún lado.
  - `.env.local` no se sube a GitHub (ya está bloqueado).
  - Si alguien más te ayuda a vender, créale **su propio usuario** (paso 2.4) en vez de prestarle el tuyo;
    para quitarle el acceso: `delete from public.admins where user_id = (select id from auth.users where email = 'correo@x.com');`
