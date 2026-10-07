import { env } from "@/lib/env";

export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Prefijo de las URLs públicas de nuestro bucket. */
export const PRODUCT_IMAGES_PREFIX = `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;

/** Solo aceptamos imágenes alojadas en NUESTRO bucket (no URLs arbitrarias). */
export function isProductImageUrl(url: string): boolean {
  return (
    url.startsWith(PRODUCT_IMAGES_PREFIX) &&
    /^[\w\-/]+\.(webp|jpe?g|png)$/i.test(url.slice(PRODUCT_IMAGES_PREFIX.length))
  );
}

/** "https://.../product-images/products/abc.webp" → "products/abc.webp" */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  return url && isProductImageUrl(url) ? url.slice(PRODUCT_IMAGES_PREFIX.length) : null;
}
