import { formatUnits, parseUnits } from "ethers";

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number = 6): string {
  return parseFloat(formatUnits(amount, decimals)).toFixed(2);
}

/**
 * Format units for display (re-export from ethers)
 */
export { formatUnits };

/**
 * Parse EUR amount to token base units
 */
export function parseEurToToken(amountEur: string | number, decimals: number = 6): bigint {
  const amount = typeof amountEur === "string" ? parseFloat(amountEur) : amountEur;
  return parseUnits(amount.toFixed(decimals), decimals);
}

/**
 * Convert cents (Stripe format) to EUR string
 */
export function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Convert EUR to cents (Stripe format)
 */
export function eurToCents(eur: number): number {
  return Math.round(eur * 100);
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
      return "Transaction rejected by user";
    }
    if (error.message.includes("insufficient funds")) {
      return "Insufficient funds";
    }
    if (error.message.includes("network")) {
      return "Network error. Please check your connection.";
    }
    return error.message;
  }
  return "An unknown error occurred";
}


