"use client";

import { useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { StripePaymentButton } from "@/components/StripePaymentButton";
import { DirectPaymentButton } from "@/components/DirectPaymentButton";
import { useWallet } from "@/contexts/WalletContext";
import { Wallet, CreditCard, Send } from "lucide-react";

export default function Home() {
  const { isConnected, account } = useWallet();

  return (
    <div className="max-w-6xl mx-auto space-y-8 bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-block p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
          <CreditCard className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Pasarela de Pago
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Sistema de pagos seguro con EURT y Stripe. Realiza transacciones de forma rápida y confiable.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Wallet Connection Card */}
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Conexión de Wallet
              </h2>
            </div>
            <WalletButton />
            {isConnected && account && (
              <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">✓ Wallet Conectada</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{account}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Options Card */}
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Opciones de Pago
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Stripe Payment */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-l-4 border-blue-500 hover:border-blue-600 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Pago con Stripe</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Realiza pagos usando tarjeta de crédito/débito a través de Stripe de forma segura
                    </p>
                    {isConnected ? (
                      <div className="mt-4">
                        <StripePaymentButton />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium">Conecta tu wallet para continuar</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct EURT Payment */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-l-4 border-purple-500 hover:border-purple-600 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Pago Directo con EURT</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Transfiere EURT directamente desde tu wallet de forma instantánea
                    </p>
                    {isConnected ? (
                      <div className="mt-4">
                        <DirectPaymentButton />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium">Conecta tu wallet para continuar</p>
                      </div>
                    )}
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
