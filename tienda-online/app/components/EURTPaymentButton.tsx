"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Wallet, Loader2, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getEcommerceContractAsync } from "@/lib/contracts";
import { formatError } from "@/lib/utils";
import { ethers } from "ethers";

interface EURTPaymentButtonProps {
  companyId: bigint;
  totalAmount: bigint;
  invoiceId: bigint | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EURTPaymentButton({
  companyId,
  totalAmount,
  invoiceId,
  onSuccess,
  onCancel,
}: EURTPaymentButtonProps) {
  const { signer, account, isConnected, provider } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));

  useEffect(() => {
    const checkAllowance = async () => {
      if (!isConnected || !provider || !account || !invoiceId) return;

      try {
        // Obtener direcciones desde la API
        const response = await fetch("/api/payment-gateway-address");
        if (!response.ok) return;
        
        const { paymentGatewayAddress, euroTokenAddress } = await response.json();
        
        // Verificar allowance
        const euroTokenABI = [
          "function allowance(address owner, address spender) external view returns (uint256)",
          "function approve(address spender, uint256 amount) external returns (bool)",
        ];
        
        const euroToken = new ethers.Contract(euroTokenAddress, euroTokenABI, provider);
        const currentAllowance = await euroToken.allowance(account, paymentGatewayAddress);
        
        setAllowance(currentAllowance);
        setNeedsApproval(currentAllowance < totalAmount);
      } catch (err) {
        console.error("Error checking allowance:", err);
      }
    };

    checkAllowance();
  }, [isConnected, provider, account, invoiceId, totalAmount]);

  const handleApprove = async () => {
    if (!isConnected || !signer || !account || !invoiceId) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Obtener direcciones desde la API
      const response = await fetch("/api/payment-gateway-address");
      if (!response.ok) {
        throw new Error("Error obteniendo direcciones del contrato");
      }
      
      const { paymentGatewayAddress, euroTokenAddress } = await response.json();
      
      const euroTokenABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
      ];
      
      const euroToken = new ethers.Contract(euroTokenAddress, euroTokenABI, signer);
      const tx = await euroToken.approve(paymentGatewayAddress, totalAmount);
      await tx.wait();
      
      setNeedsApproval(false);
      setAllowance(totalAmount);
    } catch (err) {
      console.error("Error aprobando:", err);
      setError(formatError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!isConnected || !signer || !account || !invoiceId) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Primero, asegurarse de que el contrato Ecommerce tenga el rol PAYMENT_PROCESSOR_ROLE
      const { getEcommerceContractAddress } = await import("@/lib/contracts");
      const ecommerceAddress = await getEcommerceContractAddress();
      
      try {
        const grantRoleResponse = await fetch("/api/grant-payment-processor-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ecommerceAddress }),
        });

        if (grantRoleResponse.ok) {
          const grantData = await grantRoleResponse.json();
          if (!grantData.alreadyGranted) {
            console.log("✅ Rol PAYMENT_PROCESSOR_ROLE otorgado al contrato Ecommerce");
          }
        } else {
          console.warn("⚠️ No se pudo verificar/otorgar el rol, continuando...");
        }
      } catch (grantErr) {
        console.warn("⚠️ Error verificando rol, continuando:", grantErr);
      }

      const ecommerce = await getEcommerceContractAsync(signer);
      
      // Generar paymentId único
      const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log("💳 Procesando pago con EURT...", { invoiceId: invoiceId.toString(), paymentId });
      
      // Procesar pago
      const tx = await ecommerce.processPayment(invoiceId, paymentId);
      console.log("⏳ Esperando confirmación...", tx.hash);
      await tx.wait();
      
      console.log("✅ Pago procesado exitosamente");
      onSuccess();
    } catch (err) {
      console.error("❌ Error procesando pago:", err);
      setError(formatError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (priceInUnits: bigint): string => {
    const priceInEur = Number(priceInUnits) / 1_000_000;
    return priceInEur.toFixed(2);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a métodos de pago
      </button>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Total: <span className="font-bold">€{formatPrice(totalAmount)}</span>
        </p>
      </div>

      {needsApproval ? (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Necesitas aprobar el gasto de EURT antes de pagar
            </p>
          </div>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Aprobando...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                Aprobar EURT
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Pagar con EURT
            </>
          )}
        </button>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

