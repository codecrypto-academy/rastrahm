import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// ABI del contrato Ecommerce
const ECOMMERCE_ABI = [
  "function getCustomer(address customerAddress) external view returns (tuple(address customerAddress, string name, string email, uint256 registeredAt, bool isActive))",
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
    const { customerAddress } = body;

    if (!customerAddress) {
      return NextResponse.json(
        { error: "customerAddress es requerido" },
        { status: 400 }
      );
    }

    // Validar formato de dirección Ethereum
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(customerAddress)) {
      return NextResponse.json(
        { error: "Dirección Ethereum inválida" },
        { status: 400 }
      );
    }

    // Obtener configuración
    const rpcUrl = getEnvVar("NEXT_PUBLIC_RPC_URL") || "http://localhost:8545";
    const contractAddress = getEnvVar("NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS") || 
                           getEnvVar("NEXT_PUBLIC_ECOMMERCE_ADDRESS");

    if (!contractAddress) {
      return NextResponse.json(
        { error: "ECOMMERCE_CONTRACT_ADDRESS no configurada" },
        { status: 500 }
      );
    }

    // Conectar al contrato
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ECOMMERCE_ABI, provider);

    try {
      // Intentar obtener el cliente
      const customer = await contract.getCustomer(customerAddress);
      
      // Si el cliente existe, registeredAt será mayor que 0
      const isRegistered = customer.registeredAt > 0;

      return NextResponse.json({
        isRegistered,
        customer: isRegistered ? {
          name: customer.name,
          email: customer.email,
          registeredAt: customer.registeredAt.toString(),
          isActive: customer.isActive,
        } : null,
      });
    } catch (err: any) {
      // Si el error indica que el cliente no existe, retornar isRegistered: false
      if (err.message?.includes("customer does not exist") || 
          err.reason?.includes("customer does not exist")) {
        return NextResponse.json({
          isRegistered: false,
          customer: null,
        });
      }
      throw err;
    }
  } catch (error: any) {
    console.error("Error verificando cliente:", error);
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
  return "Error desconocido al verificar cliente";
}

