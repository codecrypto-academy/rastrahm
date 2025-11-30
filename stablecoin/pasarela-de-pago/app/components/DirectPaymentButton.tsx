"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { parseUnits } from "ethers";
import { isValidAddress } from "@/lib/utils";

interface DirectPaymentButtonProps {
  onPaymentInit?: () => void;
}

export function DirectPaymentButton({ onPaymentInit }: DirectPaymentButtonProps) {
  const { account, isConnected, signer, provider } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [invoiceId, setInvoiceId] = useState("");

  const handleInitiatePayment = async () => {
    if (!isConnected || !account) {
      alert("Por favor conecta tu wallet primero");
      return;
    }

    setShowForm(true);
    onPaymentInit?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !payeeAddress) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    if (!isValidAddress(payeeAddress)) {
      alert("Por favor ingresa una dirección Ethereum válida");
      return;
    }

    if (!signer || !provider) {
      alert("Error: Wallet no conectada correctamente");
      return;
    }

    setIsLoading(true);
    try {
      // Generar un paymentId único
      const paymentId = `direct-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Convertir el monto a unidades base (EURT tiene 6 decimales)
      const amountInUnits = parseUnits(amount, 6);

      // Llamar a la API para procesar el pago
      const response = await fetch("/api/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId,
          payerAddress: account,
          payeeAddress: payeeAddress,
          amount: amountInUnits.toString(),
          invoiceId: invoiceId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al procesar el pago");
      }

      const data = await response.json();
      
      alert(`Pago procesado exitosamente! TX Hash: ${data.txHash}`);
      setShowForm(false);
      setAmount("");
      setPayeeAddress("");
      setInvoiceId("");
    } catch (error: any) {
      console.error("Error procesando pago:", error);
      alert(error.message || "Error al procesar el pago. Por favor intenta de nuevo.");
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
            Monto (EURT)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Dirección del Beneficiario
          </label>
          <input
            type="text"
            value={payeeAddress}
            onChange={(e) => setPayeeAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            placeholder="0x..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ID de Factura (Opcional)
          </label>
          <input
            type="text"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="invoice-123"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar EURT
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setAmount("");
              setPayeeAddress("");
              setInvoiceId("");
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      onClick={handleInitiatePayment}
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
          <Send className="w-5 h-5" />
          Pagar con EURT
        </>
      )}
    </button>
  );
}

