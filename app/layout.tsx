import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPGcord — Sua mesa de RPG",
  description: "Campanhas, fichas, mapas e dados sincronizados para seu grupo de RPG.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
