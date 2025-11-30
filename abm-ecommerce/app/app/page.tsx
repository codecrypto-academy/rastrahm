"use client";

import { useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { AddCompanyForm } from "@/components/AddCompanyForm";
import { AddProductForm } from "@/components/AddProductForm";
import { CompanyList } from "@/components/CompanyList";
import { ProductList } from "@/components/ProductList";
import { InvoicesManager } from "@/components/InvoicesManager";
import { Building2, Package, FileText, Wallet } from "lucide-react";

export default function Home() {
  const { isConnected, account } = useWallet();
  const [activeTab, setActiveTab] = useState<"companies" | "products" | "invoices">("companies");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-block p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
          <Building2 className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          ABM E-commerce
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Administración completa de empresas, productos y facturas en la blockchain
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Wallet Connection Card */}
        <div className="lg:col-span-1">
          <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow duration-300 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Wallet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Wallet
              </h2>
            </div>
            <WalletButton />
            {isConnected && account && (
              <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">✓ Conectada</p>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{account}</p>
              </div>
            )}
          </div>
        </div>

        {/* Management Section */}
        <div className="lg:col-span-2">
          <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              Panel de Gestión
            </h2>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("companies")}
                className={`px-6 py-3 font-semibold transition-all duration-200 rounded-t-lg ${
                  activeTab === "companies"
                    ? "text-indigo-600 dark:text-indigo-300 border-b-3 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-800/60"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Building2 className="w-5 h-5 inline mr-2" />
                Empresas
              </button>
              <button
                onClick={() => setActiveTab("products")}
                className={`px-6 py-3 font-semibold transition-all duration-200 rounded-t-lg ${
                  activeTab === "products"
                    ? "text-purple-600 dark:text-purple-300 border-b-3 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-800/60"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Package className="w-5 h-5 inline mr-2" />
                Productos
              </button>
              <button
                onClick={() => setActiveTab("invoices")}
                className={`px-6 py-3 font-semibold transition-all duration-200 rounded-t-lg ${
                  activeTab === "invoices"
                    ? "text-emerald-600 dark:text-emerald-300 border-b-3 border-emerald-600 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-800/60"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                Facturas
              </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === "companies" && (
                <div className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border-l-4 border-indigo-500">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-500 rounded-lg">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Gestión de Empresas</h3>
                  </div>
                  <p className="text-sm text-indigo-800 dark:text-indigo-300 mb-4">
                    Administra las empresas registradas en el sistema. Crea, edita y gestiona la información de cada empresa.
                  </p>
                  <div className="space-y-6">
                    <AddCompanyForm onSuccess={() => {
                      // Recargar lista de empresas
                      setRefreshTrigger((prev) => prev + 1);
                    }} />
                    <CompanyList refreshTrigger={refreshTrigger} />
                  </div>
                </div>
              )}
              {activeTab === "products" && (
                <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-l-4 border-purple-500">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-500 rounded-lg">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Gestión de Productos</h3>
                  </div>
                  <p className="text-sm text-purple-800 dark:text-purple-300 mb-4">
                    Administra el catálogo de productos. Agrega nuevos productos, actualiza precios y gestiona el inventario.
                  </p>
                  <div className="space-y-6">
                    <AddProductForm onSuccess={() => {
                      // Recargar lista de productos
                      setRefreshTrigger((prev) => prev + 1);
                    }} />
                    <ProductList refreshTrigger={refreshTrigger} />
                  </div>
                </div>
              )}
              {activeTab === "invoices" && (
                <div className="p-8 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border-l-4 border-emerald-500">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-500 rounded-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Gestión de Facturas</h3>
                  </div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 mb-4">
                    Administra las facturas generadas. Visualiza, descarga y gestiona el historial de facturación.
                  </p>
                  <InvoicesManager refreshTrigger={refreshTrigger} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
