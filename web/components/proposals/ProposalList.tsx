"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import { Proposal } from "@/lib/types";
import ProposalCard from "./ProposalCard";

const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || "";

// ABI simplificado
const DAO_ABI = [
  "function proposalCount() external view returns (uint256)",
  "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address recipient, uint256 amount, uint256 deadline, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstention, bool executed, uint256 executionTime, uint256 creationTime))",
];

export default function ProposalList() {
  const { provider } = useWeb3();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    if (!provider || !DAO_ADDRESS) return;

    setLoading(true);
    setError(null);

    try {
      const code = await provider.getCode(DAO_ADDRESS);
      if (code === "0x") {
        throw new Error("El contrato DAO no está desplegado en esta red. Verifica la configuración.");
      }

      const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
      const count = await daoContract.proposalCount();
      const proposalCount = Number(count);

      if (proposalCount === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      // Cargar todas las propuestas
      const proposalPromises = [];
      for (let i = 1; i <= proposalCount; i++) {
        proposalPromises.push(daoContract.getProposal(i));
      }

      const proposalData = await Promise.all(proposalPromises);
      
      let metadata: Record<string, { description?: string }> = {};
      if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem("dao:proposal-metadata");
          metadata = stored ? JSON.parse(stored) : {};
        } catch (storageError) {
          console.warn("No se pudo leer metadata de propuestas:", storageError);
        }
      }

      const formattedProposals: Proposal[] = proposalData.map((p: any) => {
        const meta = metadata[p.id?.toString() ?? ""] ?? {};
        return {
          id: p.id,
          recipient: p.recipient,
          amount: p.amount,
          deadline: p.deadline,
          votesFor: p.votesFor,
          votesAgainst: p.votesAgainst,
          votesAbstention: p.votesAbstention,
          executed: p.executed,
          executionTime: p.executionTime,
          creationTime: p.creationTime,
          description: meta.description,
        };
      });

      // Ordenar por ID descendente (más recientes primero)
      formattedProposals.sort((a, b) => {
        if (a.id > b.id) return -1;
        if (a.id < b.id) return 1;
        return 0;
      });

      setProposals(formattedProposals);
    } catch (err: any) {
      console.error("Error loading proposals:", err);
      setError(err.message || "Error al cargar propuestas");
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (provider && DAO_ADDRESS) {
      loadProposals();
    }
  }, [provider, loadProposals]);

  useEffect(() => {
    const handler = () => {
      loadProposals();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dao:proposal-created", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dao:proposal-created", handler);
      }
    };
  }, [loadProposals]);

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-400">Cargando propuestas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={loadProposals}
          className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Propuestas
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          No hay propuestas aún. Crea la primera propuesta para comenzar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Propuestas ({proposals.length})
        </h2>
        <button
          onClick={loadProposals}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
        >
          Actualizar
        </button>
      </div>
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id.toString()}
          proposal={proposal}
          onVoteSuccess={loadProposals}
        />
      ))}
    </div>
  );
}

