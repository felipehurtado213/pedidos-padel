import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

// Ícono de la pestaña del navegador (reemplaza el favicon por defecto de Next).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<IconArt size={64} padding={0.08} />, size);
}
