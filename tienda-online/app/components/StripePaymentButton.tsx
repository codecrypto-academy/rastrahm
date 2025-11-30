"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

interface StripePaymentButtonProps {
  companyId: bigint;
  totalAmount: bigint;
  invoiceId: bigint | null;
  onSuccess: (paymentId?: string) => void;
  onCancel: () => void;
}

function StripePaymentForm({
  companyId,
  totalAmount,
  invoiceId,
  onSuccess,
  onCancel,
}: StripePaymentButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { account } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublishableKey = async () => {
      try {
        const response = await fetch("/api/stripe-publishable-key");
        if (!response.ok) throw new Error("Failed to fetch publishable key");
        const data = await response.json();
        setPublishableKey(data.publishableKey);
      } catch (err) {
        console.error("Error fetching publishable key:", err);
        setError("Error cargando configuración de Stripe");
      }
    };
    fetchPublishableKey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !account) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Crear payment intent
      const amountInCents = Math.round(Number(totalAmount) / 10_000); // Convertir de unidades base (6 decimales) a centavos
      
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInCents,
          payerAddress: account,
          companyId: companyId.toString(),
          invoiceId: invoiceId?.toString() || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el payment intent");
      }

      const { clientSecret } = await response.json();

      // Confirmar pago
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || "Error al procesar el pago");
      }

      if (paymentIntent?.status === "succeeded") {
        // Pasar el paymentId al callback para que el componente padre procese el pago en el contrato
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      console.error("Error procesando pago:", err);
      setError(err.message || "Error al procesar el pago");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (priceInUnits: bigint): string => {
    const priceInEur = Number(priceInUnits) / 1_000_000;
    return priceInEur.toFixed(2);
  };

  if (!publishableKey) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Cargando...</span>
      </div>
    );
  }

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#9e2146",
                },
              },
            }}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pagar €{formatPrice(totalAmount)}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export function StripePaymentButton(props: StripePaymentButtonProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    const initStripe = async () => {
      try {
        const response = await fetch("/api/stripe-publishable-key");
        if (!response.ok) return;
        const data = await response.json();
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (err) {
        console.error("Error initializing Stripe:", err);
      }
    };
    initStripe();
  }, []);

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm {...props} />
    </Elements>
  );
}

