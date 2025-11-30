import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";

// ABI del contrato Ecommerce
const ECOMMERCE_ABI = [
  "function createInvoice(address customer, uint256 companyId) external returns (uint256)",
  "function getInvoice(uint256 invoiceId) external view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, bytes32 paymentTxHash, tuple(uint256 productId, uint256 quantity)[] items))",
  "function getCustomer(address customerAddress) external view returns (tuple(address customerAddress, string name, string email, uint256 registeredAt, bool isActive))",
  "function getCart(address customer) external view returns (tuple(uint256 productId, uint256 quantity)[])",
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
    const { companyId, customerAddress } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId es requerido" },
        { status: 400 }
      );
    }

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

    // Conectar al contrato (solo para lectura)
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ECOMMERCE_ABI, provider);

    // Verificar que el cliente esté registrado
    try {
      const customer = await contract.getCustomer(customerAddress);
      if (customer.registeredAt === 0) {
        return NextResponse.json(
          { error: "El cliente no está registrado. Por favor regístrate primero." },
          { status: 400 }
        );
      }
    } catch (err: any) {
      if (err.message?.includes("customer does not exist") || 
          err.reason?.includes("customer does not exist")) {
        return NextResponse.json(
          { error: "El cliente no está registrado. Por favor regístrate primero." },
          { status: 400 }
        );
      }
      // Si es otro error, continuar (podría ser un problema de conexión)
      console.warn("Error verificando cliente, continuando:", err);
    }

    // Verificar que el carrito no esté vacío
    try {
      const cart = await contract.getCart(customerAddress);
      if (!cart || cart.length === 0) {
        return NextResponse.json(
          { error: "El carrito está vacío. Agrega productos antes de crear la factura." },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error("Error verificando carrito:", err);
      return NextResponse.json(
        { error: "Error al verificar el carrito" },
        { status: 500 }
      );
    }

    // NO crear la factura aquí - el cliente debe hacerlo desde el frontend
    // Retornar información para que el frontend cree la factura
    return NextResponse.json({
      ready: true,
      message: "Cliente registrado y carrito con items. El cliente debe crear la factura desde su wallet.",
    });
  } catch (error: any) {
    console.error("Error creando factura:", error);
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
  return "Error desconocido al crear factura";
}

