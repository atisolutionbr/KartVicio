import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RaceProvider } from "@/features/race-control/race-context";
import { PwaControls } from "@/components/pwa-controls";
import { appUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  title: "KartVicio — Race Control",
  description: "Controle e análise de corridas de kart endurance",
  manifest: appUrl("/manifest.webmanifest"),
  appleWebApp: { capable: true, title: "KartVicio", statusBarStyle: "default" },
  icons: { icon: [{ url: appUrl("/icons/kart-vicio-32.png"), sizes: "32x32", type: "image/png" }], apple: appUrl("/icons/kart-vicio-180.png") },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#111827", viewportFit: "cover" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body><RaceProvider>{children}</RaceProvider><PwaControls /></body>
    </html>
  );
}
