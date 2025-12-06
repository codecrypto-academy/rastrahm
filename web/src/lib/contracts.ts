import type { Address } from "viem";

// ABI del contrato Escrow (versión con user2 explícito)
export const ESCROW_ABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addToken",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowedTokens",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cancelOperation",
    inputs: [{ name: "operationId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "completeOperation",
    inputs: [{ name: "operationId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "createOperation",
    inputs: [
      { name: "tokenA", type: "address", internalType: "address" },
      { name: "tokenB", type: "address", internalType: "address" },
      { name: "amountA", type: "uint256", internalType: "uint256" },
      { name: "amountB", type: "uint256", internalType: "uint256" },
      { name: "user2", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getAllOperations",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct Escrow.Operation[]",
        components: [
          { name: "id", type: "uint256", internalType: "uint256" },
          { name: "user1", type: "address", internalType: "address" },
          { name: "user2", type: "address", internalType: "address" },
          { name: "tokenA", type: "address", internalType: "address" },
          { name: "tokenB", type: "address", internalType: "address" },
          { name: "amountA", type: "uint256", internalType: "uint256" },
          { name: "amountB", type: "uint256", internalType: "uint256" },
          { name: "isActive", type: "bool", internalType: "bool" },
          { name: "closedAt", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllowedTokens",
    inputs: [],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOperation",
    inputs: [{ name: "operationId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Escrow.Operation",
        components: [
          { name: "id", type: "uint256", internalType: "uint256" },
          { name: "user1", type: "address", internalType: "address" },
          { name: "user2", type: "address", internalType: "address" },
          { name: "tokenA", type: "address", internalType: "address" },
          { name: "tokenB", type: "address", internalType: "address" },
          { name: "amountA", type: "uint256", internalType: "uint256" },
          { name: "amountB", type: "uint256", internalType: "uint256" },
          { name: "isActive", type: "bool", internalType: "bool" },
          { name: "closedAt", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "operations",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "id", type: "uint256", internalType: "uint256" },
      { name: "user1", type: "address", internalType: "address" },
      { name: "user2", type: "address", internalType: "address" },
      { name: "tokenA", type: "address", internalType: "address" },
      { name: "tokenB", type: "address", internalType: "address" },
      { name: "amountA", type: "uint256", internalType: "uint256" },
      { name: "amountB", type: "uint256", internalType: "uint256" },
      { name: "isActive", type: "bool", internalType: "bool" },
      { name: "closedAt", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    "name": "OperationCancelled",
    "inputs": [
      { "name": "operationId", "type": "uint256", "indexed": true, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    type: "event",
    name: "OperationCompleted",
    inputs: [
      { name: "operationId", type: "uint256", "indexed": true, internalType: "uint256" },
      { name: "user2", type: "address", "indexed": true, internalType: "address" },
      { name: "completedAt", type: "uint256", "indexed": false, internalType: "uint256" }
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OperationCreated",
    inputs: [
      { name: "operationId", type: "uint256", "indexed": true, internalType: "uint256" },
      { name: "user1", type: "address", "indexed": true, internalType: "address" },
      { name: "user2", type: "address", "indexed": true, internalType: "address" },
      { name: "tokenA", type: "address", "indexed": false, internalType: "address" },
      { name: "tokenB", type: "address", "indexed": false, internalType: "address" },
      { name: "amountA", type: "uint256", "indexed": false, internalType: "uint256" },
      { name: "amountB", type: "uint256", "indexed": false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", "indexed": true, internalType: "address" },
      { name: "newOwner", type: "address", "indexed": true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenAdded",
    inputs: [
      { name: "token", type: "address", "indexed": true, internalType: "address" },
    ],
    anonymous: false,
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

export const SIMPLE_SWAP_ABI = [
  {
    type: "function",
    name: "swapETHForToken",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
] as const;

// Dirección del contrato Escrow (se sobrescribe en tiempo de despliegue con .env.local)
export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "") as Address;

// Dirección del contrato SimpleSwap
export const SIMPLE_SWAP_ADDRESS = (process.env.NEXT_PUBLIC_SIMPLE_SWAP_ADDRESS || "") as Address;


