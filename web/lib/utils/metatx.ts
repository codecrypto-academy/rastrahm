// Utilidades generales para meta-transacciones

import { ethers } from "ethers";
import { ForwardRequest } from "@/lib/types";
import {
  getNonce,
  buildVoteRequest,
  signForwardRequest,
} from "@/lib/contracts/forwarder";

/**
 * Construye y firma una meta-transacción para votar
 */
export async function buildAndSignVoteMetaTx(
  signer: ethers.JsonRpcSigner,
  provider: ethers.Provider,
  forwarderAddress: string,
  daoAddress: string,
  proposalId: number,
  voteType: number,
  chainId: number
): Promise<{ request: ForwardRequest; signature: string }> {
  const account = await signer.getAddress();
  
  // Obtener nonce
  const nonce = await getNonce(provider, forwarderAddress, account);
  
  // Construir request
  const request = buildVoteRequest(
    account,
    daoAddress,
    proposalId,
    voteType,
    nonce,
    chainId
  );
  
  // Firmar request
  const signature = await signForwardRequest(
    signer,
    request,
    chainId,
    forwarderAddress
  );
  
  return { request, signature };
}

/**
 * Formatea un ForwardRequest para enviarlo al relayer
 */
export function formatForwardRequestForRelay(request: ForwardRequest) {
  return {
    from: request.from,
    to: request.to,
    value: request.value.toString(),
    gas: request.gas.toString(),
    nonce: request.nonce.toString(),
    deadline: request.deadline.toString(),
    data: request.data,
  };
}

