import Link from "next/link";
import { BallIcon, WhatsAppIcon } from "@/components/catalog/icons";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { publicSiteUrl, qrSvg } from "@/lib/qr";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Imprimir QR" };

/**
 * Hoja tamaño carta lista para pegar en el estante: logo/nombre, QR grande y
 * "Escanea y pide por WhatsApp". Todo cabe en UNA página al imprimir.
 */
export default async function ImprimirQrPage() {
  await requireAdmin();
  const url = publicSiteUrl();
  const svg = await qrSvg(url);
  const shortUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <>
      {/* Barra de acciones: no sale en la impresión */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-arena bg-crema/95 px-4 py-3 backdrop-blur">
        <Link href="/admin/qr" className="h-11 rounded-xl px-3 leading-11 font-bold text-tamarindo">
          ← Volver
        </Link>
        <PrintButton />
      </div>

      <main className="print-sheet mx-auto flex max-w-[180mm] flex-col items-center px-6 py-8 text-center text-ink print:py-0">
        <div className="flex items-center gap-3">
          <BallIcon className="size-14 print:size-16" />
          <p className="font-display text-5xl leading-none font-bold text-tamarindo print:text-6xl">
            {env.NEXT_PUBLIC_BUSINESS_NAME}
          </p>
        </div>
        <p className="mt-3 text-xl font-bold text-chile-dark print:text-2xl">
          Micheladas · Helados · Mango biche
        </p>

        <div className="mt-6 w-full max-w-[120mm] rounded-[2rem] border-[6px] border-mango p-4 print:mt-8">
          {/* SVG generado en el servidor a partir de la URL de configuración. */}
          <div
            className="[&>svg]:h-auto [&>svg]:w-full"
            role="img"
            aria-label={`Código QR que abre ${url}`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>

        <p className="mt-6 font-display text-4xl leading-tight font-bold text-tamarindo-dark print:mt-8 print:text-5xl">
          Escanea y pide por WhatsApp
        </p>
        <p className="mt-2 flex items-center justify-center gap-2 text-xl font-semibold text-ink/80">
          <WhatsAppIcon className="size-6 text-limon-dark" />
          Te lo llevamos a tu cancha o gradería
        </p>

        <ol className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-lg font-bold text-tamarindo">
          <li>1. Abre la cámara</li>
          <li>2. Elige tu antojo</li>
          <li>3. Envía el chat</li>
        </ol>

        <p className="mt-6 text-base text-ink/70">¿No funciona la cámara? Entra a <strong>{shortUrl}</strong></p>
      </main>
    </>
  );
}
