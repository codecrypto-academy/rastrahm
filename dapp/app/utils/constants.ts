// ABI del contrato DocumentSigner
import DocumentSignerABI from '../abis/DocumentSigner.json';
export const CONTRACT_ABI = DocumentSignerABI;

// Dirección de Anvil local
export const ANVIL_URL = process.env.NEXT_PUBLIC_ANVIL_URL || "http://127.0.0.1:8545";

// Chain ID de Anvil
export const ANVIL_CHAIN_ID = process.env.NEXT_PUBLIC_ANVIL_CHAIN_ID || "0x7a69"; // 31337 en hexadecimal

// Dirección del contrato desplegado
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Clave privada de la primera cuenta de Anvil para desarrollo
// Esta es la cuenta con índice 0 de Anvil que tiene fondos automáticamente
export const ANVIL_ACCOUNT_PRIVATE_KEY = 
  process.env.NEXT_PUBLIC_ANVIL_ACCOUNT_PRIVATE_KEY || 
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Anvil genera 20 cuentas con fondos automáticamente
// Estas son las claves privadas estándar de Anvil (índices 0-9)
export const ANVIL_ACCOUNTS = [
  { index: 0, privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" },
  { index: 1, privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" },
  { index: 2, privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" },
  { index: 3, privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" },
  { index: 4, privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f873d9bc11c6fcf456c64" },
  { index: 5, privateKey: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba" },
  { index: 6, privateKey: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e" },
  { index: 7, privateKey: "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356" },
  { index: 8, privateKey: "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97" },
  { index: 9, privateKey: "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6" },
];

// Mensaje de error estándar cuando no se encuentra MetaMask
export const METAMASK_NOT_FOUND = 
  process.env.NEXT_PUBLIC_METAMASK_NOT_FOUND || 
  "Por favor instala MetaMask para continuar";

// Forzar el uso de Anvil en desarrollo (útil para evitar usar MetaMask)
export const USE_ANVIL = process.env.NEXT_PUBLIC_USE_ANVIL === 'true';
