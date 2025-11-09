"use client";

import { useWeb3 } from "@/contexts/Web3Context";

export default function ConnectWallet() {
  const { account, isConnected, isConnecting, connect, disconnect, error } = useWeb3();

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Conectado
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {isConnecting ? "Conectando..." : "Conectar Wallet"}
      </button>
      {error && (
        <p className="text-xs text-red-500 max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}

