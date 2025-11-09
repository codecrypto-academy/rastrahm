"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";

const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || "";

// ABI simplificado para fundDAO y getUserBalance
const DAO_ABI = [
  "function fundDAO() external payable",
  "function getUserBalance(address user) external view returns (uint256)",
  "function totalBalance() external view returns (uint256)",
];

const formatEthValue = (value: string) => {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) {
    return "0.0000";
  }
  return num.toFixed(4);
};

export default function FundingPanel() {
  const { account, isConnected, provider, signer } = useWeb3();
  const [amount, setAmount] = useState("");
  const [userBalance, setUserBalance] = useState<string>("0");
  const [walletBalance, setWalletBalance] = useState<string>("0");
  const [totalBalance, setTotalBalance] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && provider && DAO_ADDRESS) {
      loadBalances();
    }
  }, [isConnected, account, provider]);

  const loadBalances = async () => {
    if (!provider || !account || !DAO_ADDRESS) return;

    try {
      const code = await provider.getCode(DAO_ADDRESS);
      if (code === "0x") {
        throw new Error("El contrato DAO no está desplegado en esta red. Verifica la configuración.");
      }

      const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
      
      const [userBal, totalBal, walletBal] = await Promise.all([
        daoContract.getUserBalance(account).catch((err: any) => {
          console.error("Error getting user balance:", err);
          return BigInt(0);
        }),
        daoContract.totalBalance().catch((err: any) => {
          console.error("Error getting total balance:", err);
          return BigInt(0);
        }),
        provider.getBalance(account).catch((err: any) => {
          console.error("Error getting wallet balance:", err);
          return BigInt(0);
        }),
      ]);

      const formattedUser = formatEthValue(ethers.formatEther(userBal));
      const formattedTotal = formatEthValue(ethers.formatEther(totalBal));
      const formattedWallet = formatEthValue(ethers.formatEther(walletBal));

      setUserBalance(formattedUser);
      setTotalBalance(formattedTotal);
      setWalletBalance(formattedWallet);
      setError(null);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dao:balances-updated", {
            detail: {
              userBalance: formattedUser,
              totalBalance: formattedTotal,
              walletBalance: formattedWallet,
            },
          })
        );
      }
    } catch (err: any) {
      console.error("Error loading balances:", err);
      setError("Error al cargar balances");
    }
  };

  const handleFund = async () => {
    if (!signer || !DAO_ADDRESS || !amount) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeProvider = signer.provider ?? provider;
      if (!activeProvider) {
        throw new Error("No se pudo detectar el proveedor de red.");
      }
      const code = await activeProvider.getCode(DAO_ADDRESS);
      if (code === "0x") {
        throw new Error("El contrato DAO no está desplegado en esta red. Verifica la configuración.");
      }

      const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);
      const amountWei = ethers.parseEther(amount);
      
      // Intentar enviar la transacción sin estimar gas primero
      const tx = await daoContract.fundDAO({ 
        value: amountWei,
        gasLimit: 200000 // Gas límite fijo para evitar problemas con estimateGas
      });
      
      await tx.wait();

      setAmount("");
      await loadBalances();
    } catch (err: any) {
      console.error("Error funding DAO:", err);
      // Extraer mensaje de error más específico
      let errorMessage = "Error al depositar fondos";
      if (err.reason) {
        errorMessage = err.reason;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.data?.message) {
        errorMessage = err.data.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para ver y depositar fondos
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Panel de Financiación
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Tu Balance en el DAO
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {userBalance} ETH
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Balance de tu Wallet
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {walletBalance} ETH
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Balance Total del DAO
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {totalBalance} ETH
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Cantidad de ETH a depositar
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleFund}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {loading ? "Depositando..." : "Depositar Fondos"}
        </button>
      </div>
    </div>
  );
}

