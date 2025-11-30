import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { PAYMENT_GATEWAY_ADDRESS, RPC_URL } from "@/lib/constants";
import { parseUnits } from "ethers";

// ABI simplificado del contrato PaymentGateway
const PAYMENT_GATEWAY_ABI = [
  "function processPayment(string memory paymentId, address payer, address payee, uint256 amount, string memory invoiceId) external returns (bool)",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, payerAddress, payeeAddress, amount, invoiceId } = body;

    // Validaciones
    if (!paymentId || !payerAddress || !payeeAddress || !amount) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // Validar formato de direcciones Ethereum
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(payerAddress) || !ethAddressRegex.test(payeeAddress)) {
      return NextResponse.json(
        { error: "Direcciones Ethereum inválidas" },
        { status: 400 }
      );
    }

    // Validar que el monto sea mayor que cero
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      return NextResponse.json(
        { error: "El monto debe ser mayor que cero" },
        { status: 400 }
      );
    }

    // Verificar que tenemos la clave privada para firmar
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "PRIVATE_KEY no configurada en el servidor" },
        { status: 500 }
      );
    }

    // Verificar que tenemos la dirección del contrato
    if (!PAYMENT_GATEWAY_ADDRESS) {
      return NextResponse.json(
        { error: "PAYMENT_GATEWAY_ADDRESS no configurada" },
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

    // Procesar el pago
    const tx = await paymentGateway.processPayment(
      paymentId,
      payerAddress,
      payeeAddress,
      amountBigInt,
      invoiceId || ""
    );

    // Esperar la confirmación
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      paymentId,
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    
    // Manejar errores específicos
    let errorMessage = "Error al procesar el pago";
    if (error.message) {
      if (error.message.includes("insufficient allowance")) {
        errorMessage = "No tienes suficiente allowance. Por favor aprueba el contrato primero.";
      } else if (error.message.includes("insufficient balance")) {
        errorMessage = "No tienes suficiente balance de EURT.";
      } else if (error.message.includes("already processed")) {
        errorMessage = "Este pago ya fue procesado anteriormente.";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

