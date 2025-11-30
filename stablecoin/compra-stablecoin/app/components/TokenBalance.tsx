"use client";

import { useEuroToken } from "@/hooks/useEuroToken";
import { Coins, RefreshCw } from "lucide-react";
import { useState } from "react";

export function TokenBalance() {
  const { formattedBalance, symbol, loading, error, balance, refreshBalance } = useEuroToken();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshBalance();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tu Balance</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          title="Actualizar balance"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading || isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading && balance === null ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Cargando balance...</p>
        </div>
      ) : (
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          {formattedBalance} <span className="text-2xl text-gray-600 dark:text-gray-400">{symbol}</span>
        </div>
      )}
    </div>
  );
}

