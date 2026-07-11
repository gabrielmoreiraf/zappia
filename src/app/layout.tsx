import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Zappia — Atendente de WhatsApp com IA",
  description:
    "Atendente de WhatsApp com IA: responde texto e áudio, treinado no conhecimento do seu negócio, sem inventar informação.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("h-full antialiased", jakarta.variable)}>
      <body className="min-h-full">
        {children}
        <Toaster position="top-right" richColors offset={{ top: 76 }} />
      </body>
    </html>
  );
}
