"use client";

import { useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import {
  buildCreateProposalRequest,
  getNonce,
  signForwardRequest,
} from "@/lib/contracts/forwarder";
import { formatForwardRequestForRelay } from "@/lib/utils/metatx";

const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "";
const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || "";
const RELAYER_API_URL = "/api/relay";

interface GaslessProposalParams {
  recipient: string;
  amountWei: bigint;
  deadlineTimestamp: number;
}

export function useGaslessProposal() {
  const { account, provider, signer, chainId } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProposal = async ({
    recipient,
    amountWei,
    deadlineTimestamp,
  }: GaslessProposalParams) => {
    if (!account || !provider || !signer || !chainId) {
      throw new Error("Wallet no conectada");
    }

    if (!FORWARDER_ADDRESS || !DAO_ADDRESS) {
      throw new Error("Direcciones de contratos no configuradas");
    }

    setLoading(true);
    setError(null);

    try {
      const nonce = await getNonce(provider, FORWARDER_ADDRESS, account);
      const request = buildCreateProposalRequest(
        account,
        DAO_ADDRESS,
        recipient,
        amountWei,
        deadlineTimestamp,
        nonce,
        chainId
      );

      const signature = await signForwardRequest(
        signer,
        request,
        chainId,
        FORWARDER_ADDRESS
      );

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

      try {
        if (result?.txHash) {
          await provider.waitForTransaction(result.txHash);
        }
      } catch (waitError) {
        console.warn("No se pudo confirmar la transacción en el provider local:", waitError);
      }

      return result;
    } catch (err: any) {
      const message = err?.message || "Error al crear propuesta sin gas";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProposal,
    loading,
    error,
  };
}

