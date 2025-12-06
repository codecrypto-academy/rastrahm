"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useEthereum } from "@/lib/ethereum";
import { ESCROW_ABI, ESCROW_ADDRESS, ERC20_ABI } from "@/lib/contracts";

type TokenBalances = {
  tokenAddress: string;
  symbol: string;
  decimals: number;
  balances: Record<string, string>; // addressLower -> balance formateado
};

type EthBalances = Record<string, string>; // addressLower -> balance formateado

const ADDRESS_ESCROW = ESCROW_ADDRESS || "";
const ADDRESS_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ADDRESS_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const ADDRESS_2 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

const TARGETS = [
  {
    key: "escrow",
    label: "Contrato Escrow",
    address: ADDRESS_ESCROW,
    highlight: true,
  },
  {
    key: "acc0",
    label: "Account #0",
    address: ADDRESS_0,
    highlight: false,
  },
  {
    key: "acc1",
    label: "Account #1",
    address: ADDRESS_1,
    highlight: false,
  },
  {
    key: "acc2",
    label: "Account #2",
    address: ADDRESS_2,
    highlight: false,
  },
];

export function BalanceDebug() {
  const { provider } = useEthereum();
  const [ethBalances, setEthBalances] = useState<EthBalances>({});
  const [tokenBalances, setTokenBalances] = useState<TokenBalances[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalances = useCallback(async () => {
    setError(null);

    // Crear provider de solo lectura si no hay uno de la wallet
    let currentProvider: ethers.Provider = provider as any;
    if (!currentProvider) {
      try {
        currentProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545") as any;
      } catch (e) {
        console.error("[BalanceDebug] No se pudo crear JsonRpcProvider:", e);
        setError("No se pudo conectar al nodo RPC (http://127.0.0.1:8545).");
        return;
      }
    }
    
    if (!currentProvider) {
      setError("No hay provider disponible.");
      return;
    }

    try {
      setLoading(true);

      const activeTargets = TARGETS.filter((t) => t.address);
      const lowercaseAddresses = activeTargets.map((t) => t.address.toLowerCase());

      // 1. Balances de ETH
      const ethBalancesResult: EthBalances = {};
      for (const t of activeTargets) {
        try {
          const balance = await currentProvider.getBalance(t.address);
          ethBalancesResult[t.address.toLowerCase()] = ethers.formatEther(balance);
        } catch (e) {
          console.warn("[BalanceDebug] Error obteniendo balance ETH para", t.address, e);
          ethBalancesResult[t.address.toLowerCase()] = "0.0";
        }
      }

      // 2. Tokens permitidos en el Escrow (puede ser array vacío)
      const tokensResult: TokenBalances[] = [];

      if (ADDRESS_ESCROW) {
        try {
          const escrow = new ethers.Contract(ADDRESS_ESCROW, ESCROW_ABI, currentProvider);
          const allowedTokens: string[] = await escrow.getAllowedTokens();

          for (const tokenAddr of allowedTokens) {
            const addrLower = tokenAddr.toLowerCase();
            try {
              const token = new ethers.Contract(tokenAddr, ERC20_ABI, currentProvider);
              const [symbolRaw, decimalsRaw] = await Promise.all([
                token.symbol().catch(() => "UNK"),
                token.decimals().catch(() => 18),
              ]);
              const symbol = String(symbolRaw);
              const decimals = Number(decimalsRaw);

              const balances: Record<string, string> = {};
              const ETH_DECIMALS = 18;
              for (const a of lowercaseAddresses) {
                try {
                  const balance = await token.balanceOf(a);
                  // Convertir balance del token a ETH equivalente
                  // balance está en unidades del token, convertir a wei y luego a ETH
                  const balanceInWei = balance * BigInt(10 ** (ETH_DECIMALS - decimals));
                  balances[a] = ethers.formatEther(balanceInWei);
                } catch (e) {
                  console.warn("[BalanceDebug] Error balance token para", tokenAddr, a, e);
                  balances[a] = "0.0";
                }
              }

              tokensResult.push({
                tokenAddress: tokenAddr,
                symbol,
                decimals,
                balances,
              });
            } catch (e) {
              console.warn("[BalanceDebug] Error obteniendo info de token", tokenAddr, e);
            }
          }
        } catch (e) {
          console.warn("[BalanceDebug] Error obteniendo tokens permitidos del Escrow:", e);
        }
      }

      setEthBalances(ethBalancesResult);
      setTokenBalances(tokensResult);
    } catch (e: any) {
      console.error("[BalanceDebug] Error general cargando balances:", e);
      setError(e?.message ?? "Error al cargar balances.");
      setEthBalances({});
      setTokenBalances([]);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  const formatEth = (value?: string) => {
    if (!value) return "0.0";
    return Number(value).toFixed(4);
  };

  const getEthBalance = (address: string) =>
    formatEth(ethBalances[address.toLowerCase()]);

  const getTokenBalance = (token: TokenBalances, address: string) => {
    const v = token.balances[address.toLowerCase()];
    if (!v) return "0.0";
    return Number(v).toFixed(4);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200/70 bg-background/80 p-6 shadow-sm dark:border-zinc-800/80">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Debug de balances</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            ETH y tokens para Escrow y cuentas de prueba (Anvil).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadBalances()}
          disabled={loading}
          className="rounded-lg border border-zinc-300 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {loading ? "Cargando..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {!ADDRESS_ESCROW && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Advertencia: no se ha configurado la dirección del contrato Escrow (NEXT_PUBLIC_ESCROW_ADDRESS).
        </p>
      )}

      <div className="space-y-3">
        {TARGETS.map((t) => {
          if (!t.address) return null;
          const isEscrow = t.highlight;
          return (
            <div
              key={t.key}
              className={`rounded-lg border px-3 py-2 text-xs ${
                isEscrow
                  ? "border-sky-300 bg-sky-50/80 dark:border-sky-500/70 dark:bg-sky-900/20"
                  : "border-zinc-200/70 bg-background/80 dark:border-zinc-800/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={isEscrow ? "font-semibold text-sky-700 dark:text-sky-300" : "font-semibold"}>
                  {t.label}
                </span>
                <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400 break-all">
                  {t.address}
                </span>
              </div>
              <div className="mt-1 text-[11px]">
                <p className="text-zinc-600 dark:text-zinc-300">
                  ETH: <span className="font-mono">{getEthBalance(t.address)}</span>
                </p>
                {tokenBalances.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Sin tokens permitidos aún (array vacío).
                  </p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {tokenBalances.map((token) => (
                      <p
                        key={`${t.address}-${token.tokenAddress}`}
                        className="text-[10px] text-zinc-600 dark:text-zinc-300"
                      >
                        {token.symbol}:{" "}
                        <span className="font-mono">
                          {getTokenBalance(token, t.address)} ETH
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


