import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { isLocalUrl, publicSiteUrl, qrPngDataUrl, qrSvg, slugify } from "@/lib/qr";
import { CopyLinkButton } from "./CopyLinkButton";

export const metadata = { title: "Código QR" };

export default async function QrPage() {
  await requireAdmin();

  const url = publicSiteUrl();
  const [svg, png] = await Promise.all([qrSvg(url), qrPngDataUrl(url)]);
  const local = isLocalUrl(url);
  const fileName = `qr-${slugify(env.NEXT_PUBLIC_BUSINESS_NAME)}.png`;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold text-tamarindo">Código QR</h1>

      {local && (
        <div role="alert" className="rounded-2xl border-2 border-chile bg-chile-soft px-4 py-3 text-sm">
          <p className="font-bold text-chile-dark">⚠ Este QR apunta a una dirección local.</p>
          <p className="mt-1 text-ink/80">
            Solo funciona en tu computador o tu wifi. Antes de imprimir, despliega en Vercel y cambia{" "}
            <code className="rounded bg-white px-1">NEXT_PUBLIC_SITE_URL</code> a la URL pública (te explico cómo en la
            Fase 7).
          </p>
        </div>
      )}

      <section className="rounded-3xl bg-white p-5 text-center shadow-card">
        {/* SVG generado por la librería en el servidor a partir de una URL de configuración (no de usuarios). */}
        <div
          className="mx-auto w-full max-w-64 [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`Código QR que abre ${url}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="mt-3 text-sm text-ink/70">Apunta a:</p>
        <p className="font-bold break-all text-tamarindo-dark">{url}</p>
      </section>

      <div className="grid gap-3">
        <Link
          href="/admin/imprimir-qr"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-tamarindo font-display text-xl font-semibold text-white shadow-[0_4px_0_0_#4a2612] active:translate-y-1 active:shadow-none"
        >
          🖨️ Hoja para imprimir
        </Link>
        <a
          href={png}
          download={fileName}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-mango font-display text-xl font-semibold text-tamarindo-dark shadow-[0_4px_0_0_#d98e00] active:translate-y-1 active:shadow-none"
        >
          ⬇ Descargar PNG
        </a>
        <CopyLinkButton url={url} />
      </div>

      <p className="text-sm text-ink/70">
        Tip: prueba el QR con la cámara de tu celular antes de imprimir varias copias. El PNG (1024 px) sirve para
        estados de WhatsApp o para mandarlo a imprimir en una papelería.
      </p>
    </div>
  );
}
