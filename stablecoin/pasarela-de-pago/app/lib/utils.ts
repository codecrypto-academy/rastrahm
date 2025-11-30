import { formatUnits, parseUnits } from "ethers";

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number = 6): string {
  return parseFloat(formatUnits(amount, decimals)).toFixed(2);
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string, length: number = 4): string {
  if (!address) return "";
  if (address.length < length * 2 + 2) return address;
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format error message for display
 */
export function formatError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    if (error.message.includes("user rejected")) {
      return "Transacción rechazada por el usuario";
    }
    if (error.message.includes("insufficient funds")) {
      return "Fondos insuficientes";
    }
    if (error.message.includes("network")) {
      return "Error de red. Por favor verifica tu conexión.";
    }
    return error.message;
  }
  return "Ocurrió un error desconocido";
}

/**
 * Format units for display (re-export from ethers)
 */
export { formatUnits };

