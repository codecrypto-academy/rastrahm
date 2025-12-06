"use client";

import { FormEvent, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useEthereum } from "@/lib/ethereum";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/contracts";
import { useRouter } from "next/navigation";

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

export function CreateOperation() {
  const router = useRouter();
  const { provider, account, isConnected } = useEthereum();
  const [amountA, setAmountA] = useState<string>("");
  const [amountB, setAmountB] = useState<string>("");
  const [user2, setUser2] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);

  // Cargar balance de ETH
  useEffect(() => {
    const loadBalance = async () => {
      if (!provider || !account) {
        setEthBalance(null);
        return;
      }

      try {
        const balance = await provider.getBalance(account);
        const formatted = ethers.formatEther(balance);
        setEthBalance(formatted);
      } catch (e) {
        console.error("Error cargando balance:", e);
        setEthBalance(null);
      }
    };

    void loadBalance();
  }, [provider, account]);

  // Verificar conexión al contrato
  useEffect(() => {
    const verifyContract = async () => {
      if (!provider || !ESCROW_ADDRESS) {
        return;
      }

      try {
        // Primero verificar que el provider esté conectado
        const network = await provider.getNetwork();
        console.log("[CreateOperation] Red conectada:", network.chainId);
        
        const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
        await escrow.owner();
        setError(null);
      } catch (e: any) {
        console.error("[CreateOperation] Error verificando contrato Escrow:", e);
        const errorMsg = e?.message || String(e);
        const errorCode = e?.code || e?.error?.code || e?.info?.error?.code;
        
        // Errores de RPC o conexión
        if (
          errorMsg.includes("missing revert data") || 
          errorMsg.includes("CALL_EXCEPTION") ||
          errorMsg.includes("too many errors") ||
          errorMsg.includes("UNKNOWN_ERROR") ||
          errorCode === "UNKNOWN_ERROR"
        ) {
          setError(
            `No se puede conectar al contrato Escrow en ${ESCROW_ADDRESS}. ` +
            `Verifica que Anvil esté corriendo (http://127.0.0.1:8545) y que el contrato esté desplegado. ` +
            `Ejecuta 'bash init.sh' para redesplegar los contratos. ` +
            `Si el problema persiste, reinicia Anvil.`
          );
        } else {
          setError(`Error al conectar con el contrato Escrow: ${errorMsg}`);
        }
      }
    };

    void verifyContract();
  }, [provider]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
    if (!amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0) {
      setError("Las cantidades deben ser mayores a 0.");
      return;
    }
    if (!user2 || !ethers.isAddress(user2)) {
      setError("Ingresa una dirección válida para el segundo usuario (user2).");
      return;
    }
    if (user2.toLowerCase() === account.toLowerCase()) {
      setError("El segundo usuario (user2) debe ser diferente a tu dirección.");
      return;
    }

    try {
      setLoading(true);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);

      // Convertir amountA a wei
      const amountAWei = ethers.parseEther(amountA);
      const amountBWei = ethers.parseEther(amountB);

      // Verificar balance de ETH
      const balance = await provider.getBalance(account);
      if (balance < amountAWei) {
        setError(`Balance ETH insuficiente. Tienes ${ethers.formatEther(balance)} ETH, necesitas ${amountA} ETH.`);
        setLoading(false);
        return;
      }

      setSuccess(`Creando operación: Ofreces ${amountA} ETH, solicitas ${amountB} ETH...`);

      // Crear la operación con ETH nativo (address(0) para ambos tokens)
      const createTx = await escrow.createOperation(
        ETH_ADDRESS, // tokenA = ETH
        ETH_ADDRESS, // tokenB = ETH
        amountAWei,
        amountBWei,
        user2,
        { value: amountAWei } // Enviar ETH nativo
      );
      const receipt = await createTx.wait();

      // Buscar el evento OperationCreated para obtener el operationId
      const operationCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = escrow.interface.parseLog(log);
          return parsed?.name === "OperationCreated";
        } catch {
          return false;
        }
      });

      let operationId = null;
      if (operationCreatedEvent) {
        const parsed = escrow.interface.parseLog(operationCreatedEvent);
        operationId = parsed?.args[0]?.toString();
      }

      setSuccess(
        operationId
          ? `Operación creada exitosamente! ID: ${operationId}`
          : "Operación creada exitosamente!"
      );

      // Resetear el estado de loading
      setLoading(false);

      // Limpiar formulario
      setAmountA("");
      setAmountB("");
      setUser2("");

      // Refrescar la página después de 2 segundos
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (e: any) {
      const code =
        e?.code ??
        e?.error?.code ??
        e?.info?.error?.code;

      // Si el usuario rechazó la transacción, no es un error, solo una cancelación
      if (code === 4001 || e?.reason === "rejected" || e?.code === "ACTION_REJECTED") {
        setError(null);
        setSuccess(null);
        setLoading(false);
        // No mostrar error, solo limpiar el estado
        return;
      }

      // Para otros errores, sí mostrar el mensaje
      console.error("Error al crear operación:", e);
      setError(e?.message ?? "Error desconocido al crear la operación.");
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200/70 bg-background/80 p-6 shadow-sm dark:border-zinc-800/80">
      <div>
        <h2 className="text-base font-semibold">Crear operación de swap</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Crea una nueva operación de intercambio de ETH
        </p>
      </div>

      {!isConnected && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Conecta una wallet para crear una operación.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount A */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Cantidad de ETH que ofreces (Token A)
            <input
              type="number"
              step="any"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="0.0"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-background px-3 py-2 text-xs text-foreground shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700"
              disabled={!isConnected || loading}
            />
          </label>
          {ethBalance !== null && (
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Balance disponible: {ethBalance} ETH
            </p>
          )}
        </div>

        {/* Amount B */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Cantidad de ETH que solicitas (Token B)
            <input
              type="number"
              step="any"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              placeholder="0.0"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-background px-3 py-2 text-xs text-foreground shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700"
              disabled={!isConnected || loading}
            />
          </label>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Esta es la cantidad de ETH que recibirás cuando se complete la operación
          </p>
        </div>

        {/* User2 */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Dirección del segundo usuario (user2)
            <input
              type="text"
              value={user2}
              onChange={(e) => setUser2(e.target.value)}
              placeholder="0x..."
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-background px-3 py-2 text-xs font-mono text-foreground shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700"
              disabled={!isConnected || loading}
            />
          </label>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Esta dirección será la única que podrá completar la operación
          </p>
        </div>

        <button
          type="submit"
          disabled={!isConnected || loading || !amountA || !amountB}
          className="w-full inline-flex items-center justify-center rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-100 dark:hover:text-black"
        >
          {loading ? "Procesando..." : "Crear operación"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">{success}</p>
      )}
    </section>
  );
}
