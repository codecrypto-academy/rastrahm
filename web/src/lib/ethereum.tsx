"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

interface EthereumContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  account: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const EthereumContext = createContext<EthereumContextType>({
  provider: null,
  signer: null,
  account: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
});

export function EthereumProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Auto-reconexión al cargar si ya hay cuentas conectadas
  // Solo se ejecuta una vez al montar, no cuando cambia la cuenta
  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      if (typeof window === "undefined" || !window.ethereum) return;

      try {
        const eth: any = window.ethereum;
        // Usar el provider actual, no crear uno nuevo
        const browserProvider = new ethers.BrowserProvider(eth);
        const accounts: string[] = await browserProvider.send("eth_accounts", []);

        if (mounted && accounts.length > 0) {
          const signer = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(signer);
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    };

    checkConnection();

    return () => {
      mounted = false;
    };
  }, []);

  // Manejo de eventos de cambio de cuenta / red
  // Solo escuchar eventos de la wallet que está actualmente conectada
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const eth: any = window.ethereum;
    let isListening = true;

    const handleAccountsChanged = async (accounts: string[]) => {
      // Solo procesar si todavía estamos escuchando (evitar procesar eventos de otras wallets)
      if (!isListening) return;

      if (accounts.length === 0) {
        // Desconectar si no hay cuentas
        setProvider(null);
        setSigner(null);
        setAccount(null);
        setIsConnected(false);
      } else {
        try {
          // Usar el mismo provider que ya tenemos, solo actualizar el signer
          // Esto evita crear nuevos providers que puedan detectar otras wallets
          if (provider) {
            // Reutilizar el provider existente, solo obtener nuevo signer
            const signer = await provider.getSigner();
            setSigner(signer);
            setAccount(accounts[0]);
            setIsConnected(true);
          } else {
            // Si no hay provider, crear uno nuevo pero solo con window.ethereum actual
            // No usar eth directamente para evitar detectar otras wallets
            const browserProvider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await browserProvider.getSigner();
            
            setProvider(browserProvider);
            setSigner(signer);
            setAccount(accounts[0]);
            setIsConnected(true);
          }
        } catch (error) {
          console.error("Error al actualizar cuenta:", error);
          // Si hay error, al menos actualizar la cuenta
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    // Solo registrar listeners en el provider actual (window.ethereum)
    // No registrar en otros providers que puedan estar disponibles
    if (eth && typeof eth.on === "function") {
      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);
    }

    return () => {
      isListening = false;
      if (eth && typeof eth.removeListener === "function") {
        eth.removeListener("accountsChanged", handleAccountsChanged);
        eth.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [provider]); // Depender de provider para que se actualice cuando cambie

  const connect = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Por favor instala MetaMask u otra wallet compatible.");
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts: string[] = await browserProvider.send("eth_requestAccounts", []);
      const signer = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(signer);
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error: any) {
      console.error("Error al conectar la wallet:", error);

      const code =
        error?.code ??
        error?.error?.code ??
        error?.info?.error?.code;

      if (code === 4001) {
        // Usuario rechazó la conexión en MetaMask
        alert("Conexión rechazada por el usuario en MetaMask.");
        return;
      }

      alert(
        error?.message ??
          "Ocurrió un error al conectar la wallet. Revisa MetaMask e inténtalo de nuevo."
      );
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setIsConnected(false);
  };

  return (
    <EthereumContext.Provider
      value={{
        provider,
        signer,
        account,
        isConnected,
        connect,
        disconnect,
      }}
    >
      {children}
    </EthereumContext.Provider>
  );
}

export function useEthereum() {
  return useContext(EthereumContext);
}

