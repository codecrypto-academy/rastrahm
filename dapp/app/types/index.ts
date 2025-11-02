export interface Signature {
  documentHash: string;
  signer: string;
  timestamp: bigint;
  signature: string;
}

export interface ConnectionState {
  isConnected: boolean;
  account: string | null;
  isAnvilConnected: boolean;
  chainId: string | null;
}

export interface DocumentInfo {
  hash: string;
  name: string;
  size: number;
  type: string;
}

export interface SigningData {
  document: File;
  documentHash: string;
  signatureHash: string;
  txHash: string;
  timestamp: number;
}

