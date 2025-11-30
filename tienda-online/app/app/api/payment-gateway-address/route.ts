import { NextResponse } from "next/server";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// ABI mínimo para obtener paymentGateway
const ECOMMERCE_ABI = [
  "function paymentGateway() external view returns (address)",
  "function euroToken() external view returns (address)",
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

export async function GET() {
  try {
    const rpcUrl = getEnvVar("NEXT_PUBLIC_RPC_URL") || "http://localhost:8545";
    const contractAddress = getEnvVar("NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS") || 
                           getEnvVar("NEXT_PUBLIC_ECOMMERCE_ADDRESS");

    if (!contractAddress) {
      return NextResponse.json(
        { error: "ECOMMERCE_CONTRACT_ADDRESS not configured" },
        { status: 500 }
      );
    }

    // Conectar al contrato
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ECOMMERCE_ABI, provider);

    // Obtener direcciones
    const paymentGatewayAddress = await contract.paymentGateway();
    const euroTokenAddress = await contract.euroToken();

    return NextResponse.json({
      paymentGatewayAddress,
      euroTokenAddress,
    });
  } catch (error) {
    console.error("Error reading payment gateway address:", error);
    return NextResponse.json(
      { error: "Failed to read payment gateway address" },
      { status: 500 }
    );
  }
}

