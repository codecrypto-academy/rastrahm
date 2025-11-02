'use client';

import { useWallet } from '../hooks/useWallet';
import { formatAddress } from '../utils/wallet';

export default function WalletConnection() {
  const {
    connectionState,
    loading,
    error,
    connect,
    disconnect,
  } = useWallet();

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-4 dark:text-white transition-colors duration-300">Conexión de Wallet</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded transition-colors duration-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Estado de conexión */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded transition-colors duration-300">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">Estado:</span>
            <span className={`ml-2 font-semibold ${
              connectionState.isConnected 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-600 dark:text-gray-300'
            } transition-colors duration-300`}>
              {connectionState.isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          {connectionState.isConnected && connectionState.isAnvilConnected && (
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm transition-colors duration-300">
              Anvil
            </span>
          )}
        </div>

        {/* Información de la cuenta */}
        {connectionState.account && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">Cuenta:</span>
                <div className="mt-1 font-mono text-lg dark:text-white transition-colors duration-300">
                  {formatAddress(connectionState.account)}
                </div>
              </div>
              {connectionState.isAnvilConnected && (
                <div className="text-xs text-purple-600 dark:text-purple-400 transition-colors duration-300">
                  (Primera cuenta de Anvil)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3">
          {!connectionState.isConnected ? (
            <button
              onClick={connect}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Conectando...' : 'Conectar Wallet'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Desconectar
            </button>
          )}
        </div>

        {/* Información adicional */}
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 transition-colors duration-300">
          <p>• Si tienes MetaMask instalado, se usará automáticamente</p>
          <p>• Si no, se conectará a Anvil con la primera cuenta</p>
          <p>• Asegúrate de que Anvil esté ejecutándose en {`${typeof window !== 'undefined' ? window.location.protocol === 'http:' ? 'http://127.0.0.1:8545' : '' : 'http://127.0.0.1:8545'}`}</p>
        </div>
      </div>
    </div>
  );
}

