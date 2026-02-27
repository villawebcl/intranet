import type { Metadata } from "next";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import "./globals.css";

export const metadata: Metadata = {
  title: "Intranet Base",
  description: "Gestion documental interna para empresa cliente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased text-slate-900">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var key = 'intranet-theme';
                var saved = localStorage.getItem(key);
                var theme = (saved === 'light' || saved === 'soft-dark')
                  ? saved
                  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'soft-dark' : 'light');
                document.documentElement.dataset.theme = theme;
              } catch (_) {}
            `,
          }}
        />
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
