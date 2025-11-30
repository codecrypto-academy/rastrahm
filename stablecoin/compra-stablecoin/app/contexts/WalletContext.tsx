"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ethers } from "ethers";
import { CHAIN_ID, LOCAL_NETWORK } from "@/lib/constants";
import { formatError } from "@/lib/utils";

interface WalletContextType {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  balance: bigint | null;
  connect: () => Promise<void>;
  connectWithProvider: (walletProvider: any) => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMetaMaskInstalled = typeof window !== "undefined" && typeof window.ethereum !== "undefined";

  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    setProvider(provider);

    checkConnection(provider);

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
        if (provider) {
          refreshBalance(provider, accounts[0]);
        }
      }
    };

    const handleChainChanged = (chainId: string) => {
      setChainId(parseInt(chainId, 16));
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [isMetaMaskInstalled]);

  const checkConnection = async (provider: ethers.BrowserProvider) => {
    try {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
        setAccount(accounts[0].address);
        setIsConnected(true);
        const signer = await provider.getSigner();
        setSigner(signer);
        await refreshBalance(provider, accounts[0].address);
      }
    } catch (err) {
      console.error("Error checking connection:", err);
    }
  };

  const refreshBalance = async (providerInstance?: ethers.BrowserProvider, accountAddress?: string) => {
    const prov = providerInstance || provider;
    const addr = accountAddress || account;
    if (!prov || !addr) return;

    try {
      const bal = await prov.getBalance(addr);
      setBalance(bal);
    } catch (err) {
      console.error("Error refreshing balance:", err);
    }
  };

  const connectWithProvider = async (walletProvider: any) => {
    setIsConnecting(true);
    setError(null);

    try {
      let accounts: string[] = [];
      
      // Primero intentar obtener cuentas ya autorizadas
      try {
        accounts = await walletProvider.request({
          method: "eth_accounts",
        });
      } catch (err) {
        console.error("Error getting accounts:", err);
      }

      // Si no hay cuentas autorizadas, solicitar permisos
      if (!accounts || accounts.length === 0) {
        try {
          // Intentar solicitar permisos
          await walletProvider.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
          
          // Después de solicitar permisos, obtenemos las cuentas seleccionadas
          accounts = await walletProvider.request({
            method: "eth_accounts",
          });
        } catch (permError: any) {
          // Si hay una solicitud pendiente (código -32002), usar eth_requestAccounts
          if (permError.code === -32002) {
            // Hay una solicitud pendiente, usar eth_requestAccounts que esperará
            accounts = await walletProvider.request({
              method: "eth_requestAccounts",
            });
          } else {
            // Otro error, intentar con eth_requestAccounts como fallback
            try {
              accounts = await walletProvider.request({
                method: "eth_requestAccounts",
              });
            } catch (requestError) {
              throw permError; // Lanzar el error original si eth_requestAccounts también falla
            }
          }
        }
      }

      if (!accounts || accounts.length === 0) {
        setError("No account selected");
        setIsConnecting(false);
        return;
      }

      const provider = new ethers.BrowserProvider(walletProvider);
      setProvider(provider);

      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      setChainId(currentChainId);

      if (currentChainId !== CHAIN_ID) {
        // Guardar el proveedor actual para switchNetwork
        const currentProvider = walletProvider;
        try {
          await currentProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: LOCAL_NETWORK.chainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await currentProvider.request({
                method: "wallet_addEthereumChain",
                params: [LOCAL_NETWORK],
              });
            } catch (addError) {
              setError("Error adding network to wallet");
              console.error("Error adding network:", addError);
            }
          } else {
            setError("Error switching network");
            console.error("Error switching network:", switchError);
          }
        }
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);
      setSigner(signer);
      setIsConnected(true);

      await refreshBalance(provider, address);
    } catch (err) {
      const errorMessage = formatError(err);
      setError(errorMessage);
      console.error("Error connecting wallet:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = async () => {
    if (!isMetaMaskInstalled) {
      setError("MetaMask is not installed. Please install MetaMask to continue.");
      return;
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setError("No wallet found installed.");
      return;
    }

    // Detectar el proveedor por defecto
    let defaultProvider = ethereum;
    
    // Si es un array, usar el primero
    if (Array.isArray(ethereum)) {
      defaultProvider = ethereum[0];
    }
    // Si tiene providers, usar el primero
    else if (ethereum.providers && Array.isArray(ethereum.providers)) {
      defaultProvider = ethereum.providers[0];
    }
    
    await connectWithProvider(defaultProvider);
  };

  const disconnect = () => {
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
    setBalance(null);
    setError(null);
  };

  const switchNetwork = async () => {
    if (!isMetaMaskInstalled) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: LOCAL_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [LOCAL_NETWORK],
          });
        } catch (addError) {
          setError("Failed to add network to MetaMask");
          console.error("Error adding network:", addError);
        }
      } else {
        setError("Failed to switch network");
        console.error("Error switching network:", switchError);
      }
    }
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        isConnected,
        isConnecting,
        provider,
        signer,
        balance,
        connect,
        connectWithProvider,
        disconnect,
        switchNetwork,
        refreshBalance: () => refreshBalance(),
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

