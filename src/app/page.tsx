import { Catalog } from "@/components/catalog/Catalog";
import { BallIcon, WhatsAppIcon } from "@/components/catalog/icons";
import { env } from "@/lib/env";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicProduct } from "@/types/db";

// Página cacheada y regenerada cada 20 s (ISR): carga instantánea en datos móviles
// y el "Agotado" se refleja en menos de medio minuto.
export const revalidate = 20;

async function getProducts(): Promise<PublicProduct[] | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("public_products")
    .select("id, name, description, category, image_url, price, available, sort_order")
    .order("sort_order")
    .order("name")
    .returns<PublicProduct[]>();
  if (error) {
    console.error("[catalogo] Error leyendo public_products:", error.message);
    return null;
  }
  return data;
}

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#menu"
        className="sr-only z-50 rounded-xl bg-tamarindo px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al menú
      </a>
      <header className="relative overflow-hidden bg-gradient-to-br from-mango via-mango to-chile px-4 pt-8 pb-10 text-tamarindo-dark">
        {/* Decoración */}
        <div aria-hidden className="absolute -top-10 -right-10 size-40 rounded-full bg-white/25" />
        <div aria-hidden className="absolute -bottom-16 -left-8 size-36 rounded-full bg-limon/30" />
        <BallIcon className="animate-float absolute top-[4.5rem] right-5 size-12 drop-shadow-md" />

        <div className="relative mx-auto max-w-3xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold tracking-wide uppercase">
            Torneo de pádel · Entrega en tu lugar
          </p>
          <h1 className="mt-3 font-display text-4xl leading-none font-bold sm:text-5xl">
            {env.NEXT_PUBLIC_BUSINESS_NAME}
          </h1>
          <p className="mt-2 max-w-xs text-lg leading-snug font-semibold">Pide desde tu lugar, te lo llevamos.</p>
        </div>
      </header>

      <main id="menu" tabIndex={-1} className="relative mx-auto -mt-5 w-full max-w-3xl flex-1 rounded-t-[2rem] bg-crema px-4 pb-10">
        {/* Los 3 pasos siempre visibles (sin desplazar de lado) */}
        <ol className="grid grid-cols-3 gap-2 pt-4 text-center text-[13px] leading-tight font-bold text-tamarindo">
          {["Escribe dónde estás", "Elige la cantidad", "Toca Pedir y envía el chat"].map((step, i) => (
            <li key={step} className="flex flex-col items-center gap-1 rounded-2xl bg-white px-1.5 py-2 shadow-sm">
              <span className="grid size-6 place-items-center rounded-full bg-mango text-xs text-tamarindo-dark">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {products ? (
          <Catalog
            products={products}
            sellerName={env.NEXT_PUBLIC_SELLER_NAME}
            whatsappNumber={env.NEXT_PUBLIC_WHATSAPP_NUMBER}
          />
        ) : (
          <div className="mt-8 rounded-3xl bg-white p-6 text-center shadow-card">
            <p className="font-display text-xl font-semibold">No pudimos cargar el menú 😕</p>
            <p className="mt-1 text-ink/70">Revisa tu conexión o escríbenos directamente:</p>
            <a
              href={buildWhatsAppUrl(env.NEXT_PUBLIC_WHATSAPP_NUMBER, `Hola ${env.NEXT_PUBLIC_SELLER_NAME}, quiero hacer un pedido.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-14 items-center gap-2 rounded-2xl bg-limon-dark px-6 font-display text-lg font-semibold text-white"
            >
              <WhatsAppIcon className="size-5" /> Escribir por WhatsApp
            </a>
          </div>
        )}
      </main>

      <footer className="px-4 pb-8 text-center text-sm text-ink/70">
        {env.NEXT_PUBLIC_BUSINESS_NAME} · Pedidos por WhatsApp con {env.NEXT_PUBLIC_SELLER_NAME}
      </footer>
    </div>
  );
}
