import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ethers } from "ethers";
import { PAYMENT_GATEWAY_ADDRESS, RPC_URL } from "@/lib/constants";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!stripeSecretKey) {
  console.error("❌ STRIPE_SECRET_KEY no está configurada en las variables de entorno");
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: "2024-12-18.acacia",
}) : null;

// ABI simplificado del contrato PaymentGateway
const PAYMENT_GATEWAY_ABI = [
  "function processPayment(string memory paymentId, address payer, address payee, uint256 amount, string memory invoiceId) external returns (bool)",
];

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET no está configurado");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verificar la firma del webhook
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

    try {
      // Extraer metadata
      const payerAddress = paymentIntent.metadata.payerAddress;
      const payeeAddress = paymentIntent.metadata.payeeAddress;
      const invoiceId = paymentIntent.metadata.invoiceId || "";

      if (!payerAddress || !payeeAddress) {
        console.error("Metadata faltante en payment intent:", paymentIntent.id);
        return NextResponse.json(
          { error: "Missing required metadata" },
          { status: 400 }
        );
      }

      // Validar direcciones Ethereum
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(payerAddress) || !ethAddressRegex.test(payeeAddress)) {
        console.error("Direcciones Ethereum inválidas en metadata");
        return NextResponse.json(
          { error: "Invalid Ethereum addresses" },
          { status: 400 }
        );
      }

      // Convertir amount de centavos a unidades base (EURT tiene 6 decimales)
      // amount está en centavos de euro (ej: 10000 = 100.00 EUR)
      // Necesitamos convertir a unidades base: amount * 10^4
      const amountInUnits = BigInt(paymentIntent.amount) * BigInt(10 ** 4);

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
      if (!PAYMENT_GATEWAY_ADDRESS) {
        console.error("PAYMENT_GATEWAY_ADDRESS no configurada");
        return NextResponse.json(
          { error: "PAYMENT_GATEWAY_ADDRESS not configured" },
          { status: 500 }
        );
      }

      // Conectar al proveedor y crear el signer
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);

      // Conectar al contrato
      const paymentGateway = new ethers.Contract(
        PAYMENT_GATEWAY_ADDRESS,
        PAYMENT_GATEWAY_ABI,
        wallet
      );

      // Usar el paymentIntent.id como paymentId único
      const paymentId = `stripe-${paymentIntent.id}`;

      // Procesar el pago on-chain
      const tx = await paymentGateway.processPayment(
        paymentId,
        payerAddress,
        payeeAddress,
        amountInUnits,
        invoiceId
      );

      // Esperar la confirmación
      const receipt = await tx.wait();

      console.log(`Pago procesado exitosamente: ${paymentIntent.id} -> TX: ${receipt.hash}`);

      return NextResponse.json({
        received: true,
        paymentIntentId: paymentIntent.id,
        txHash: receipt.hash,
      });
    } catch (error: any) {
      console.error("Error procesando pago on-chain:", error);
      return NextResponse.json(
        { error: error.message || "Error processing payment" },
        { status: 500 }
      );
    }
  }

  // Para otros tipos de eventos, solo confirmar recepción
  return NextResponse.json({ received: true });
}

