 "use client";

import { ConnectButton } from "@/components/ConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AddToken } from "@/components/AddToken";
import { CreateOperation } from "@/components/CreateOperation";
import { OperationsList } from "@/components/OperationsList";
import { BalanceDebug } from "@/components/BalanceDebug";
import { useEthereum } from "@/lib/ethereum";

export default function Home() {
  const { isConnected } = useEthereum();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-zinc-200/60 bg-background/80 backdrop-blur dark:border-zinc-800/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Escrow DApp</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectButton />
        </div>
        </div>
      </header>

      <main className="mx-auto flex-1 w-full max-w-7xl flex flex-col gap-8 px-4 py-8">
        {!isConnected ? (
          <section className="rounded-2xl border border-zinc-200/70 bg-background/80 p-6 text-center shadow-sm dark:border-zinc-800/80 space-y-2">
            <h2 className="text-xl font-semibold">Bienvenido</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Bienvenido, conéctese al wallet para empezar a usar la aplicación de Escrow.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-zinc-200/70 bg-background/80 p-6 shadow-sm dark:border-zinc-800/80 space-y-2">
              <h2 className="text-xl font-semibold">Panel de operaciones</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Gestiona los tokens permitidos, crea operaciones de swap y revisa el estado de cada operación.
              </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-8">
                <AddToken />
                <CreateOperation />
              </div>
              <div>
                <OperationsList />
              </div>
              <div>
                <BalanceDebug />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-zinc-200/60 bg-background/80 px-4 py-4 text-xs text-zinc-600 dark:border-zinc-800/80 dark:text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Proyecto educativo: <span className="font-medium">Escrow DApp ERC20</span>
          </p>
          <p className="text-[11px]">
            Creado por <span className="font-semibold">Rolando Strahm</span> para el curso de CodeCrypto.
          </p>
        </div>
      </footer>
    </div>
  );
}
