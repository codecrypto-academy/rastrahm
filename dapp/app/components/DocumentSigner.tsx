'use client';

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { 
  calculateFileHash, 
  getContractInstance, 
  getActiveProvider, 
  formatAddress, 
  getAnvilAccounts,
  getAnvilSignerByAddress
} from '../utils/wallet';
import { DocumentInfo } from '../types';
import { USE_ANVIL } from '../utils/constants';

export default function DocumentSigner() {
  const { connectionState } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [documentHash, setDocumentHash] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [availableAccounts, setAvailableAccounts] = useState<Array<{ index: number; address: string; privateKey: string }>>([]);

  // Cargar cuentas disponibles al montar
  useEffect(() => {
    if (USE_ANVIL) {
      const accounts = getAnvilAccounts();
      setAvailableAccounts(accounts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función para manejar la selección de archivo
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    try {
      setError(null);
      setSuccess(null);
      setFile(selectedFile);
      setIsProcessing(true);
      
      // Calcular hash del archivo
      const hash = await calculateFileHash(selectedFile);
      setDocumentHash(hash);
      
      setIsProcessing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar el archivo';
      setError(message);
      setIsProcessing(false);
    }
  }, []);

  // Función para el input de archivo
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // Funciones para drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  // Función para firmar el documento
  const handleSignDocument = async () => {
    if (!file || !documentHash) {
      setError('Por favor selecciona un archivo primero');
      return;
    }

    setIsSigning(true);
    setError(null);
    setSuccess(null);

    try {
      let signer;
      
      // Si estamos usando Anvil, usar la cuenta seleccionada
      if (USE_ANVIL && selectedAccount) {
        // Validar que sea una dirección válida
        if (!ethers.isAddress(selectedAccount)) {
          throw new Error('Dirección inválida. Por favor ingresa una dirección válida de Ethereum (0x...)');
        }
        
        const anvilSigner = await getAnvilSignerByAddress(selectedAccount);
        if (!anvilSigner) {
          throw new Error('No se puede obtener el signer para esta dirección');
        }
        signer = anvilSigner;
      } else {
        // Si no, usar el proveedor activo (MetaMask)
        if (!connectionState.isConnected || !connectionState.account) {
          throw new Error('Por favor conecta tu wallet primero');
        }
        const activeProvider = await getActiveProvider();
        if (!activeProvider || !activeProvider.signer) {
          throw new Error('No se puede obtener el signer');
        }
        signer = activeProvider.signer;
      }
      
      // Crear un mensaje firmable y firmarlo
      const message = `DocumentSigner: ${documentHash}`;
      const signature = await signer.signMessage(message);

      // Crear instancia del contrato con el signer
      const provider = signer.provider;
      if (!provider) {
        throw new Error('No se puede obtener el provider');
      }
      const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import('../utils/constants');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Enviar transacción
      const tx = await contract.signDocument(documentHash, signature);
      
      console.log('Documento firmado:', {
        documentHash,
        signer: await signer.getAddress()
      });
      
      // Mostrar hash de transacción
      setSuccess(`Transacción enviada: ${formatAddress(tx.hash)}`);
      
      // Esperar confirmación
      await tx.wait();
      
      const signerAddress = await signer.getAddress();
      setSuccess(`✅ Documento firmado exitosamente por ${formatAddress(signerAddress)}! Hash: ${formatAddress(documentHash)}`);
      
      // Limpiar formulario
      setFile(null);
      setDocumentHash('');
      
    } catch (err: any) {
      let message = 'Error al firmar el documento';
      
      if (err.code === 'ACTION_REJECTED') {
        message = 'Transacción cancelada por el usuario';
      } else if (err.reason) {
        message = err.reason;
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-4 dark:text-white transition-colors duration-300">Firmar Documento</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded transition-colors duration-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 rounded transition-colors duration-300">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Input de cuenta para firmar */}
        {USE_ANVIL && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors duration-300">
            <label className="block text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2 transition-colors duration-300">
              Dirección de la cuenta para firmar:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-4 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm transition-colors duration-300"
              />
              {availableAccounts.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedAccount(e.target.value);
                    }
                  }}
                  className="px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-colors duration-300"
                  value=""
                >
                  <option value="">Cuentas rápidas</option>
                  {availableAccounts.map((account) => (
                    <option key={account.address} value={account.address}>
                      Cuenta {account.index}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 transition-colors duration-300">
              ℹ️ Ingresa la dirección de la cuenta de Anvil o usa una de las predefinidas
            </p>
          </div>
        )}

        {/* Área de drop */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${isDragging 
              ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 bg-gray-50 dark:bg-gray-700/30'
            }
          `}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Procesando archivo...</p>
            </div>
          ) : file ? (
            <div className="space-y-2">
              <div className="text-4xl mb-2">📄</div>
              <p className="font-semibold text-lg">{file.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              {documentHash && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Hash del documento:</p>
                  <p className="text-xs font-mono text-gray-800 dark:text-gray-100 break-all">
                    {documentHash}
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  setFile(null);
                  setDocumentHash('');
                  setError(null);
                  setSuccess(null);
                }}
                className="mt-4 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-6xl mb-4">📎</div>
              <p className="text-lg text-gray-700 dark:text-gray-200">
                Arrastra y suelta tu documento aquí
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">o</p>
              <label className="inline-block">
                <span className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                  Seleccionar archivo
                </span>
                <input
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.odt"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Formatos soportados: PDF, DOC, DOCX, TXT, ODT
              </p>
            </div>
          )}
        </div>

        {/* Botón de firma */}
        {file && documentHash && (
          <button
            onClick={handleSignDocument}
            disabled={isSigning || (!USE_ANVIL && !connectionState.isConnected)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSigning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Firmando...</span>
              </>
            ) : (
              <>
                <span className="text-xl">✍️</span>
                <span>Firmar Documento</span>
              </>
            )}
          </button>
        )}

        {/* Información adicional */}
        {!USE_ANVIL && !connectionState.isConnected && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
            ⚠️ Debes conectar tu wallet antes de firmar un documento
          </div>
        )}
      </div>
    </div>
  );
}

