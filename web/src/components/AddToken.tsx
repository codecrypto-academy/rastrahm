"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useEthereum } from "@/lib/ethereum";
import { ESCROW_ABI, ESCROW_ADDRESS, ERC20_ABI } from "@/lib/contracts";

type TokenInfo = {
  address: string;
  symbol: string;
  name: string;
};

const TOKEN_A_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS || "") as string;
const TOKEN_B_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS || "") as string;

export function AddToken() {
  const { provider, account, isConnected } = useEthereum();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [tokenAddress, setTokenAddress] = useState(ESCROW_ADDRESS || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [autoAdded, setAutoAdded] = useState(false);

  // Cargar si el usuario actual es el owner del contrato
  useEffect(() => {
    const checkOwner = async () => {
      if (!provider || !account || !ESCROW_ADDRESS) {
        setIsOwner(null);
        return;
      }

      try {
        const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
        const owner: string = await escrow.owner();
        setIsOwner(owner.toLowerCase() === account.toLowerCase());
      } catch (e) {
        console.error("Error comprobando owner:", e);
        setIsOwner(null);
      }
    };

    void checkOwner();
  }, [provider, account]);

  // Cargar lista de tokens permitidos
  // NOTA: Con la nueva versión que solo usa ETH, este componente ya no es necesario
  // pero lo mantenemos por compatibilidad. La lista estará vacía y no mostrará errores.
  useEffect(() => {
    const loadTokens = async () => {
      if (!provider || !ESCROW_ADDRESS) return;

      try {
        const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
        const addresses: string[] = await escrow.getAllowedTokens();

        const list: TokenInfo[] = [];
        for (const addr of addresses) {
          try {
            const token = new ethers.Contract(addr, ERC20_ABI, provider);
            const [symbol, name] = await Promise.all([
              token.symbol().catch(() => "UNK"),
              token.name().catch(() => "Unknown"),
            ]);
            list.push({ address: addr, symbol, name });
          } catch {
            list.push({ address: addr, symbol: "UNK", name: "Unknown" });
          }
        }

        setTokens(list);
        // No mostrar error si la lista está vacía - ahora es normal con solo ETH
        setError(null);
      } catch (e: any) {
        console.error("Error cargando tokens permitidos:", e);
        setTokens([]);
        // Solo mostrar error si no es un error de conexión esperado
        const errorMsg = e?.message || String(e);
        if (!errorMsg.includes("missing revert data") && !errorMsg.includes("CALL_EXCEPTION")) {
          setError(
            "No se pudieron cargar los tokens permitidos desde el contrato (getAllowedTokens). Se muestra una lista vacía."
          );
        } else {
          // Error de conexión - no mostrar mensaje de tokens, solo silenciar
          setError(null);
        }
      }
    };

    void loadTokens();
  }, [provider, success]);

  // Agregar automáticamente Token A y Token B si están configurados y no están agregados
  useEffect(() => {
    const autoAddTokens = async () => {
      // Solo si el usuario es owner, está conectado, y tenemos los tokens configurados
      if (!isOwner || !isConnected || !provider || !account || !ESCROW_ADDRESS || loading || autoAdded) return;
      if (!TOKEN_A_ADDRESS && !TOKEN_B_ADDRESS) return;

      try {
        const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
        const addresses: string[] = await escrow.getAllowedTokens();
        const tokenAddresses = addresses.map((a) => a.toLowerCase());

        let needsUpdate = false;

        // Agregar Token A si no está agregado
        if (TOKEN_A_ADDRESS && !tokenAddresses.includes(TOKEN_A_ADDRESS.toLowerCase())) {
          console.log("[AddToken] Agregando automáticamente Token A:", TOKEN_A_ADDRESS);
          const signer = await provider.getSigner();
          const escrowWithSigner = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
          const tx = await escrowWithSigner.addToken(TOKEN_A_ADDRESS);
          await tx.wait();
          setSuccess(`Token A agregado automáticamente: ${TOKEN_A_ADDRESS}`);
          needsUpdate = true;
        }

        // Agregar Token B si no está agregado
        if (TOKEN_B_ADDRESS && !tokenAddresses.includes(TOKEN_B_ADDRESS.toLowerCase())) {
          console.log("[AddToken] Agregando automáticamente Token B:", TOKEN_B_ADDRESS);
          const signer = await provider.getSigner();
          const escrowWithSigner = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
          const tx = await escrowWithSigner.addToken(TOKEN_B_ADDRESS);
          await tx.wait();
          setSuccess(`Token B agregado automáticamente: ${TOKEN_B_ADDRESS}`);
          needsUpdate = true;
        }

        if (needsUpdate) {
          setAutoAdded(true);
          // Recargar la lista de tokens
          const updatedAddresses: string[] = await escrow.getAllowedTokens();
          const list: TokenInfo[] = [];
          for (const addr of updatedAddresses) {
            try {
              const token = new ethers.Contract(addr, ERC20_ABI, provider);
              const [symbol, name] = await Promise.all([
                token.symbol().catch(() => "UNK"),
                token.name().catch(() => "Unknown"),
              ]);
              list.push({ address: addr, symbol, name });
            } catch {
              list.push({ address: addr, symbol: "UNK", name: "Unknown" });
            }
          }
          setTokens(list);
        } else {
          setAutoAdded(true);
        }
      } catch (e: any) {
        console.error("Error al agregar tokens automáticamente:", e);
        const code =
          e?.code ??
          e?.error?.code ??
          e?.info?.error?.code;

        if (code === 4001) {
          setError("Transacción rechazada por el usuario en MetaMask al agregar los tokens desplegados.");
        } else {
          setError(e?.message ?? "Error al agregar tokens automáticamente.");
        }
        setAutoAdded(true);
      }
    };

    // Solo ejecutar cuando tengamos la lista de tokens cargada y no hayamos intentado agregar automáticamente
    if (tokens.length >= 0 && isOwner === true && !autoAdded) {
      void autoAddTokens();
    }
  }, [isOwner, isConnected, provider, account, tokens.length, TOKEN_A_ADDRESS, TOKEN_B_ADDRESS, autoAdded, loading]);

  const addToken = async (address: string) => {
    setError(null);
    setSuccess(null);

    if (!provider || !account) {
      setError("Conecta una wallet primero.");
      return;
    }
    if (!ESCROW_ADDRESS) {
      setError("No se ha configurado la dirección del contrato Escrow.");
      return;
    }
    if (!ethers.isAddress(address)) {
      setError("Dirección de token inválida.");
      return;
    }
    if (isOwner === false) {
      setError("Solo el owner del contrato puede agregar tokens.");
      return;
    }

    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);

      const tx = await escrow.addToken(address);
      await tx.wait();

      setSuccess(`Token agregado correctamente: ${address}`);
    } catch (e: any) {
      console.error("Error al agregar token:", e);
      const code =
        e?.code ??
        e?.error?.code ??
        e?.info?.error?.code;

      if (code === 4001) {
        setError("Transacción rechazada por el usuario en MetaMask al agregar el token.");
      } else {
        setError(e?.message ?? "Error desconocido al agregar el token.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Verificar si Token A y Token B ya están agregados
  const tokenAddresses = tokens.map((t) => t.address.toLowerCase());
  const isTokenAAdded = TOKEN_A_ADDRESS && tokenAddresses.includes(TOKEN_A_ADDRESS.toLowerCase());
  const isTokenBAdded = TOKEN_B_ADDRESS && tokenAddresses.includes(TOKEN_B_ADDRESS.toLowerCase());

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200/70 bg-background/80 p-6 shadow-sm dark:border-zinc-800/80">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Tokens permitidos</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Escrow:{" "}
            <span className="font-mono break-all text-[11px]">
              {ESCROW_ADDRESS || "N/D (configura NEXT_PUBLIC_ESCROW_ADDRESS)"}
            </span>
          </p>
        </div>
        {isOwner === true && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            Owner
          </span>
        )}
      </div>

      {!isConnected && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Conecta una wallet para gestionar los tokens permitidos.
        </p>
      )}

      {isConnected && isOwner === false && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Solo el owner del contrato puede agregar nuevos tokens.
        </p>
      )}

      {/* Botones rápidos para Token A y Token B */}
      {(TOKEN_A_ADDRESS || TOKEN_B_ADDRESS) && isOwner === true && (
        <div className="space-y-2 rounded-lg border border-zinc-200/70 bg-zinc-50/50 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/20">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Tokens desplegados
          </p>
          <div className="flex flex-wrap gap-2">
            {TOKEN_A_ADDRESS && (
              <button
                type="button"
                onClick={() => addToken(TOKEN_A_ADDRESS)}
                disabled={isTokenAAdded || loading || !isConnected}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {isTokenAAdded ? (
                  <>
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    Token A (agregado)
                  </>
                ) : (
                  <>+ Token A</>
                )}
              </button>
            )}
            {TOKEN_B_ADDRESS && (
              <button
                type="button"
                onClick={() => addToken(TOKEN_B_ADDRESS)}
                disabled={isTokenBAdded || loading || !isConnected}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {isTokenBAdded ? (
                  <>
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    Token B (agregado)
                  </>
                ) : (
                  <>+ Token B</>
                )}
              </button>
            )}
          </div>
          {(TOKEN_A_ADDRESS || TOKEN_B_ADDRESS) && (
            <div className="space-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              {TOKEN_A_ADDRESS && (
                <p className="font-mono break-all">
                  Token A: <span className="text-zinc-600 dark:text-zinc-300">{TOKEN_A_ADDRESS}</span>
                </p>
              )}
              {TOKEN_B_ADDRESS && (
                <p className="font-mono break-all">
                  Token B: <span className="text-zinc-600 dark:text-zinc-300">{TOKEN_B_ADDRESS}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}


      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {success}
        </p>
      )}

      <div className="pt-2">
        <h3 className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Lista de tokens permitidos
        </h3>
        {tokens.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No hay tokens registrados aún.</p>
        ) : (
          <ul className="space-y-1">
            {tokens.map((token) => (
              <li
                key={token.address}
                className="flex items-center justify-between rounded-md border border-zinc-200/70 bg-background/80 px-3 py-1.5 text-xs dark:border-zinc-800/80"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {token.symbol}{" "}
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {token.name}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 break-all">
                    {token.address}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}


