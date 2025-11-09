import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { ForwardRequest } from "@/lib/types";

// Variables de entorno
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;

// ABI del MinimalForwarder
const FORWARDER_ABI = [
  "function execute((address from, address to, uint256 value, uint256 gas, uint256 nonce, uint256 deadline, bytes data) req, bytes signature) payable returns (bool success, bytes memory returndata)",
  "function verify((address from, address to, uint256 value, uint256 gas, uint256 nonce, uint256 deadline, bytes data) req, bytes signature) view returns (bool)",
  "function getNonce(address from) external view returns (uint256)",
];

export async function POST(nextRequest: NextRequest) {
  try {
    // Validar variables de entorno
    if (!RELAYER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "RELAYER_PRIVATE_KEY no configurada" },
        { status: 500 }
      );
    }

    if (!FORWARDER_ADDRESS) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_FORWARDER_ADDRESS no configurada" },
        { status: 500 }
      );
    }

    // Parsear el body
    const body = await nextRequest.json();
    const { request: forwardRequest, signature } = body;

    // Validar formato del request
    if (!forwardRequest || !signature) {
      return NextResponse.json(
        { error: "Request o signature faltante" },
        { status: 400 }
      );
    }

    // Validar campos requeridos
    const requiredFields = ["from", "to", "value", "gas", "nonce", "deadline", "data"];
    for (const field of requiredFields) {
      if (forwardRequest[field] === undefined || forwardRequest[field] === null) {
        return NextResponse.json(
          { error: `Campo requerido faltante: ${field}` },
          { status: 400 }
        );
      }
    }

    // Crear provider y wallet del relayer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

    // Crear instancia del contrato MinimalForwarder
    const forwarder = new ethers.Contract(
      FORWARDER_ADDRESS,
      FORWARDER_ABI,
      relayerWallet
    );

    // Convertir el request al formato esperado por el contrato
    const request: ForwardRequest = {
      from: forwardRequest.from,
      to: forwardRequest.to,
      value: BigInt(forwardRequest.value),
      gas: BigInt(forwardRequest.gas),
      nonce: BigInt(forwardRequest.nonce),
      deadline: BigInt(forwardRequest.deadline),
      data: forwardRequest.data,
    };

    console.info("[relay] ForwardRequest recibido", {
      from: request.from,
      to: request.to,
      value: request.value.toString(),
      gas: request.gas.toString(),
      nonce: request.nonce.toString(),
      deadline: request.deadline.toString(),
      data: request.data,
    });

    // Verificar la firma antes de ejecutar (opcional pero recomendado)
    try {
      const expectedNonce = await forwarder.getNonce(request.from);
      console.info("[relay] Nonce esperado en forwarder", expectedNonce.toString());
      const isValid = await forwarder.verify.staticCall(request, signature);
      if (!isValid) {
        return NextResponse.json(
          { error: "Firma inválida o request no válido" },
          { status: 400 }
        );
      }
    } catch (verifyError: any) {
      console.error("Error verificando firma:", verifyError);
      return NextResponse.json(
        { error: `Error verificando firma: ${verifyError.message}` },
        { status: 400 }
      );
    }

    // Estimar el gas necesario
    let gasEstimate: bigint;
    try {
      gasEstimate = await forwarder.execute.estimateGas(request, signature, {
        value: request.value,
      });
      // Agregar un 20% de margen
      gasEstimate = (gasEstimate * BigInt(120)) / BigInt(100);
    } catch (estimateError: any) {
      console.error("Error estimando gas:", estimateError);
      // Si falla la estimación, usar el gas especificado en el request
      gasEstimate = request.gas;
    }

    // Ejecutar la transacción
    try {
      const tx = await forwarder.execute(request, signature, {
        value: request.value,
        gasLimit: gasEstimate,
      });

      // Esperar la confirmación
      const receipt = await tx.wait();

      if (!receipt) {
        return NextResponse.json(
          { error: "Transacción enviada pero no confirmada" },
          { status: 500 }
        );
      }

      // Verificar si la transacción fue exitosa
      if (receipt.status === 0) {
        return NextResponse.json(
          { error: "Transacción revertida" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });
    } catch (executeError: any) {
      console.error("Error ejecutando transacción:", executeError);
      
      // Intentar extraer el mensaje de error más específico
      let errorMessage = "Error ejecutando transacción";
      if (executeError.reason) {
        errorMessage = executeError.reason;
      } else if (executeError.message) {
        errorMessage = executeError.message;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error en /api/relay:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

