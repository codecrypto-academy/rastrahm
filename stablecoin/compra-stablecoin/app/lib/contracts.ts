import { ethers } from "ethers";
import { EURO_TOKEN_ADDRESS, STABLECOIN_PURCHASE_ADDRESS } from "./constants";

// ABI mínimo para EuroToken
export const EURO_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
] as const;

// ABI mínimo para StablecoinPurchase
export const STABLECOIN_PURCHASE_ABI = [
  "function purchaseTokens(string memory purchaseId, address buyer, uint256 amountEur) external",
  "function euroToken() view returns (address)",
  "function isPurchaseProcessed(string memory purchaseId) view returns (bool)",
] as const;

/**
 * Get EuroToken contract instance
 */
export function getEuroTokenContract(signerOrProvider: ethers.Provider | ethers.Signer) {
  if (!EURO_TOKEN_ADDRESS) {
    throw new Error("EURO_TOKEN_ADDRESS not configured");
  }
  return new ethers.Contract(EURO_TOKEN_ADDRESS, EURO_TOKEN_ABI, signerOrProvider);
}

/**
 * Get StablecoinPurchase contract instance
 */
export function getStablecoinPurchaseContract(signerOrProvider: ethers.Provider | ethers.Signer) {
  if (!STABLECOIN_PURCHASE_ADDRESS) {
    throw new Error("STABLECOIN_PURCHASE_ADDRESS not configured");
  }
  return new ethers.Contract(STABLECOIN_PURCHASE_ADDRESS, STABLECOIN_PURCHASE_ABI, signerOrProvider);
}

