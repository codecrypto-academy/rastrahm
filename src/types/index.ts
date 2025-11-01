import { ethers } from 'ethers';

// Tipos para el almacenamiento
export interface WalletStorage {
  mnemonic?: string;
  accounts: Account[];
  currentAccount: number;
  chainId: string;
  networks: Network[];
  theme: 'light' | 'dark';
  language: 'es' | 'en';
}

// Tipos para cuentas
export interface Account {
  address: string;
  privateKey: string;
  publicKey: string;
  index: number;
  name?: string;
  balance: string;
}

// Tipos para redes
export interface Network {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorer?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet?: boolean;
}

// Tipos para transacciones
export interface TransactionRequest {
  to?: string;
  from?: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId?: string;
}

// Tipos para EIP-712
export interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
  salt?: string;
}

export interface TypedDataField {
  name: string;
  type: string;
}

export interface TypedData {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, any>;
}

// Tipos para EIP-1193 Provider
export interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export interface ProviderMessage {
  type: string;
  data: unknown;
}

export interface ProviderConnectInfo {
  chainId: string;
}

// Tipos para eventos
export interface WalletEvent {
  type: 'accountsChanged' | 'chainChanged' | 'connect' | 'disconnect';
  data: any;
  timestamp: number;
}

// Tipos para logs
export interface LogEntry {
  id: string;
  type: 'call' | 'event' | 'error' | 'operation';
  message: string;
  data?: any;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
}

// Tipos para tokens ERC-20
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  logo?: string;
}

// Tipos para ENS
export interface ENSInfo {
  name?: string;
  address?: string;
  avatar?: string;
}

// Tipos para notificaciones
export interface NotificationData {
  id: string;
  type: 'transaction' | 'connection' | 'error';
  title: string;
  message: string;
  data?: any;
  timestamp: number;
}

// Tipos para el estado del wallet
export interface WalletState {
  isUnlocked: boolean;
  isConnected: boolean;
  currentAccount: Account | null;
  currentNetwork: Network | null;
  pendingRequests: number;
  notifications: NotificationData[];
}

// Tipos para mensajes entre scripts
export interface Message {
  type: string;
  data?: any;
  id?: string;
}

// Tipos para EIP-6963
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

// Tipos para gas EIP-1559
export interface GasFees {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  gasPrice?: string;
}

// Tipos para transferencias internas
export interface InternalTransfer {
  to: string;
  amount: string;
  token?: string; // Si es undefined, es ETH
}

// Tipos para validación de formularios
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Tipos para configuración
export interface WalletConfig {
  autoLock: boolean;
  lockTimeout: number;
  showTestnets: boolean;
  defaultGasLimit: string;
  defaultGasPrice: string;
}
