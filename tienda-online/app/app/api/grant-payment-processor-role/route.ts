import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// ABI del contrato PaymentGateway
const PAYMENT_GATEWAY_ABI = [
  "function grantPaymentProcessorRole(address account) external",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function PAYMENT_PROCESSOR_ROLE() external view returns (bytes32)",
] as const;

// Leer variables de entorno
const getEnvVar = (key: string): string | null => {
  let value = process.env[key]?.trim();
  
  if (!value || value.includes("your_") || value.length < 20) {
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
      if (match && match[1]) {
        value = match[1].trim().replace(/^["']|["']$/g, "");
      }
    } catch (error) {
      console.error(`Error leyendo ${key} desde .env.local:`, error);
    }
  }
  
  return value || null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ecommerceAddress } = body;

    if (!ecommerceAddress) {
      return NextResponse.json(
        { error: "ecommerceAddress es requerido" },
        { status: 400 }
      );
    }

    // Validar formato de dirección Ethereum
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(ecommerceAddress)) {
      return NextResponse.json(
        { error: "Dirección Ethereum inválida" },
        { status: 400 }
      );
    }

    // Obtener configuración
    const privateKey = getEnvVar("PRIVATE_KEY");
    const rpcUrl = getEnvVar("NEXT_PUBLIC_RPC_URL") || "http://localhost:8545";
    const paymentGatewayAddress = getEnvVar("NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS") || 
                                  getEnvVar("PAYMENT_GATEWAY_ADDRESS");

    if (!privateKey) {
      return NextResponse.json(
        { error: "PRIVATE_KEY no configurada" },
        { status: 500 }
      );
    }

    if (!paymentGatewayAddress) {
      return NextResponse.json(
        { error: "PAYMENT_GATEWAY_ADDRESS no configurada" },
        { status: 500 }
      );
    }

    // Conectar al contrato
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const paymentGateway = new ethers.Contract(paymentGatewayAddress, PAYMENT_GATEWAY_ABI, wallet);

    // Verificar si ya tiene el rol
    const role = await paymentGateway.PAYMENT_PROCESSOR_ROLE();
    const hasRole = await paymentGateway.hasRole(role, ecommerceAddress);

    if (hasRole) {
      return NextResponse.json({
        success: true,
        message: "El contrato Ecommerce ya tiene el rol PAYMENT_PROCESSOR_ROLE",
        alreadyGranted: true,
      });
    }

    // Otorgar el rol
    console.log(`Otorgando PAYMENT_PROCESSOR_ROLE a ${ecommerceAddress}...`);
    const tx = await paymentGateway.grantPaymentProcessorRole(ecommerceAddress);
    await tx.wait();

    return NextResponse.json({
      success: true,
      message: "Rol PAYMENT_PROCESSOR_ROLE otorgado exitosamente",
      transactionHash: tx.hash,
      alreadyGranted: false,
    });
  } catch (error: any) {
    console.error("Error otorgando rol:", error);
    return NextResponse.json(
      { error: formatError(error) },
      { status: 500 }
    );
  }
}

function formatError(error: any): string {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  if (error?.reason) return error.reason;
  return "Error desconocido al otorgar rol";
}

