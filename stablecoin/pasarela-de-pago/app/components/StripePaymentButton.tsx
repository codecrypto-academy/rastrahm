"use client";

import { useState, useEffect } from "react";
import { CreditCard, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface StripePaymentButtonProps {
  onPaymentInit?: () => void;
}

// Componente para el formulario de tarjeta
function CardPaymentForm({
  clientSecret,
  paymentIntentId,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("No se pudo encontrar el elemento de tarjeta");
      setIsProcessing(false);
      return;
    }

    try {
      // Confirmar el pago con Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        setError(confirmError.message || "Error al procesar el pago");
        onError(confirmError.message || "Error al procesar el pago");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess();
      } else {
        setError("El pago no se completó correctamente");
        onError("El pago no se completó correctamente");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Error inesperado al procesar el pago";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Datos de la Tarjeta
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Procesando pago...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Confirmar Pago
          </>
        )}
      </button>
    </form>
  );
}

export function StripePaymentButton({ onPaymentInit }: StripePaymentButtonProps) {
  const { account, isConnected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "succeeded" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  // Obtener la clave pública dinámicamente desde la API
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Obtener la clave pública desde la API route
      fetch("/api/stripe-publishable-key")
        .then((res) => res.json())
        .then((data) => {
          if (data.publishableKey) {
            const key = data.publishableKey;
            console.log(`✅ STRIPE_PUBLISHABLE_KEY obtenida: ${key.substring(0, 12)}... (longitud: ${key.length})`);
            setStripePromise(loadStripe(key));
          } else {
            console.error("⚠️  No se pudo obtener STRIPE_PUBLISHABLE_KEY desde la API");
            console.error("⚠️  Verifica que .env.local tenga la clave pública real (pk_test_...)");
          }
        })
        .catch((error) => {
          console.error("❌ Error obteniendo STRIPE_PUBLISHABLE_KEY:", error);
        });
    }
  }, []);

  const handleInitiatePayment = async () => {
    if (!isConnected || !account) {
      alert("Por favor conecta tu wallet primero");
      return;
    }

    setIsLoading(true);
    try {
      // Aquí iría la lógica para crear el payment intent
      // Por ahora, mostramos el formulario
      setShowForm(true);
      onPaymentInit?.();
    } catch (error) {
      console.error("Error iniciando pago:", error);
      alert("Error al iniciar el pago. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !payeeAddress) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    // Validar formato de direcciones Ethereum antes de enviar
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!account || !ethAddressRegex.test(account)) {
      alert("Por favor conecta una wallet válida");
      return;
    }
    if (!ethAddressRegex.test(payeeAddress)) {
      alert("La dirección del beneficiario no es válida. Debe ser una dirección Ethereum (0x...)");
      return;
    }

    setIsLoading(true);
    try {
      // Crear payment intent
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount) * 100, // Convertir a centavos
          payerAddress: account,
          payeeAddress: payeeAddress.trim(),
          invoiceId: invoiceId?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al crear el payment intent");
      }

      const data = await response.json();
      
      // Guardar el clientSecret para usar con Stripe Elements
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setShowCardForm(true);
      }
    } catch (error: any) {
      console.error("Error procesando pago:", error);
      const errorMessage = error.message || "Error al procesar el pago. Por favor intenta de nuevo.";
      alert(errorMessage);
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

  // Si tenemos un clientSecret, mostrar el formulario de tarjeta
  if (showCardForm && clientSecret) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Monto:</strong> {amount} EUR
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
            <strong>Beneficiario:</strong> {payeeAddress.substring(0, 10)}...{payeeAddress.substring(payeeAddress.length - 8)}
          </p>
        </div>
        {stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CardPaymentForm
            clientSecret={clientSecret}
            paymentIntentId={paymentIntentId}
            onSuccess={() => {
              setPaymentStatus("succeeded");
              setShowCardForm(false);
              setShowForm(false);
              setAmount("");
              setPayeeAddress("");
              setInvoiceId("");
              setClientSecret("");
              setPaymentIntentId("");
            }}
            onError={(error) => {
              setPaymentStatus("error");
              setErrorMessage(error);
            }}
          />
          </Elements>
        ) : (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              ❌ Error: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada correctamente.
              Verifica que .env.local tenga la clave pública real (pk_test_...).
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setShowCardForm(false);
            setClientSecret("");
            setPaymentIntentId("");
            setPaymentStatus("idle");
            setErrorMessage("");
          }}
          className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Monto (EUR)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="invoice-123"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Continuar con Stripe
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
              setClientSecret("");
              setPaymentIntentId("");
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
      className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando...
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          Pagar con Stripe
        </>
      )}
    </button>
  );
}

