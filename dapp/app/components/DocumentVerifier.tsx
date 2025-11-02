'use client';

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { calculateFileHash, formatAddress, getAnvilAccounts } from '../utils/wallet';
import { USE_ANVIL, CONTRACT_ADDRESS, CONTRACT_ABI, ANVIL_URL } from '../utils/constants';

export default function DocumentVerifier() {
  const [file, setFile] = useState<File | null>(null);
  const [documentHash, setDocumentHash] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    isVerified: boolean;
    signer: string;
    timestamp: number;
  } | null>(null);
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
      setVerificationResult(null);
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

  // Función para verificar el documento
  const handleVerifyDocument = async () => {
    if (!file || !documentHash) {
      setError('Por favor selecciona un archivo primero');
      return;
    }

    // Validar que se haya ingresado una dirección
    if (!selectedAccount) {
      setError('Por favor ingresa la dirección de la cuenta con que se firmó el documento');
      return;
    }

    // Validar que sea una dirección válida
    if (!ethers.isAddress(selectedAccount)) {
      setError('Dirección inválida. Por favor ingresa una dirección válida de Ethereum (0x...)');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setVerificationResult(null);

    try {
      // Obtener instancia del contrato de solo lectura (más eficiente para view functions)
      const provider = new ethers.JsonRpcProvider(ANVIL_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      console.log('Verificando:', {
        documentHash,
        selectedAccount,
        contractAddress: CONTRACT_ADDRESS
      });

      // Verificar usando hasSigned directamente (más simple y confiable)
      let isVerified;
      try {
        isVerified = await contract.hasSigned(documentHash, selectedAccount);
        console.log('Resultado de verificación:', isVerified);
      } catch (verifyErr: any) {
        console.error('Error verificando hasSigned:', verifyErr);
        throw new Error(`Error verificando: ${verifyErr.message}`);
      }

      // Si está verificado, buscar el timestamp usando getSignatureCount + getSignature
      if (isVerified) {
        try {
          const signatureCount = await contract.getSignatureCount();
          let foundTimestamp = 0;
          
          // Buscar en las firmas existentes
          for (let i = 0; i < Number(signatureCount); i++) {
            try {
              const sig = await contract.getSignature(i);
              if (sig.documentHash === documentHash && 
                  sig.signer.toLowerCase() === selectedAccount.toLowerCase()) {
                foundTimestamp = Number(sig.timestamp);
                break;
              }
            } catch (err) {
              // Continuar buscando si hay algún error
              continue;
            }
          }

          setVerificationResult({
            isVerified: true,
            signer: selectedAccount,
            timestamp: foundTimestamp || Math.floor(Date.now() / 1000)
          });
        } catch (searchErr) {
          // Si no se puede buscar el timestamp, mostrar verificación exitosa igual
          setVerificationResult({
            isVerified: true,
            signer: selectedAccount,
            timestamp: Math.floor(Date.now() / 1000)
          });
        }
      } else {
        setVerificationResult({
          isVerified: false,
          signer: selectedAccount,
          timestamp: 0
        });
      }
      
    } catch (err: any) {
      let message = 'Error al verificar el documento';
      
      if (err.message) {
        message = err.message;
      }
      
      setError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-4 dark:text-white transition-colors duration-300">Verificar Documento</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded transition-colors duration-300">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Input de cuenta para verificar */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-semibold text-blue-800 mb-2">
            Dirección de la cuenta que firmó el documento:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-4 py-2 border border-blue-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            {USE_ANVIL && availableAccounts.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedAccount(e.target.value);
                  }
                }}
                className="px-3 py-2 border border-blue-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          <p className="text-xs text-blue-600 mt-2">
            ℹ️ Ingresa la dirección de la cuenta que firmó el documento para verificarlo
          </p>
        </div>

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
              <p className="text-gray-600">Procesando archivo...</p>
            </div>
          ) : file ? (
            <div className="space-y-2">
              <div className="text-4xl mb-2">📄</div>
              <p className="font-semibold text-lg">{file.name}</p>
              <p className="text-sm text-gray-600">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              {documentHash && (
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <p className="text-xs text-gray-600 mb-1">Hash del documento:</p>
                  <p className="text-xs font-mono text-gray-800 break-all">
                    {documentHash}
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  setFile(null);
                  setDocumentHash('');
                  setError(null);
                  setVerificationResult(null);
                }}
                className="mt-4 text-sm text-red-600 hover:text-red-800"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg text-gray-700">
                Arrastra y suelta tu documento aquí
              </p>
              <p className="text-sm text-gray-500">o</p>
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
              <p className="text-xs text-gray-500 mt-2">
                Formatos soportados: PDF, DOC, DOCX, TXT, ODT
              </p>
            </div>
          )}
        </div>

        {/* Botón de verificación */}
        {file && documentHash && (
          <button
            onClick={handleVerifyDocument}
            disabled={isVerifying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span className="text-xl">✓</span>
                <span>Verificar Documento</span>
              </>
            )}
          </button>
        )}

        {/* Resultado de verificación */}
        {verificationResult && (
          <div className={`p-6 rounded-lg border-2 ${
            verificationResult.isVerified 
              ? 'bg-green-50 border-green-500' 
              : 'bg-yellow-50 border-yellow-500'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`text-4xl ${verificationResult.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                {verificationResult.isVerified ? '✅' : '⚠️'}
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-lg mb-2 ${
                  verificationResult.isVerified ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {verificationResult.isVerified 
                    ? 'Documento Verificado' 
                    : 'Documento No Verificado'}
                </h3>
                
                {verificationResult.isVerified && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">Firmado por:</span>
                      <div className="font-mono text-gray-900 mt-1">
                        {verificationResult.signer}
                      </div>
                    </div>
                    {verificationResult.timestamp > 0 && (
                      <div>
                        <span className="font-semibold text-gray-700">Fecha de firma:</span>
                        <div className="text-gray-900 mt-1">
                          {new Date(verificationResult.timestamp * 1000).toLocaleString('es-ES')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {!verificationResult.isVerified && (
                  <p className="text-yellow-800 text-sm">
                    Este documento no ha sido firmado o no se encuentra en el registro.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          ℹ️ La verificación consulta el contrato inteligente para verificar si el documento fue firmado previamente.
        </div>
      </div>
    </div>
  );
}

