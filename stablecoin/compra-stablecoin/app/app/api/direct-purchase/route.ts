import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";

// ABI mínimo para StablecoinPurchase
const STABLECOIN_PURCHASE_ABI = [
  "function purchaseTokens(string memory purchaseId, address buyer, uint256 amountEur) external",
  "function euroToken() view returns (address)",
  "function isPurchaseProcessed(string memory purchaseId) view returns (bool)",
] as const;

// Leer la clave privada del backend para firmar transacciones
const getPrivateKey = () => {
  // Primero intentar con process.env
  let key = process.env.PRIVATE_KEY?.trim();
  
  // Si no está disponible, intentar leer directamente del archivo
  if (!key || key === "0x..." || key.length < 40) {
    try {
      const envPath = join(process.cwd(), ".env.local");
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^PRIVATE_KEY=(.+)$/m);
      if (match && match[1]) {
        key = match[1].trim();
        console.log("📄 Leyendo PRIVATE_KEY directamente de .env.local");
      }
    } catch (error) {
      console.error("❌ Error leyendo .env.local:", error);
    }
  }
  
  if (!key || key === "0x..." || key.length < 40) {
    console.error("❌ PRIVATE_KEY no está configurada en las variables de entorno");
    return null;
  }
  
  return key;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, buyerAddress, txHash } = body;

    // Validaciones
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor que cero" },
        { status: 400 }
      );
    }

    if (!buyerAddress) {
      return NextResponse.json(
        { error: "La dirección del comprador es requerida" },
        { status: 400 }
      );
    }

    // Validar formato de dirección Ethereum
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(buyerAddress)) {
      return NextResponse.json(
        { error: "Dirección Ethereum inválida" },
        { status: 400 }
      );
    }

    // Verificar que se haya enviado una transacción
    if (!txHash) {
      return NextResponse.json(
        { error: "Se requiere el hash de la transacción de ETH" },
        { status: 400 }
      );
    }

    // Obtener la clave privada del backend
    const privateKey = getPrivateKey();
    if (!privateKey) {
      return NextResponse.json(
        { error: "PRIVATE_KEY no está configurada. El backend necesita una clave privada para procesar compras directas." },
        { status: 500 }
      );
    }

    // Conectar a la red
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Verificar que la transacción existe y fue exitosa
    const tx = await provider.getTransactionReceipt(txHash);
    if (!tx || tx.status !== 1) {
      return NextResponse.json(
        { error: "La transacción no fue exitosa o no existe" },
        { status: 400 }
      );
    }

    // Verificar que la transacción fue enviada desde buyerAddress
    const txDetails = await provider.getTransaction(txHash);
    if (txDetails.from.toLowerCase() !== buyerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "La transacción no fue enviada desde la dirección del comprador" },
        { status: 400 }
      );
    }

    // Verificar que la transacción fue enviada a la wallet del backend
    const backendAddress = wallet.address.toLowerCase();
    if (txDetails.to?.toLowerCase() !== backendAddress) {
      return NextResponse.json(
        { error: `La transacción debe ser enviada a la wallet del backend (${backendAddress}), no a ${txDetails.to}` },
        { status: 400 }
      );
    }

    // Verificar que el monto de la transacción coincida con el monto esperado
    // Tasa de conversión: 1 EUR = 1 ETH (para pruebas)
    const expectedAmountWei = ethers.parseEther(amount.toString());
    const actualAmount = txDetails.value;
    
    // Verificar que la transacción tiene un valor
    if (!actualAmount || actualAmount === null) {
      return NextResponse.json(
        { error: "La transacción no tiene un valor (value) válido" },
        { status: 400 }
      );
    }
    
    // El monto debe ser exacto (txDetails.value no incluye gas fees)
    if (actualAmount !== expectedAmountWei) {
      return NextResponse.json(
        { error: `El monto de la transacción (${ethers.formatEther(actualAmount)} ETH) no coincide con el esperado (${ethers.formatEther(expectedAmountWei)} ETH)` },
        { status: 400 }
      );
    }

    // Obtener la dirección del contrato desde las variables de entorno
    const STABLECOIN_PURCHASE_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS;
    
    if (!STABLECOIN_PURCHASE_ADDRESS) {
      return NextResponse.json(
        { error: "STABLECOIN_PURCHASE_ADDRESS no está configurado" },
        { status: 500 }
      );
    }

    const contract = new ethers.Contract(
      STABLECOIN_PURCHASE_ADDRESS,
      STABLECOIN_PURCHASE_ABI,
      wallet
    );

    // Generar un purchaseId único basado en el txHash
    const purchaseId = `direct-${txHash}`;

    // Convertir el monto de EUR a centavos (Stripe format)
    // amount viene en EUR (ej: 10.50)
    // Necesitamos convertir a centavos (ej: 1050)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Llamar al contrato para acuñar los tokens
    console.log(`🔑 Procesando compra directa: ${purchaseId}`);
    console.log(`🔑 Comprador: ${buyerAddress}`);
    console.log(`🔑 Monto: ${amountInCents} centavos (${amount} EUR)`);

    const txResponse = await contract.purchaseTokens(
      purchaseId,
      buyerAddress,
      amountInCents
    );

    // Esperar confirmación
    const receipt = await txResponse.wait();

    console.log(`✅ Compra directa procesada exitosamente: ${receipt.hash}`);

    return NextResponse.json({
      success: true,
      purchaseId,
      txHash: receipt.hash,
      amount: amountInCents,
      buyerAddress,
    });
  } catch (error: any) {
    console.error("Error procesando compra directa:", error);
    
    let errorMessage = "Error al procesar la compra directa";
    
    if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

