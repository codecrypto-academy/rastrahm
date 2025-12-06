"use client";

import { useEffect, useState } from "react";
import { useEthereum } from "@/lib/ethereum";

type EIP6963ProviderDetail = {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
};

type DiscoveredWallet = {
  rdns: string;
  name: string;
  icon?: string;
  provider: any;
};

function shortenAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const { account, isConnected, connect, disconnect } = useEthereum();
  const [mounted, setMounted] = useState(false);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [selectedRdns, setSelectedRdns] = useState<string | null>(null);

  // Evitar errores de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // Descubrir wallets usando EIP-6963 (protocolo moderno multi-wallet)
  // Solo descubrir una vez al montar, no cuando cambia la cuenta
  useEffect(() => {
    if (typeof window === "undefined" || isConnected) return; // No descubrir si ya está conectado

    let isDiscovering = true;

    const onAnnounce = (event: Event) => {
      // Solo procesar si todavía estamos descubriendo
      if (!isDiscovering) return;

      const e = event as CustomEvent<EIP6963ProviderDetail>;
      const { info, provider } = e.detail || {};
      if (!info || !provider) return;

      setWallets((prev) => {
        if (prev.some((w) => w.rdns === info.rdns)) return prev;
        return [...prev, { rdns: info.rdns, name: info.name, icon: info.icon, provider }];
      });
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce as any);
    // Solo solicitar providers una vez al montar
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      isDiscovering = false;
      window.removeEventListener("eip6963:announceProvider", onAnnounce as any);
    };
  }, [isConnected]); // Solo ejecutar cuando cambia el estado de conexión

  const handleConnect = async () => {
    // Si el usuario seleccionó una wallet específica, la fijamos como window.ethereum
    if (typeof window !== "undefined" && selectedRdns) {
      const wallet = wallets.find((w) => w.rdns === selectedRdns);
      if (wallet) {
        // Protocolo EIP-6963 no obliga a usar window.ethereum,
        // pero ethers.BrowserProvider lo espera; usamos este fallback controlado.
        (window as any).ethereum = wallet.provider;
      }
    }

    await connect();
  };

  if (!mounted) {
    // Mientras se monta, evitamos dibujar algo que pueda causar mismatch
    return (
      <button
        type="button"
        className="h-10 rounded-full border border-zinc-300 bg-zinc-100 px-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        disabled
      >
        Loading...
      </button>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        {wallets.length > 0 && (
          <select
            value={selectedRdns ?? ""}
            onChange={(e) => setSelectedRdns(e.target.value || null)}
            className="h-10 rounded-full border border-zinc-300 bg-background px-3 text-sm dark:border-zinc-700"
          >
            <option value="">Selecciona wallet</option>
            {wallets.map((wallet) => (
              <option key={wallet.rdns} value={wallet.rdns}>
                {wallet.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={handleConnect}
          className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background hover:bg-zinc-900 dark:hover:bg-zinc-100 dark:hover:text-black"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-zinc-300 bg-background px-3 py-1 text-xs font-mono text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
        {shortenAddress(account ?? "")}
      </span>
      <button
        type="button"
        onClick={disconnect}
        className="h-8 rounded-full border border-zinc-300 px-3 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Disconnect
      </button>
    </div>
  );
}


