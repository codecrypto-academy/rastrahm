"use client";

import { useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import {
  getNonce,
  buildVoteRequest,
  signForwardRequest,
} from "@/lib/contracts/forwarder";
import { formatForwardRequestForRelay } from "@/lib/utils/metatx";
import { VoteType } from "@/lib/types";

const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "";
const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || "";
const RELAYER_API_URL = "/api/relay";

export function useGaslessVote() {
  const { account, provider, signer, chainId } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = async (proposalId: number, voteType: VoteType) => {
    if (!account || !provider || !signer || !chainId) {
      throw new Error("Wallet no conectada");
    }

    if (!FORWARDER_ADDRESS || !DAO_ADDRESS) {
      throw new Error("Direcciones de contratos no configuradas");
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener nonce actual del usuario
      const nonce = await getNonce(provider, FORWARDER_ADDRESS, account);

      // 2. Construir ForwardRequest
      const request = buildVoteRequest(
        account,
        DAO_ADDRESS,
        proposalId,
        voteType,
        nonce,
        chainId
      );

      // 3. Firmar el request usando EIP-712
      const signature = await signForwardRequest(
        signer,
        request,
        chainId,
        FORWARDER_ADDRESS
      );

      // 4. Enviar al relayer
      const response = await fetch(RELAYER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: formatForwardRequestForRelay(request),
          signature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const result = await response.json();

      // Esperar a que la transacción se refleje en el provider del usuario
      try {
        if (result?.txHash) {
          await provider.waitForTransaction(result.txHash);
        }
      } catch (waitError) {
        console.warn("No se pudo confirmar la transacción en el provider local:", waitError);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Error al votar";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    vote,
    loading,
    error,
  };
}

