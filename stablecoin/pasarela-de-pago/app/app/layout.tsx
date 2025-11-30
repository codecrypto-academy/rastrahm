import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Pasarela de Pago",
  description: "Sistema de pagos con EURT y Stripe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var darkMode = localStorage.getItem('darkMode');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var shouldBeDark = darkMode === 'true' || (darkMode === null && prefersDark);
                  if (shouldBeDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {
                  console.error('Error applying theme:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <ThemeProvider>
          <WalletProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="sticky top-0 z-50 backdrop-blur-lg bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="container mx-auto px-4 py-4 flex justify-between items-center bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Pasarela de Pago
                  </h1>
                </div>
                <DarkModeToggle />
              </div>
            </header>
            <main className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900">
              {children}
            </main>
            <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 backdrop-blur-sm py-6 mt-12">
              <div className="container mx-auto px-4 text-center bg-white dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sistema de pagos con EURT y Stripe
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Construido con Next.js, Ethers.js y Stripe
                </p>
              </div>
            </footer>
          </div>
        </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
