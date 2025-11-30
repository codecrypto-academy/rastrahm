"use client";

import { useState } from "react";
import { Wallet, Loader2, Send, CheckCircle2, XCircle } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { parseEther, formatEther } from "ethers";
import { isValidAddress } from "@/lib/utils";

interface DirectPurchaseButtonProps {
  onPurchaseInit?: () => void;
}

// Tasa de conversión: 1 EUR = 1 ETH (para pruebas, en producción usaría un oráculo)
const ETH_TO_EUR_RATE = 1;

export function DirectPurchaseButton({ onPurchaseInit }: DirectPurchaseButtonProps) {
  const { account, isConnected, signer, provider } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleInitiatePurchase = async () => {
    if (!isConnected || !account) {
      alert("Por favor conecta tu wallet primero");
      return;
    }

    setShowForm(true);
    setError(null);
    setSuccess(false);
    setTxHash(null);
    onPurchaseInit?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount) {
      setError("Por favor ingresa el monto a comprar");
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      setError("El monto debe ser mayor que cero");
      return;
    }

    if (!signer || !provider) {
      setError("Error: Wallet no conectada correctamente");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Calcular el monto en ETH (1 EUR = 1 ETH para pruebas)
      const ethAmount = amountNum * ETH_TO_EUR_RATE;
      const ethAmountWei = parseEther(ethAmount.toString());

      // Verificar balance de ETH
      const balance = await provider.getBalance(account);
      if (balance < ethAmountWei) {
        setError(`Fondos insuficientes. Necesitas ${ethAmount} ETH pero tienes ${formatEther(balance)} ETH`);
        setIsLoading(false);
        return;
      }

      // Obtener la dirección del backend desde la API
      // Para compra directa, enviamos ETH a la wallet del backend
      // El backend luego procesa la compra y acuña los tokens
      let backendAddress: string;
      
      try {
        // Obtener la dirección del backend desde una API route
        const addressResponse = await fetch("/api/backend-address");
        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          backendAddress = addressData.address;
        } else {
          throw new Error("No se pudo obtener la dirección del backend");
        }
      } catch (err) {
        setError("Error al obtener la dirección del backend. Verifica que PRIVATE_KEY esté configurada en .env.local");
        setIsLoading(false);
        return;
      }

      if (!backendAddress) {
        setError("La dirección del backend no está disponible");
        setIsLoading(false);
        return;
      }

      // Enviar ETH a la wallet del backend
      console.log(`📤 Enviando ${ethAmount} ETH a wallet del backend: ${backendAddress}...`);
      
      const tx = await signer.sendTransaction({
        to: backendAddress,
        value: ethAmountWei,
      });

      console.log(`⏳ Transacción enviada: ${tx.hash}`);
      setTxHash(tx.hash);

      // Esperar confirmación
      const receipt = await tx.wait();
      console.log(`✅ Transacción confirmada: ${receipt.hash}`);

      // Llamar a la API para procesar la compra y acuñar tokens
      const response = await fetch("/api/direct-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountNum,
          buyerAddress: account,
          txHash: receipt.hash,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al procesar la compra directa");
      }

      const data = await response.json();
      console.log("✅ Compra directa procesada:", data);

      setSuccess(true);
      setAmount("");
      
      // Limpiar después de 5 segundos
      setTimeout(() => {
        setShowForm(false);
        setSuccess(false);
        setTxHash(null);
      }, 5000);
    } catch (err: any) {
      console.error("Error procesando compra directa:", err);
      let errorMessage = "Error al procesar la compra directa. Por favor intenta de nuevo.";
      
      if (err.reason) {
        errorMessage = err.reason;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
        <p className="text-sm font-medium">Conecta tu wallet para continuar</p>
      </div>
    );
  }

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Monto a Comprar (EUR)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="0.00"
            required
            disabled={isLoading || success}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recibirás {amount || "0.00"} EURT (1 EUR = 1 EURT)
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            Enviarás {amount ? (parseFloat(amount) * ETH_TO_EUR_RATE).toFixed(4) : "0.0000"} ETH
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        {success && txHash && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              ¡Compra exitosa! Los tokens se han acuñado a tu wallet.
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 font-mono break-all">
              TX: {txHash}
            </p>
          </div>
        )}

        {!success && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 Compra directa: Envía ETH directamente y recibe EURT. 
              La transacción se procesará automáticamente.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || success}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Completado
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Comprar EURT
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setAmount("");
              setError(null);
              setSuccess(false);
              setTxHash(null);
            }}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {success ? "Cerrar" : "Cancelar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      onClick={handleInitiatePurchase}
      disabled={isLoading}
      className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando...
        </>
      ) : (
        <>
          <Wallet className="w-5 h-5" />
          Compra Directa
        </>
      )}
    </button>
  );
}

