"use client";

import { createClient } from "@/lib/supabase/client";
import { PRODUCT_IMAGES_BUCKET, storagePathFromUrl } from "@/lib/storage";

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // foto original hasta 15 MB
const MAX_SIDE = 800; // px: suficiente para las tarjetas, liviano en datos móviles

/**
 * Reduce la foto en el navegador a máx. 800 px y la convierte a WebP (~40-90 KB).
 * Si el navegador no sabe codificar WebP, usa JPEG.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("La imagen pesa más de 15 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("No se pudo leer la imagen. Prueba con una foto JPG o PNG.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await toBlob("image/webp", 0.8);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg", 0.82);
  if (!jpeg) throw new Error("No se pudo procesar la imagen.");
  return jpeg;
}

/** Comprime y sube al bucket. Devuelve la URL pública. Solo funciona con sesión de admin (RLS). */
export async function uploadProductImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `products/${crypto.randomUUID()}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000", // nombre único → se puede cachear 1 año
    upsert: false,
  });
  if (error) throw new Error("No se pudo subir la foto. Revisa tu conexión.");

  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Borra fotos subidas que al final no se usaron (p. ej. cancelaste el formulario). */
export async function removeProductImages(urls: string[]): Promise<void> {
  const paths = urls.map(storagePathFromUrl).filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;
  await createClient().storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
}
