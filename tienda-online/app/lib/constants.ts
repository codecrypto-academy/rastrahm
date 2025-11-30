// Chain configuration
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

// Contract addresses
export const ECOMMERCE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_ECOMMERCE_ADDRESS || "";

// Stripe
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

// API
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003/api";

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

