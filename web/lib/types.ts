// Tipos TypeScript para los contratos

export enum VoteType {
  A_FAVOR = 0,
  EN_CONTRA = 1,
  ABSTENCION = 2,
}

export interface Proposal {
  id: bigint;
  recipient: string;
  amount: bigint;
  deadline: bigint;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstention: bigint;
  executed: boolean;
  executionTime: bigint;
  creationTime: bigint;
  description?: string;
}

export interface ForwardRequest {
  from: string;
  to: string;
  value: bigint;
  gas: bigint;
  nonce: bigint;
  deadline: bigint;
  data: string;
}

export interface Web3State {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

