import ConnectWallet from "@/components/ui/ConnectWallet";
import FundingPanel from "@/components/proposals/FundingPanel";
import CreateProposal from "@/components/proposals/CreateProposal";
import ProposalList from "@/components/proposals/ProposalList";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              DAO Voting
            </h1>
            <ConnectWallet />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Columna izquierda: Panel de Financiación y Crear Propuesta */}
          <div className="lg:col-span-2 space-y-6">
            <FundingPanel />
            <CreateProposal />
          </div>

          {/* Columna derecha: Lista de Propuestas */}
          <div className="lg:col-span-2">
            <ProposalList />
          </div>
        </div>
      </main>
    </div>
  );
}
