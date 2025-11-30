"use client";

import { useState } from "react";
import { X, CreditCard, Wallet, Loader2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getEcommerceContractAsync } from "@/lib/contracts";
import { formatError } from "@/lib/utils";
import { StripePaymentButton } from "./StripePaymentButton";
import { EURTPaymentButton } from "./EURTPaymentButton";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: bigint;
  totalAmount: bigint;
  invoiceId: bigint | null;
  onPaymentSuccess?: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  companyId,
  totalAmount,
  invoiceId,
  onPaymentSuccess,
}: CheckoutModalProps) {
  const { isConnected, account, signer } = useWallet();
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "eurt" | null>(null);
  const [isProcessingContract, setIsProcessingContract] = useState(false);

  const processStripePaymentInContract = async (paymentId: string) => {
    if (!signer || !invoiceId) return;

    setIsProcessingContract(true);
    try {
      const contract = await getEcommerceContractAsync(signer);
      const tx = await contract.processPayment(invoiceId, paymentId);
      await tx.wait();
      return true;
    } catch (err) {
      console.error("Error procesando pago en contrato:", err);
      throw err;
    } finally {
      setIsProcessingContract(false);
    }
  };

  if (!isOpen) return null;

  const formatPrice = (priceInUnits: bigint): string => {
    const priceInEur = Number(priceInUnits) / 1_000_000; // 6 decimales
    return priceInEur.toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Proceder al Pago
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Por favor conecta tu wallet para proceder al pago
              </p>
            </div>
          ) : !paymentMethod ? (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                <p className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-1">
                  Total a pagar
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  €{formatPrice(totalAmount)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod("stripe")}
                  className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-orange-500 dark:hover:border-orange-500 transition-all hover:shadow-lg flex flex-col items-center gap-3"
                >
                  <CreditCard className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">Pagar con Stripe</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tarjeta de crédito/débito
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod("eurt")}
                  className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-orange-500 dark:hover:border-orange-500 transition-all hover:shadow-lg flex flex-col items-center gap-3"
                >
                  <Wallet className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">Pagar con EURT</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Stablecoin en blockchain
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : paymentMethod === "stripe" ? (
            <StripePaymentButton
              companyId={companyId}
              totalAmount={totalAmount}
              invoiceId={invoiceId}
              onSuccess={async (paymentId?: string) => {
                // Procesar pago en el contrato después de que Stripe confirme
                if (paymentId && invoiceId) {
                  try {
                    await processStripePaymentInContract(paymentId);
                  } catch (err) {
                    alert(`Pago de Stripe exitoso, pero error al procesar en contrato: ${formatError(err)}`);
                    return;
                  }
                }
                onPaymentSuccess?.();
                onClose();
              }}
              onCancel={() => setPaymentMethod(null)}
            />
          ) : (
            <EURTPaymentButton
              companyId={companyId}
              totalAmount={totalAmount}
              invoiceId={invoiceId}
              onSuccess={() => {
                onPaymentSuccess?.();
                onClose();
              }}
              onCancel={() => setPaymentMethod(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

