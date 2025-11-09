"use client";

import { useState, useEffect } from "react";
import { Proposal, VoteType } from "@/lib/types";
import VoteButtons from "./VoteButtons";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";

interface ProposalCardProps {
  proposal: Proposal;
  onVoteSuccess?: () => void;
}

export default function ProposalCard({ proposal, onVoteSuccess }: ProposalCardProps) {
  const { account, provider } = useWeb3();
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || "";

  useEffect(() => {
    if (account && provider && DAO_ADDRESS) {
      loadUserVote();
    }
  }, [account, provider, proposal.id]);

  const loadUserVote = async () => {
    if (!account || !provider || !DAO_ADDRESS) return;

    try {
      const DAO_ABI = [
        "function getUserVote(address user, uint256 proposalId) external view returns (uint8)",
        "function hasVoted(address user, uint256 proposalId) external view returns (bool)",
      ];
      const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
      const [vote, hasVoted] = await Promise.all([
        daoContract.getUserVote(account, proposal.id),
        daoContract.hasVoted(account, proposal.id),
      ]);
      setUserVote(hasVoted ? Number(vote) : null);
      setHasUserVoted(hasVoted);
    } catch (err) {
      console.error("Error loading user vote:", err);
    }
  };

  const getStatus = () => {
    if (proposal.executed) return { text: "Ejecutada", color: "bg-purple-500" };
    const now = Math.floor(Date.now() / 1000);
    if (Number(proposal.deadline) > now) {
      return { text: "Activa", color: "bg-blue-500" };
    }
    if (proposal.votesFor > proposal.votesAgainst) {
      return { text: "Aprobada", color: "bg-green-500" };
    }
    return { text: "Rechazada", color: "bg-red-500" };
  };

  const status = getStatus();
  const deadlineDate = new Date(Number(proposal.deadline) * 1000);
  const isActive = !proposal.executed && Number(proposal.deadline) > Math.floor(Date.now() / 1000);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Propuesta #{proposal.id.toString()}
          </h3>
          <span className={`inline-block px-2 py-1 text-xs text-white rounded ${status.color} mt-2`}>
            {status.text}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {proposal.description && proposal.description.trim().length > 0 && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Descripción</p>
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
              {proposal.description}
            </p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Beneficiario</p>
          <p className="text-sm font-mono text-gray-900 dark:text-white">
            {proposal.recipient}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Monto</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {ethers.formatEther(proposal.amount)} ETH
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Fecha Límite</p>
          <p className="text-sm text-gray-900 dark:text-white">
            {deadlineDate.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {proposal.votesFor.toString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">A FAVOR</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {proposal.votesAgainst.toString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">EN CONTRA</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {proposal.votesAbstention.toString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">ABSTENCIÓN</p>
        </div>
      </div>

      {isActive && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <VoteButtons
            proposalId={Number(proposal.id)}
            currentVote={userVote}
            hasVoted={hasUserVoted}
            onVoteSuccess={() => {
              loadUserVote();
              if (onVoteSuccess) onVoteSuccess();
            }}
          />
        </div>
      )}

      {hasUserVoted && userVote !== null && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Tu voto: {userVote === VoteType.A_FAVOR ? "A FAVOR" : userVote === VoteType.EN_CONTRA ? "EN CONTRA" : "ABSTENCIÓN"}
        </p>
      )}
    </div>
  );
}

