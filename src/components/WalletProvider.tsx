import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Account, Network, LogEntry, WalletState } from '../types';

interface WalletContextType {
  // Estado del wallet
  state: WalletState;
  accounts: Account[];
  currentAccount: Account | null;
  currentNetwork: Network | null;
  networks: Network[];
  
  // Acciones
  generateWallet: () => Promise<{ success: boolean; mnemonic: string }>;
  importWallet: (mnemonic: string) => Promise<{ success: boolean }>;
  switchAccount: (accountIndex: number) => Promise<{ success: boolean }>;
  switchNetwork: (chainId: string) => Promise<{ success: boolean }>;
  addNetwork: (network: Network) => Promise<{ success: boolean }>;
  sendTransaction: (transaction: any) => Promise<{ success: boolean; hash?: string }>;
  signMessage: (address: string, message: string) => Promise<{ success: boolean; signature?: string }>;
  signTypedData: (address: string, typedData: any) => Promise<{ success: boolean; signature?: string }>;
  getBalance: (address: string) => Promise<{ success: boolean; balance?: string }>;
  resetWallet: () => Promise<{ success: boolean }>;
  loadWalletState: () => Promise<void>;
  
  // Logs
  logs: LogEntry[];
  loadLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;
  
  // UI
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    isUnlocked: false,
    isConnected: false,
    currentAccount: null,
    currentNetwork: null,
    pendingRequests: 0,
    notifications: []
  });
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<Network | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar estado inicial
  useEffect(() => {
    loadWalletState();
    loadLogs();
  }, []);

  const loadWalletState = async () => {
    try {
      setIsLoading(true);
      
      // Verificar que el service worker esté activo - con retry
      let retries = 3;
      let response: any = null;
      
      while (retries > 0 && !response) {
        try {
          // Primero hacer ping
          await chrome.runtime.sendMessage({ type: 'PING' });
          // Si ping funciona, obtener estado
          response = await chrome.runtime.sendMessage({ type: 'GET_WALLET_STATE' });
          break;
        } catch (error) {
          console.error(`Intento fallido (${4-retries}/3):`, error);
          retries--;
          if (retries > 0) {
            // Esperar un poco antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 500));
            // Intentar activar el service worker
            try {
              chrome.runtime.connect({ name: 'keepalive' });
            } catch (e) {
              // Ignorar errores de conexión
            }
          } else {
            throw error;
          }
        }
      }
      
      if (response) {
        setAccounts(response.accounts || []);
        setCurrentAccount(response.currentAccount);
        setCurrentNetwork(response.currentNetwork);
        setNetworks(response.networks || []);
        
        setState(prev => ({
          ...prev,
          isUnlocked: response.accounts && response.accounts.length > 0,
          isConnected: response.currentAccount !== null,
          currentAccount: response.currentAccount,
          currentNetwork: response.currentNetwork
        }));
      }
    } catch (error) {
      console.error('Error al cargar estado del wallet:', error);
      setError('Error al cargar el estado del wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const generateWallet = async (): Promise<{ success: boolean; mnemonic: string }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ type: 'GENERATE_WALLET' });
      
      if (response.success) {
        await loadWalletState();
        return response;
      } else {
        throw new Error('Error al generar wallet');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const importWallet = async (mnemonic: string): Promise<{ success: boolean }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ 
        type: 'IMPORT_WALLET', 
        data: { mnemonic } 
      });
      
      if (response.success) {
        await loadWalletState();
        return response;
      } else {
        throw new Error('Error al importar wallet');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const switchAccount = async (accountIndex: number): Promise<{ success: boolean }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ 
        type: 'SWITCH_ACCOUNT', 
        data: { accountIndex } 
      });
      
      if (response.success) {
        await loadWalletState();
        return response;
      } else {
        throw new Error('Error al cambiar cuenta');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const switchNetwork = async (chainId: string): Promise<{ success: boolean }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ 
        type: 'SWITCH_NETWORK', 
        data: { chainId } 
      });
      
      if (response.success) {
        await loadWalletState();
        return response;
      } else {
        throw new Error('Error al cambiar red');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const addNetwork = async (network: Network): Promise<{ success: boolean }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ 
        type: 'ADD_NETWORK', 
        data: { network } 
      });
      
      if (response.success) {
        await loadWalletState();
        return response;
      } else {
        throw new Error('Error al agregar red');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const sendTransaction = async (transaction: any): Promise<{ success: boolean; hash?: string }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ 
        type: 'SEND_TRANSACTION', 
        data: { transaction } 
      });
      
      if (response.success) {
        return response;
      } else {
        throw new Error('Error al enviar transacción');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const signMessage = async (address: string, message: string): Promise<{ success: boolean; signature?: string }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ 
        type: 'SIGN_MESSAGE', 
        data: { address, message } 
      });
      
      if (response.success) {
        return response;
      } else {
        throw new Error('Error al firmar mensaje');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const signTypedData = async (address: string, typedData: any): Promise<{ success: boolean; signature?: string }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ 
        type: 'SIGN_TYPED_DATA', 
        data: { address, typedData } 
      });
      
      if (response.success) {
        return response;
      } else {
        throw new Error('Error al firmar datos tipados');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const getBalance = async (address: string): Promise<{ success: boolean; balance?: string }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_BALANCE', 
        data: { address } 
      });
      
      if (response.success) {
        return response;
      } else {
        throw new Error('Error al obtener balance');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const resetWallet = async (): Promise<{ success: boolean }> => {
    try {
      setError(null);
      const response = await chrome.runtime.sendMessage({ type: 'RESET_WALLET' });
      
      if (response.success) {
        await loadWalletState();
        return response;
      } else {
        throw new Error('Error al resetear wallet');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      throw error;
    }
  };

  const loadLogs = async (): Promise<void> => {
    try {
      // Verificar que el service worker esté activo antes de enviar mensaje
      let retries = 3;
      let response: any = null;
      
      while (retries > 0 && !response) {
        try {
          response = await chrome.runtime.sendMessage({ type: 'GET_LOGS' });
          break;
        } catch (error) {
          console.error(`Error al cargar logs (intento ${4-retries}/3):`, error);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
            try {
              chrome.runtime.connect({ name: 'keepalive' });
            } catch (e) {
              // Ignorar errores de conexión
            }
          } else {
            throw error;
          }
        }
      }
      
      if (response && response.success) {
        setLogs(response.logs || []);
      }
    } catch (error) {
      console.error('Error al cargar logs:', error);
    }
  };

  const clearLogs = async (): Promise<void> => {
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
      setLogs([]);
    } catch (error) {
      console.error('Error al limpiar logs:', error);
    }
  };

  const contextValue: WalletContextType = {
    state,
    accounts,
    currentAccount,
    currentNetwork,
    networks,
    generateWallet,
    importWallet,
    switchAccount,
    switchNetwork,
    addNetwork,
    sendTransaction,
    signMessage,
    signTypedData,
    getBalance,
    resetWallet,
    loadWalletState,
    logs,
    loadLogs,
    clearLogs,
    isLoading,
    error,
    setError
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet debe ser usado dentro de un WalletProvider');
  }
  return context;
};
