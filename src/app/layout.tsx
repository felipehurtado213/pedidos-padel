import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { env } from "@/lib/env";
import "./globals.css";

// Tipografías redondeadas: Fredoka para títulos, Nunito para texto.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: `${env.NEXT_PUBLIC_BUSINESS_NAME} · Pide desde tu lugar`,
    template: `%s · ${env.NEXT_PUBLIC_BUSINESS_NAME}`,
  },
  description: "Micheladas, helados y mango biche. Pide por WhatsApp y te lo llevamos a tu lugar.",
  appleWebApp: { capable: true, title: env.NEXT_PUBLIC_BUSINESS_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffb627",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
