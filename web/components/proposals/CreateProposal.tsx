"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import { useGaslessProposal } from "@/hooks/useGaslessProposal";

const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || "";

// ABI simplificado
const DAO_ABI = [
  "function createProposal(address recipient, uint256 amount, uint256 deadline) external",
  "function getUserBalance(address user) external view returns (uint256)",
  "function totalBalance() external view returns (uint256)",
  "function proposalCount() external view returns (uint256)",
];

const formatEthValue = (value: string) => {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) {
    return "0.0000";
  }
  return num.toFixed(4);
};

export default function CreateProposal() {
  const { account, isConnected, provider, signer } = useWeb3();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [walletBalance, setWalletBalance] = useState<string>("0");
  const [totalBalance, setTotalBalance] = useState<string>("0");
  const [showForm, setShowForm] = useState(false);
  const [useGaslessMode, setUseGaslessMode] = useState(true);

  const {
    createProposal: createProposalGasless,
    loading: loadingGasless,
    error: gaslessError,
  } = useGaslessProposal();
  const isSubmitting = useGaslessMode ? loadingGasless : loading;

  const checkCanCreate = useCallback(async () => {
    if (!provider || !account || !DAO_ADDRESS) return;

    try {
      const code = await provider.getCode(DAO_ADDRESS);
      if (code === "0x") {
        setError("El contrato DAO no está desplegado en esta red. Verifica la configuración.");
        setCanCreate(false);
        setShowForm(false);
        return;
      }

      const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
      const [userBal, totalBal, walletBal] = await Promise.all([
        daoContract.getUserBalance(account),
        daoContract.totalBalance(),
        provider.getBalance(account),
      ]);

      const userBalanceFormatted = ethers.formatEther(userBal);
      const totalBalanceFormatted = ethers.formatEther(totalBal);
      const userBalanceNum = Number(userBalanceFormatted);
      const totalBalanceNum = Number(totalBalanceFormatted);

      setUserBalance(formatEthValue(userBalanceFormatted));
      setTotalBalance(formatEthValue(totalBalanceFormatted));
      setWalletBalance(formatEthValue(ethers.formatEther(walletBal)));

      // Verificar si tiene al menos 10% del balance total
      const threshold = totalBalanceNum * 0.1;
      const canCreateProposal = userBalanceNum >= threshold && totalBalanceNum > 0;
      setCanCreate(canCreateProposal);
      if (!canCreateProposal) {
        setShowForm(false);
      }
      setError(null);
    } catch (err) {
      console.error("Error checking create permission:", err);
      setError("No se pudo verificar el balance en el DAO.");
      setCanCreate(false);
      setShowForm(false);
    }
  }, [provider, account]);

  useEffect(() => {
    if (isConnected && provider && account && DAO_ADDRESS) {
      checkCanCreate();
    }
  }, [isConnected, account, provider, checkCanCreate]);

  useEffect(() => {
    const handler = () => {
      checkCanCreate();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dao:balances-updated", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dao:balances-updated", handler);
      }
    };
  }, [checkCanCreate]);

  const handleCreate = async () => {
    if (!signer || !DAO_ADDRESS || !recipient || !amount || !deadline) {
      setError("Por favor completa todos los campos");
      return;
    }

    // Validar dirección
    if (!ethers.isAddress(recipient)) {
      setError("Dirección del beneficiario inválida");
      return;
    }

    // Validar monto
    if (parseFloat(amount) <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length === 0) {
      setError("Describe brevemente la propuesta");
      return;
    }

    // Validar deadline
    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
    if (deadlineTimestamp <= Date.now() / 1000) {
      setError("La fecha límite debe ser en el futuro");
      return;
    }

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
      if (useGaslessMode) {
        await createProposalGasless({
          recipient,
          amountWei,
          deadlineTimestamp,
        });
      } else {
        setLoading(true);
        const tx = await daoContract.createProposal(recipient, amountWei, deadlineTimestamp);
        await tx.wait();
      }

      // Limpiar formulario
      setRecipient("");
      setAmount("");
      setDeadline("");
      setDescription("");
      await checkCanCreate();
      setShowForm(false);

      if (typeof window !== "undefined") {
        try {
          const latestId = await daoContract.proposalCount();
          const metadataRaw = window.localStorage.getItem("dao:proposal-metadata");
          const metadata = metadataRaw ? JSON.parse(metadataRaw) : {};
          metadata[latestId.toString()] = {
            description: trimmedDescription,
            createdAt: new Date().toISOString(),
          };
          window.localStorage.setItem("dao:proposal-metadata", JSON.stringify(metadata));
          window.dispatchEvent(
            new CustomEvent("dao:proposal-created", {
              detail: { proposalId: latestId.toString() },
            })
          );
        } catch (storageError) {
          console.error("Error guardando metadata de propuesta:", storageError);
        }
      }
    } catch (err: any) {
      console.error("Error creating proposal:", err);
      setError(err.message || "Error al crear propuesta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Crear propuesta
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          disabled={!isConnected || !canCreate || isSubmitting}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? "Cerrar formulario" : "Nueva propuesta"}
        </button>
      </div>

      {!isConnected && (
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Conecta tu wallet para crear propuestas.
        </p>
      )}

      {isConnected && !canCreate && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
          Necesitas al menos el 10% del balance total del DAO para crear propuestas.
          <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
            Tu balance en el DAO: {userBalance} ETH · Balance de tu wallet: {walletBalance} ETH · Balance total del DAO: {totalBalance} ETH · Requerido en el DAO:{" "}
            {(parseFloat(totalBalance) * 0.1 || 0).toFixed(4)} ETH
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {useGaslessMode && gaslessError && !error && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {gaslessError}
        </div>
      )}

      {showForm && isConnected && canCreate && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              id="gasless-create-toggle"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={useGaslessMode}
              disabled={loadingGasless || loading}
              onChange={(event) => setUseGaslessMode(event.target.checked)}
            />
            <label htmlFor="gasless-create-toggle" className="select-none cursor-pointer">
              Firmar sin gas (meta-transacción)
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {useGaslessMode
              ? "El relayer cubre el gas usando EIP-2771."
              : "Tu wallet enviará la transacción y pagará el gas."}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dirección del beneficiario
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cantidad de ETH
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción de la propuesta
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica brevemente el propósito de la propuesta..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha límite de votación
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={
              isSubmitting ||
              !recipient ||
              !amount ||
              !deadline ||
              description.trim().length === 0
            }
            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {useGaslessMode
              ? loadingGasless
                ? "Creando sin gas..."
                : "Crear propuesta sin gas"
              : loading
              ? "Creando..."
              : "Crear propuesta"}
          </button>
        </div>
      )}
    </div>
  );
}

