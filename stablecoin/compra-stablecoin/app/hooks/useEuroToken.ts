"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { getEuroTokenContract } from "@/lib/contracts";
import { formatTokenAmount } from "@/lib/utils";

export function useEuroToken() {
  const { signer, provider, account, isConnected } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [formattedBalance, setFormattedBalance] = useState<string>("0.00");
  const [decimals, setDecimals] = useState<number>(6);
  const [symbol, setSymbol] = useState<string>("EURT");
  const [name, setName] = useState<string>("EuroToken");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!provider) return;

    const loadTokenInfo = async () => {
      try {
        const contract = getEuroTokenContract(provider);
        const [decimalsValue, symbolValue, nameValue] = await Promise.all([
          contract.decimals(),
          contract.symbol(),
          contract.name(),
        ]);

        setDecimals(Number(decimalsValue));
        setSymbol(String(symbolValue));
        setName(String(nameValue));
      } catch (err) {
        console.error("Error loading token info:", err);
        setError("Failed to load token information");
      }
    };

    loadTokenInfo();
  }, [provider]);

  useEffect(() => {
    if (!isConnected || !account || !signer) {
      setBalance(null);
      setFormattedBalance("0.00");
      return;
    }

    const loadBalance = async () => {
      setLoading(true);
      setError(null);
      try {
        const contract = getEuroTokenContract(signer);
        const bal = await contract.balanceOf(account);
        setBalance(bal);
        setFormattedBalance(formatTokenAmount(bal, decimals));
      } catch (err) {
        console.error("Error loading balance:", err);
        setError("Failed to load token balance");
        setBalance(null);
        setFormattedBalance("0.00");
      } finally {
        setLoading(false);
      }
    };

    loadBalance();

    const interval = setInterval(loadBalance, 5000);

    return () => clearInterval(interval);
  }, [isConnected, account, signer, decimals, refreshTrigger]);

  const refreshBalance = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    balance,
    formattedBalance,
    decimals,
    symbol,
    name,
    loading,
    error,
    refreshBalance,
  };
}

