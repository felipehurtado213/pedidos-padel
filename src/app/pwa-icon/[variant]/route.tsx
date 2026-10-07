import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

/** Íconos PNG de la PWA, generados UNA vez al compilar (sin archivos binarios en el repo). */
const VARIANTS: Record<string, { size: number; padding: number }> = {
  "192": { size: 192, padding: 0.14 },
  "512": { size: 512, padding: 0.14 },
  "maskable-512": { size: 512, padding: 0.24 }, // zona segura para recortes de Android
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const v = VARIANTS[variant] ?? VARIANTS["192"];
  return new ImageResponse(<IconArt size={v.size} padding={v.padding} />, { width: v.size, height: v.size });
}
