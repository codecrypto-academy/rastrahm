import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { readFileSync } from "fs";
import { join } from "path";

// Leer variables de entorno
const getStripeSecretKey = () => {
  let key = process.env.STRIPE_SECRET_KEY?.trim();
  
  if (!key || key === "sk_test_your_stripe_secret_key" || key.length < 50) {
    try {
      const envPath = join(process.cwd(), ".env.local");
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^STRIPE_SECRET_KEY=(.+)$/m);
      if (match && match[1]) {
        key = match[1].trim();
      }
    } catch (error) {
      console.error("Error leyendo .env.local:", error);
    }
  }
  
  return key || null;
};

const getWebhookSecret = () => {
  let secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  
  if (!secret || secret === "whsec_your_webhook_secret") {
    try {
      const envPath = join(process.cwd(), ".env.local");
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^STRIPE_WEBHOOK_SECRET=(.+)$/m);
      if (match && match[1]) {
        secret = match[1].trim();
      }
    } catch (error) {
      console.error("Error leyendo .env.local:", error);
    }
  }
  
  return secret || null;
};

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: "2024-11-20.acacia",
}) : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET no está configurado");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Error verificando webhook:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Solo procesar eventos de payment_intent.succeeded
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    console.log("✅ Payment Intent succeeded:", paymentIntent.id);
    console.log("📦 Metadata:", paymentIntent.metadata);

    // El procesamiento del pago en el contrato se hace desde el frontend
    // después de que el usuario confirme, ya que requiere la firma del usuario
    // Este webhook solo registra que Stripe procesó el pago exitosamente
  }

  return NextResponse.json({ received: true });
}

