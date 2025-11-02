'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectionState } from '../types';
import {
  checkMetaMaskConnection,
  checkAnvilConnection,
  getActiveProvider
} from '../utils/wallet';

export const useWallet = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    account: null,
    isAnvilConnected: false,
    chainId: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar el estado de conexión
  const checkConnection = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Verificar MetaMask
      const metaMaskState = await checkMetaMaskConnection();
      
      // Verificar Anvil
      const isAnvilConnected = await checkAnvilConnection();

      // Priorizar MetaMask si está conectado, si no, usar Anvil
      if (metaMaskState.isConnected) {
        setConnectionState({
          isConnected: true,
          account: metaMaskState.account,
          isAnvilConnected,
          chainId: metaMaskState.chainId,
        });
      } else if (isAnvilConnected) {
        const anvilProvider = await getActiveProvider();
        if (anvilProvider) {
          setConnectionState({
            isConnected: true,
            account: anvilProvider.account,
            isAnvilConnected: true,
            chainId: null, // Anvil no expone chainId de la misma forma
          });
        }
      } else {
        setConnectionState({
          isConnected: false,
          account: null,
          isAnvilConnected: false,
          chainId: null,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      setConnectionState({
        isConnected: false,
        account: null,
        isAnvilConnected: false,
        chainId: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Conectar a MetaMask o Anvil
  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const activeProvider = await getActiveProvider();
      
      if (!activeProvider) {
        setError('No se pudo conectar a ninguna wallet. Verifica que MetaMask esté instalado o que Anvil esté ejecutándose.');
        setConnectionState({
          isConnected: false,
          account: null,
          isAnvilConnected: false,
          chainId: null,
        });
        return;
      }

      setConnectionState({
        isConnected: true,
        account: activeProvider.account,
        isAnvilConnected: !activeProvider.isMetaMask,
        chainId: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Desconectar
  const disconnect = useCallback(() => {
    setConnectionState({
      isConnected: false,
      account: null,
      isAnvilConnected: false,
      chainId: null,
    });
    setError(null);
  }, []);

  // Verificar conexión al montar el componente
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Escuchar cambios en MetaMask
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = () => {
        checkConnection();
      };

      const handleChainChanged = () => {
        checkConnection();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkConnection]);

  return {
    connectionState,
    loading,
    error,
    connect,
    disconnect,
    checkConnection,
  };
};

