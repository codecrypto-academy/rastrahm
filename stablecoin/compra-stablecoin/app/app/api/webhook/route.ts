import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ethers } from "ethers";
import { RPC_URL, STABLECOIN_PURCHASE_ADDRESS } from "@/lib/constants";
import { STABLECOIN_PURCHASE_ABI } from "@/lib/contracts";
import { centsToEur } from "@/lib/utils";
import { readFileSync } from "fs";
import { join } from "path";

// Leer la variable de entorno directamente del archivo .env.local si Next.js no la carga correctamente
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
  
  return key;
};

const stripeSecretKey = getStripeSecretKey();

if (!stripeSecretKey) {
  console.error("❌ STRIPE_SECRET_KEY no está configurada en las variables de entorno");
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: "2024-11-20.acacia",
}) : null;

export async function POST(request: NextRequest) {
  console.log("🔔 Webhook recibido");
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ No signature provided");
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET no está configurado");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  if (!stripe) {
    console.error("❌ Stripe not configured");
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verificar la firma del webhook
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`✅ Webhook verificado: ${event.type} (ID: ${event.id})`);
  } catch (err: any) {
    console.error("❌ Error verificando webhook:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Solo procesar eventos de payment_intent.succeeded
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`💰 Procesando payment_intent.succeeded: ${paymentIntent.id}`);
    console.log(`   Amount: ${paymentIntent.amount} centavos`);
    console.log(`   Metadata:`, paymentIntent.metadata);

    try {
      // Extraer metadata
      const buyerAddress = paymentIntent.metadata.buyerAddress;
      const purchaseType = paymentIntent.metadata.purchaseType || "stripe";

      if (!buyerAddress) {
        console.error("❌ Metadata faltante en payment intent:", paymentIntent.id);
        console.error("   Metadata disponible:", paymentIntent.metadata);
        return NextResponse.json(
          { error: "Missing buyerAddress in metadata" },
          { status: 400 }
        );
      }

      // Validar dirección Ethereum
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(buyerAddress)) {
        console.error("Dirección Ethereum inválida en metadata");
        return NextResponse.json(
          { error: "Invalid Ethereum address" },
          { status: 400 }
        );
      }

      // El contrato espera amountEur en centavos
      // paymentIntent.amount ya está en centavos (ej: 1000 = 10.00 EUR)
      // El contrato multiplicará por 10^4 para obtener unidades base con 6 decimales
      // Entonces: 1000 centavos * 10^4 = 10,000,000 unidades base = 10.000000 EURT
      const amountEurInCents = BigInt(paymentIntent.amount);

      // Verificar que tenemos la clave privada
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error("PRIVATE_KEY no configurada");
        return NextResponse.json(
          { error: "PRIVATE_KEY not configured" },
          { status: 500 }
        );
      }

      // Verificar que tenemos la dirección del contrato
      if (!STABLECOIN_PURCHASE_ADDRESS) {
        console.error("STABLECOIN_PURCHASE_ADDRESS no configurada");
        return NextResponse.json(
          { error: "STABLECOIN_PURCHASE_ADDRESS not configured" },
          { status: 500 }
        );
      }

      // Conectar al proveedor y crear el signer
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);

      // Conectar al contrato
      const stablecoinPurchase = new ethers.Contract(
        STABLECOIN_PURCHASE_ADDRESS,
        STABLECOIN_PURCHASE_ABI,
        wallet
      );

      // Usar el paymentIntent.id como purchaseId único
      const purchaseId = `stripe-${paymentIntent.id}`;

      // Acuñar tokens al comprador
      // El contrato espera amountEur en centavos
      const amountEurDisplay = parseFloat(centsToEur(Number(amountEurInCents)));
      console.log(`🪙 Acuñando ${amountEurDisplay} EURT a ${buyerAddress}...`);
      const tx = await stablecoinPurchase.purchaseTokens(
        purchaseId,
        buyerAddress,
        amountEurInCents
      );

      // Esperar la confirmación
      const receipt = await tx.wait();

      console.log(`✅ Tokens acuñados exitosamente: ${paymentIntent.id} -> TX: ${receipt.hash}`);
      console.log(`   Comprador: ${buyerAddress}`);
      console.log(`   Cantidad: ${amountEurDisplay} EURT`);

      return NextResponse.json({
        received: true,
        paymentIntentId: paymentIntent.id,
        txHash: receipt.hash,
        buyerAddress,
        amount: amountEurInCents.toString(),
        amountEur: amountEurDisplay,
      });
    } catch (error: any) {
      console.error("Error procesando compra on-chain:", error);
      return NextResponse.json(
        { error: error.message || "Error processing purchase" },
        { status: 500 }
      );
    }
  }

  // Para otros tipos de eventos, solo confirmar recepción
  return NextResponse.json({ received: true });
}

