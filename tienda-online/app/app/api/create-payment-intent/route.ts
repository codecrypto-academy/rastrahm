import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { readFileSync } from "fs";
import { join } from "path";

// Leer la variable de entorno directamente del archivo .env.local si Next.js no la carga correctamente
const getStripeSecretKey = () => {
  // Primero intentar con process.env (método estándar de Next.js)
  let key = process.env.STRIPE_SECRET_KEY?.trim();
  
  // Si no está disponible o es un placeholder, intentar leer directamente del archivo
  if (!key || key === "sk_test_your_stripe_secret_key" || key.length < 50) {
    try {
      const envPath = join(process.cwd(), ".env.local");
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^STRIPE_SECRET_KEY=(.+)$/m);
      if (match && match[1]) {
        key = match[1].trim();
        console.log("📄 Leyendo STRIPE_SECRET_KEY directamente de .env.local");
      }
    } catch (error) {
      console.error("❌ Error leyendo .env.local:", error);
    }
  }
  
  if (!key || key === "sk_test_your_stripe_secret_key" || key.length < 50) {
    console.error("⚠️  STRIPE_SECRET_KEY no está configurada correctamente");
    return null;
  }
  
  return key;
};

// Inicializar Stripe solo cuando se necesite (en cada request)
const getStripe = () => {
  const key = getStripeSecretKey();
  if (!key) {
    return null;
  }
  return new Stripe(key, {
    apiVersion: "2024-11-20.acacia",
    timeout: 30000,
    maxNetworkRetries: 2,
  });
};

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe no está configurado. Verifica STRIPE_SECRET_KEY en .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { amount, payerAddress, companyId, invoiceId } = body;

    // Validaciones
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor que cero" },
        { status: 400 }
      );
    }

    if (!payerAddress || !companyId) {
      return NextResponse.json(
        { error: "Las direcciones de payer y companyId son requeridas" },
        { status: 400 }
      );
    }

    // Validar formato de dirección Ethereum
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(payerAddress)) {
      return NextResponse.json(
        { error: "Dirección Ethereum inválida" },
        { status: 400 }
      );
    }

    // Crear Payment Intent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount en centavos
      currency: "eur",
      metadata: {
        payerAddress,
        companyId: companyId.toString(),
        invoiceId: invoiceId || "",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    console.log("✅ Payment Intent creado exitosamente:", paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    
    // Manejar errores específicos de Stripe
    let errorMessage = "Error al crear el payment intent";
    
    if (error.type === "StripeAuthenticationError") {
      errorMessage = "Clave API de Stripe inválida. Verifica STRIPE_SECRET_KEY en .env.local";
    } else if (error.type === "StripeInvalidRequestError") {
      errorMessage = error.message || "Solicitud inválida a Stripe";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

