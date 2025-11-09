"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ethers } from "ethers";
import { Web3State } from "@/lib/types";

interface Web3ContextType extends Web3State {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);
const expectedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "0");

export function Web3Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Web3State>({
    account: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Verificar si MetaMask está instalado
  const isMetaMaskInstalled = typeof window !== "undefined" && typeof window.ethereum !== "undefined";

  // Inicializar provider si MetaMask está disponible
  useEffect(() => {
    if (isMetaMaskInstalled && window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);

      // Verificar red correcta antes de proceder
      ensureCorrectNetwork(browserProvider)
        .then(() => {
          checkConnection(browserProvider);
        })
        .catch((error: any) => {
          setState((prev) => ({
            ...prev,
            error: error.message || "MetaMask está en la red incorrecta.",
            isConnecting: false,
          }));
        });

      // Escuchar cambios de cuenta
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [isMetaMaskInstalled]);

  const ensureCorrectNetwork = async (browserProvider: ethers.BrowserProvider) => {
    if (!expectedChainId) {
      return;
    }

    const network = await browserProvider.getNetwork();
    if (Number(network.chainId) !== expectedChainId) {
      try {
        await browserProvider.send("wallet_switchEthereumChain", [
          { chainId: `0x${expectedChainId.toString(16)}` },
        ]);
      } catch (error: any) {
        if (error?.code === 4902) {
          throw new Error(
            "MetaMask no tiene configurada la red local. Agrega manualmente Anvil (chainId 31337) y vuelve a intentarlo."
          );
        }
        throw new Error(
          "MetaMask está conectado a la red equivocada. Cambia a Anvil (chainId 31337) para continuar."
        );
      }
    }
  };

  const checkConnection = async (browserProvider: ethers.BrowserProvider) => {
    try {
      const accounts = await browserProvider.listAccounts();
      if (accounts.length > 0) {
        await ensureCorrectNetwork(browserProvider);
        const network = await browserProvider.getNetwork();
        const signer = await browserProvider.getSigner();
        setSigner(signer);
        setState({
          account: accounts[0].address,
          chainId: Number(network.chainId),
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      // Usuario desconectó su cuenta
      disconnect();
    } else if (provider) {
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      setSigner(signer);
      setState((prev) => ({
        ...prev,
        account: accounts[0],
        chainId: Number(network.chainId),
        isConnected: true,
      }));
    }
  };

  const handleChainChanged = async (chainId: string) => {
    if (provider) {
      const network = await provider.getNetwork();
      setState((prev) => ({
        ...prev,
        chainId: Number(network.chainId),
      }));
    }
  };

  const connect = async () => {
    if (!isMetaMaskInstalled) {
      setState((prev) => ({
        ...prev,
        error: "MetaMask no está instalado. Por favor instálalo para continuar.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask no está disponible");
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await ensureCorrectNetwork(browserProvider);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const signer = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(signer);
      setState({
        account: accounts[0],
        chainId: Number(network.chainId),
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error.message || "Error al conectar con MetaMask",
      }));
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setState({
      account: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  };

  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error("MetaMask no está disponible");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // Si la red no existe, intentar agregarla
      if (error.code === 4902) {
        // Aquí podrías agregar la red si es necesario
        throw new Error("Red no encontrada. Por favor agrega la red manualmente.");
      }
      throw error;
    }
  };

  return (
    <Web3Context.Provider
      value={{
        ...state,
        connect,
        disconnect,
        switchNetwork,
        provider,
        signer,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}

