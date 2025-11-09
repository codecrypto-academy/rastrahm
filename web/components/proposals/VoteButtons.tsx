"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { useGaslessVote } from "@/hooks/useGaslessVote";
import { VoteType } from "@/lib/types";

interface VoteButtonsProps {
  proposalId: number;
  currentVote: VoteType | null;
  hasVoted: boolean;
  onVoteSuccess?: () => void;
}

export default function VoteButtons({ proposalId, currentVote, hasVoted, onVoteSuccess }: VoteButtonsProps) {
  const { isConnected } = useWeb3();
  const { vote, loading, error } = useGaslessVote();

  const handleVote = async (voteType: VoteType) => {
    if (!isConnected) {
      return;
    }

    try {
      await vote(proposalId, voteType);
      
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (err: any) {
      // El error ya está manejado en el hook
      console.error("Error voting:", err);
    }
  };

  if (!isConnected) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Conecta tu wallet para votar
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleVote(VoteType.A_FAVOR)}
          disabled={loading || (hasVoted && currentVote === VoteType.A_FAVOR)}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            currentVote === VoteType.A_FAVOR
              ? "bg-green-500 text-white cursor-default"
              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          A FAVOR
        </button>
        <button
          onClick={() => handleVote(VoteType.EN_CONTRA)}
          disabled={loading || (hasVoted && currentVote === VoteType.EN_CONTRA)}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            currentVote === VoteType.EN_CONTRA
              ? "bg-red-500 text-white cursor-default"
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          EN CONTRA
        </button>
        <button
          onClick={() => handleVote(VoteType.ABSTENCION)}
          disabled={loading || (hasVoted && currentVote === VoteType.ABSTENCION)}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            currentVote === VoteType.ABSTENCION
              ? "bg-gray-500 text-white cursor-default"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          ABSTENCIÓN
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      {loading && (
        <p className="text-xs text-gray-500">Procesando voto...</p>
      )}
    </div>
  );
}

