'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, ANVIL_URL } from '../utils/constants';
import { formatAddress, timestampToDate } from '../utils/wallet';

interface Signature {
  documentHash: string;
  signer: string;
  timestamp: bigint;
  signature: string;
}

export default function SignatureHistory() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar todas las firmas
  const loadSignatures = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const provider = new ethers.JsonRpcProvider(ANVIL_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Obtener el número de firmas
      const signatureCount = await contract.getSignatureCount();
      
      console.log('Número de firmas:', Number(signatureCount));

      // Cargar cada firma individualmente
      const loadedSignatures: Signature[] = [];
      for (let i = 0; i < Number(signatureCount); i++) {
        try {
          const sig = await contract.getSignature(i);
          loadedSignatures.push({
            documentHash: sig.documentHash,
            signer: sig.signer,
            timestamp: sig.timestamp,
            signature: sig.signature
          });
        } catch (err) {
          console.error(`Error cargando firma ${i}:`, err);
        }
      }

      setSignatures(loadedSignatures);
    } catch (err: any) {
      let message = 'Error al cargar el historial de firmas';
      
      if (err.message) {
        message = err.message;
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar firmas al montar el componente
  useEffect(() => {
    loadSignatures();
  }, []);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold dark:text-white transition-colors duration-300">Historial de Firmas</h2>
        <button
          onClick={loadSignatures}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Cargando...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Actualizar</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isLoading && signatures.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300">Cargando historial de firmas...</p>
        </div>
      ) : signatures.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300 text-lg">No hay firmas registradas aún</p>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 text-sm mt-2">
            Las firmas aparecerán aquí una vez que se firme un documento
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {signatures.map((sig, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 dark:text-gray-200">
                        Firma #{index + 1}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {timestampToDate(sig.timestamp).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 dark:text-gray-300">Hash del documento:</span>
                      <p className="text-xs font-mono text-gray-800 dark:text-gray-100 dark:text-gray-100 break-all bg-gray-50 dark:bg-gray-700/30 dark:bg-gray-700/30 p-2 rounded mt-1">
                        {sig.documentHash}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 dark:text-gray-300">Firmado por:</span>
                      <p className="text-xs font-mono text-gray-800 dark:text-gray-100 dark:text-gray-100 mt-1">
                        {formatAddress(sig.signer)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                    ✅ Verificado
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Información adicional */}
      {signatures.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800">
          ℹ️ Total de {signatures.length} {signatures.length === 1 ? 'firma' : 'firmas'} registradas en el contrato inteligente.
        </div>
      )}
    </div>
  );
}

