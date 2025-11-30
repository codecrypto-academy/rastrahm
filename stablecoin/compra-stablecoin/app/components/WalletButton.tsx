"use client";

import { useWallet } from "@/contexts/WalletContext";
import { formatAddress, formatUnits } from "@/lib/utils";
import { Wallet, LogOut, RefreshCw, X } from "lucide-react";
import { useState, useEffect } from "react";

interface WalletProvider {
  name: string;
  provider: any;
  icon?: string;
}

export function WalletButton() {
  const { account, isConnected, isConnecting, connect, disconnect, balance, refreshBalance, chainId, switchNetwork, error, connectWithProvider } = useWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const wallets: WalletProvider[] = [];
    
    // Método 1: EIP-6963 - Estándar moderno para detectar múltiples wallets
    const detectEIP6963Wallets = () => {
      return new Promise<WalletProvider[]>((resolve) => {
        const detectedWallets: WalletProvider[] = [];
        let timeout: NodeJS.Timeout;

        const handler = (event: CustomEvent) => {
          if (event.detail && event.detail.info) {
            const { info, provider } = event.detail;
            detectedWallets.push({
              name: info.name || "Unknown Wallet",
              provider: provider,
            });
          }
        };

        window.addEventListener("eip6963:announceProvider", handler as EventListener);
        window.dispatchEvent(new Event("eip6963:requestProvider"));

        // Esperar un poco para que todas las wallets respondan
        timeout = setTimeout(() => {
          window.removeEventListener("eip6963:announceProvider", handler as EventListener);
          resolve(detectedWallets);
        }, 500);
      });
    };

    // Detectar wallets usando EIP-6963 primero
    detectEIP6963Wallets().then((eip6963Wallets) => {
      const ethereum = (window as any).ethereum;
      
      // Si EIP-6963 encontró wallets, usarlas
      if (eip6963Wallets.length > 0) {
        console.log("✅ EIP-6963 detectó wallets:", eip6963Wallets.map(w => w.name));
        setAvailableWallets(eip6963Wallets);
        return;
      }

      // Si no, usar métodos tradicionales
      if (!ethereum) {
        setAvailableWallets([]);
        return;
      }
      
      // Método 2: window.ethereum es un array directamente
      if (Array.isArray(ethereum)) {
        ethereum.forEach((provider: any, index: number) => {
          const name = getWalletName(provider, index);
          wallets.push({ name, provider });
        });
      }
      // Método 3: window.ethereum.providers existe
      else if (ethereum.providers && Array.isArray(ethereum.providers)) {
        ethereum.providers.forEach((provider: any, index: number) => {
          const name = getWalletName(provider, index);
          wallets.push({ name, provider });
        });
      }
      // Método 4: Solo hay una wallet instalada
      else if (ethereum) {
        const name = getWalletName(ethereum, 0);
        wallets.push({ name, provider: ethereum });
      }
      
      // Si no encontramos wallets pero ethereum existe, agregarlo como única opción
      if (wallets.length === 0 && ethereum) {
        wallets.push({ name: "Ethereum Wallet", provider: ethereum });
      }
      
      setAvailableWallets(wallets);
    });
  }, []);

  const getWalletName = (provider: any, index: number): string => {
    if (provider.isMetaMask) return "MetaMask";
    if (provider.isCoinbaseWallet) return "Coinbase Wallet";
    if (provider.isBraveWallet) return "Brave Wallet";
    if (provider.isTrust) return "Trust Wallet";
    if (provider.isRabby) return "Rabby";
    if (provider.isFrame) return "Frame";
    if (provider.isTokenPocket) return "TokenPocket";
    if (provider.isOKExWallet) return "OKEx Wallet";
    if (provider.isPhantom) return "Phantom";
    // Intentar obtener el nombre del proveedor si tiene una propiedad name
    if (provider.providerName) return provider.providerName;
    if (provider.name) return provider.name;
    return `Wallet ${index + 1}`;
  };

  const handleConnect = () => {
    // SIEMPRE mostrar el selector para que el usuario pueda elegir
    if (availableWallets.length > 0) {
      setShowWalletSelector(true);
    } else {
      // Fallback: usar el método connect tradicional
      connect();
    }
  };

  const handleSelectWallet = (wallet: WalletProvider) => {
    setShowWalletSelector(false);
    connectWithProvider(wallet.provider);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (!isConnected) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5" />
            {isConnecting ? "Conectando..." : "Conectar Wallet"}
          </button>
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>
          )}
        </div>

        {/* Modal de selección de wallet */}
        {showWalletSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowWalletSelector(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Selecciona una Wallet</h3>
                <button
                  onClick={() => setShowWalletSelector(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="space-y-2">
                {availableWallets.map((wallet, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectWallet(wallet)}
                    className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors text-left"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{wallet.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-mono text-sm">{formatAddress(account || "")}</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Actualizar balance"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Desconectar
        </button>
      </div>
      {balance !== null && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Balance ETH: {formatUnits(balance, 18)} ETH
        </div>
      )}
      {chainId && chainId !== 31337 && (
        <button
          onClick={switchNetwork}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
        >
          Cambiar a Red Local
        </button>
      )}
    </div>
  );
}
