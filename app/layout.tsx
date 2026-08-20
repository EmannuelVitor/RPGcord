import type { Metadata, Viewport } from "next";
import "./globals.css";

// A Vercel expoe a URL do deploy; o dominio de producao entra como padrao para
// que os previews de link (Discord, WhatsApp, buscadores) sempre resolvam.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://rpgcord.vercel.app");

const description = "Campanhas, fichas, mapas com névoa de guerra, dados e trilha sonora sincronizados em tempo real para o seu grupo de RPG.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "RPGcord — Sua mesa de RPG", template: "%s · RPGcord" },
  description,
  applicationName: "RPGcord",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RPGcord", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "RPGcord",
    locale: "pt_BR",
    url: siteUrl,
    title: "RPGcord — Sua mesa de RPG",
    description,
  },
  twitter: { card: "summary_large_image", title: "RPGcord — Sua mesa de RPG", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6fc" },
    { media: "(prefers-color-scheme: dark)", color: "#17141e" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
