import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";

// ABI del contrato Ecommerce
const ECOMMERCE_ABI = [
  "function processPayment(uint256 invoiceId, string memory paymentId) external returns (bool)",
] as const;

// Leer variables de entorno
const getEnvVar = (key: string): string | null => {
  let value = process.env[key]?.trim();
  
  if (!value || value.includes("your_") || value.length < 20) {
    try {
      const envPath = join(process.cwd(), ".env.local");
      const envContent = readFileSync(envPath, "utf-8");
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
    const { invoiceId, paymentId } = body;

    if (!invoiceId || !paymentId) {
      return NextResponse.json(
        { error: "invoiceId y paymentId son requeridos" },
        { status: 400 }
      );
    }

    // Obtener configuración
    const privateKey = getEnvVar("PRIVATE_KEY");
    const rpcUrl = getEnvVar("NEXT_PUBLIC_RPC_URL") || "http://localhost:8545";
    const contractAddress = getEnvVar("NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS") || 
                           getEnvVar("NEXT_PUBLIC_ECOMMERCE_ADDRESS");

    if (!privateKey) {
      return NextResponse.json(
        { error: "PRIVATE_KEY no configurada" },
        { status: 500 }
      );
    }

    if (!contractAddress) {
      return NextResponse.json(
        { error: "ECOMMERCE_CONTRACT_ADDRESS no configurada" },
        { status: 500 }
      );
    }

    // Conectar al contrato
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, ECOMMERCE_ABI, wallet);

    // Procesar pago
    const tx = await contract.processPayment(BigInt(invoiceId), paymentId);
    await tx.wait();

    return NextResponse.json({
      success: true,
      transactionHash: tx.hash,
    });
  } catch (error: any) {
    console.error("Error procesando pago:", error);
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
  return "Error desconocido al procesar pago";
}

