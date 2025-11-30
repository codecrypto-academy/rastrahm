import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { RPC_URL, STABLECOIN_PURCHASE_ADDRESS } from "@/lib/constants";
import { STABLECOIN_PURCHASE_ABI } from "@/lib/contracts";
import { centsToEur } from "@/lib/utils";
import Stripe from "stripe";
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
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: "2024-11-20.acacia",
}) : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "paymentIntentId es requerido" },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe no está configurado" },
        { status: 500 }
      );
    }

    // Obtener el Payment Intent de Stripe para verificar que el pago fue exitoso
    console.log(`🔍 Verificando Payment Intent: ${paymentIntentId}`);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: `El pago no fue exitoso. Estado: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // Extraer metadata
    const buyerAddress = paymentIntent.metadata.buyerAddress;

    if (!buyerAddress) {
      console.error("❌ Metadata faltante en payment intent:", paymentIntent.id);
      return NextResponse.json(
        { error: "Missing buyerAddress in metadata" },
        { status: 400 }
      );
    }

    // Validar dirección Ethereum
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(buyerAddress)) {
      console.error("❌ Dirección Ethereum inválida en metadata");
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
      console.error("❌ PRIVATE_KEY no configurada");
      return NextResponse.json(
        { error: "PRIVATE_KEY not configured" },
        { status: 500 }
      );
    }

    // Verificar que tenemos la dirección del contrato
    if (!STABLECOIN_PURCHASE_ADDRESS) {
      console.error("❌ STABLECOIN_PURCHASE_ADDRESS no configurada");
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

    // Verificar si la compra ya fue procesada
    try {
      const isProcessed = await stablecoinPurchase.isPurchaseProcessed(purchaseId);
      if (isProcessed) {
        console.log(`⚠️  Compra ya procesada: ${purchaseId}`);
        return NextResponse.json({
          success: true,
          message: "Compra ya procesada anteriormente",
          paymentIntentId: paymentIntent.id,
          purchaseId,
        });
      }
    } catch (error) {
      // Si el método no existe o hay error, continuar con el procesamiento
      console.log("⚠️  No se pudo verificar si la compra fue procesada, continuando...");
    }

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
        success: true,
        paymentIntentId: paymentIntent.id,
        txHash: receipt.hash,
        buyerAddress,
        amount: amountEurInCents.toString(),
        amountEur: amountEurDisplay,
        purchaseId,
      });
  } catch (error: any) {
    console.error("❌ Error procesando compra:", error);
    return NextResponse.json(
      { error: error.message || "Error processing purchase" },
      { status: 500 }
    );
  }
}

