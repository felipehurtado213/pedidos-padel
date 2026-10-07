import { z } from "zod";

/**
 * Variables de entorno públicas, validadas con zod.
 * Next solo inyecta NEXT_PUBLIC_* en el navegador si se escriben literalmente
 * (process.env.NEXT_PUBLIC_X), por eso se listan una por una.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "debe ser una URL https://xxxx.supabase.co" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "falta la anon/publishable key"),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{8,15}$/, "solo dígitos con código de país, sin + (ej. 573001234567)"),
  NEXT_PUBLIC_SELLER_NAME: z.string().trim().min(1).max(40),
  NEXT_PUBLIC_BUSINESS_NAME: z.string().trim().min(1).max(60).default("Sabor de Cancha"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_SELLER_NAME: process.env.NEXT_PUBLIC_SELLER_NAME,
  NEXT_PUBLIC_BUSINESS_NAME: process.env.NEXT_PUBLIC_BUSINESS_NAME || undefined,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
});

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Variables de entorno inválidas o faltantes (revisa .env.local o Vercel):\n${detail}`,
  );
}

export const env = {
  ...parsed.data,
  // Sin "/" final para poder concatenar rutas sin dobles barras.
  NEXT_PUBLIC_SITE_URL: parsed.data.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ""),
};
