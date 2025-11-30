// Chain configuration
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

// Contract addresses
export const EURO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURO_TOKEN_ADDRESS || "";
export const STABLECOIN_PURCHASE_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS || "";

// Stripe
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

// API
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Local network (Anvil)
export const LOCAL_NETWORK = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: "Local Anvil",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [],
};

// Minimum purchase amount in cents (€1.00)
export const MIN_PURCHASE_AMOUNT_CENTS = 100;

// Maximum purchase amount in cents (€10000.00)
export const MAX_PURCHASE_AMOUNT_CENTS = 1000000;

// Token decimals (EuroToken has 6 decimals)
export const TOKEN_DECIMALS = 6;

