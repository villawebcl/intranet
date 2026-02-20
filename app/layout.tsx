import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intranet Anagami",
  description: "Gestion documental interna para Anagami Seguridad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
