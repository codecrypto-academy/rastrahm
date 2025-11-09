// Utilidades para interactuar con MinimalForwarder

import { ethers } from "ethers";
import { ForwardRequest } from "@/lib/types";

const FORWARDER_NAME = "MinimalForwarder";
const FORWARDER_VERSION = "0.0.1";

// TypeHash del ForwardRequest según el contrato
const FORWARD_REQUEST_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint256 deadline,bytes data)"
  )
);

/**
 * Obtiene el dominio EIP-712 para el MinimalForwarder
 */
export function getForwarderDomain(chainId: number, forwarderAddress: string) {
  return {
    name: FORWARDER_NAME,
    version: FORWARDER_VERSION,
    chainId: chainId,
    verifyingContract: forwarderAddress,
  };
}

/**
 * Obtiene el tipo EIP-712 para ForwardRequest
 */
export function getForwardRequestType() {
  return {
    ForwardRequest: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
  };
}

/**
 * Obtiene el nonce actual de un usuario
 */
export async function getNonce(
  provider: ethers.Provider,
  forwarderAddress: string,
  userAddress: string
): Promise<bigint> {
  const forwarderABI = ["function getNonce(address from) external view returns (uint256)"];
  const forwarder = new ethers.Contract(forwarderAddress, forwarderABI, provider);
  return await forwarder.getNonce(userAddress);
}

/**
 * Construye un ForwardRequest para votar
 */
export function buildVoteRequest(
  from: string,
  daoAddress: string,
  proposalId: number,
  voteType: number,
  nonce: bigint,
  chainId: number
): ForwardRequest {
  // Codificar la llamada a vote(uint256 proposalId, uint8 voteType)
  const daoABI = ["function vote(uint256 proposalId, uint8 voteType) external"];
  const daoInterface = new ethers.Interface(daoABI);
  const data = daoInterface.encodeFunctionData("vote", [proposalId, voteType]);

  // Deadline: 1 hora desde ahora
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  // Gas estimado (puede ajustarse según necesidad)
  const gas = BigInt(200000);

  return {
    from,
    to: daoAddress,
    value: BigInt(0),
    gas,
    nonce,
    deadline,
    data,
  };
}

/**
 * Construye un ForwardRequest para crear una propuesta
 */
export function buildCreateProposalRequest(
  from: string,
  daoAddress: string,
  recipient: string,
  amountWei: bigint,
  proposalDeadline: number | bigint,
  nonce: bigint,
  chainId: number
): ForwardRequest {
  const daoABI = [
    "function createProposal(address recipient, uint256 amount, uint256 deadline) external",
  ];
  const daoInterface = new ethers.Interface(daoABI);
  const encodedDeadline =
    typeof proposalDeadline === "bigint" ? proposalDeadline : BigInt(proposalDeadline);
  const data = daoInterface.encodeFunctionData("createProposal", [
    recipient,
    amountWei,
    encodedDeadline,
  ]);

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const gas = BigInt(300000);

  return {
    from,
    to: daoAddress,
    value: BigInt(0),
    gas,
    nonce,
    deadline,
    data,
  };
}

/**
 * Firma un ForwardRequest usando EIP-712
 */
export async function signForwardRequest(
  signer: ethers.JsonRpcSigner,
  request: ForwardRequest,
  chainId: number,
  forwarderAddress: string
): Promise<string> {
  const domain = getForwarderDomain(chainId, forwarderAddress);
  const types = getForwardRequestType();

  // Convertir el request al formato esperado por signTypedData
  // Asegurarse de que los valores numéricos sean strings o bigints según corresponda
  const typedRequest = {
    from: request.from,
    to: request.to,
    value: request.value.toString(),
    gas: request.gas.toString(),
    nonce: request.nonce.toString(),
    deadline: request.deadline.toString(),
    data: request.data, // Ya es string (hex)
  };

  // Firmar usando signTypedData (EIP-712)
  const signature = await signer.signTypedData(domain, types, typedRequest);

  return signature;
}

/**
 * Verifica que una firma es válida para un ForwardRequest
 */
export async function verifyForwardRequest(
  provider: ethers.Provider,
  forwarderAddress: string,
  request: ForwardRequest,
  signature: string
): Promise<boolean> {
  const forwarderABI = ["function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool)"];
  const forwarder = new ethers.Contract(forwarderAddress, forwarderABI, provider);
  
  try {
    return await forwarder.verify(request, signature);
  } catch (error) {
    console.error("Error verifying forward request:", error);
    return false;
  }
}

