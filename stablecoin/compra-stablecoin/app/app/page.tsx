"use client";

import { useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { TokenBalance } from "@/components/TokenBalance";
import { Alert } from "@/components/Alert";
import { StripePurchaseButton } from "@/components/StripePurchaseButton";
import { DirectPurchaseButton } from "@/components/DirectPurchaseButton";
import { ResetAnvilButton } from "@/components/ResetAnvilButton";
import { useWallet } from "@/contexts/WalletContext";
import { Wallet, CreditCard, RefreshCw } from "lucide-react";

export default function Home() {
  const { isConnected } = useWallet();
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info" | "warning"; message: string } | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-8 bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-block p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
          <Wallet className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
          Compra EuroToken (EURT)
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Compra stablecoins de forma segura con Stripe o transferencia directa. <span className="font-semibold text-emerald-600 dark:text-emerald-400">1 EUR = 1 EURT</span>
        </p>
      </div>

      {alert && (
        <div className="max-w-2xl mx-auto">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            autoClose={5000}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Wallet & Balance Section */}
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Conexión de Wallet
              </h2>
            </div>
            <WalletButton />
          </div>

          {isConnected && (
            <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <TokenBalance />
            </div>
          )}

          {/* Reset Anvil Button */}
          <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Control de Anvil
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Resetea la blockchain local (Anvil) al bloque 0. Se perderán todas las transacciones y estados actuales.
            </p>
            <ResetAnvilButton />
          </div>
        </div>

        {/* Purchase Options Section */}
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Opciones de Compra
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Stripe Purchase */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-l-4 border-blue-500 hover:border-blue-600 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Compra con Stripe</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Compra EURT usando tarjeta de crédito/débito a través de Stripe de forma segura
                    </p>
                    <StripePurchaseButton
                      onPurchaseInit={() => {
                        setAlert({ type: "info", message: "Iniciando compra con Stripe..." });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Direct Purchase */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-l-4 border-purple-500 hover:border-purple-600 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Compra Directa</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Transfiere ETH directamente para comprar EURT (para pruebas)
                    </p>
                    <DirectPurchaseButton
                      onPurchaseInit={() => {
                        setAlert({ type: "info", message: "Iniciando compra directa..." });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
