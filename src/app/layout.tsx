import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { LegalDisclaimer } from "@/components/Disclaimer";

// Serif editorial para títulos/marca (gravitas jurídica); sans legible para UI densa.
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "UP-Law-AILO — Observatorio de licencias de IA",
  description:
    "Observatorio simple de licencias, EULA, términos de uso y políticas de privacidad de proveedores de IA. Análisis preliminar con evidencia textual.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${lora.variable} ${inter.variable}`}>
      <body className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
          <LegalDisclaimer />
        </footer>
      </body>
    </html>
  );
}
