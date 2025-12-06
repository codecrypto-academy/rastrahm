"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useEthereum } from "@/lib/ethereum";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/contracts";
import { useRouter } from "next/navigation";

type Operation = {
  id: bigint;
  user1: string;
  user2: string;
  tokenA: string;
  tokenB: string;
  amountA: bigint;
  amountB: bigint;
  isActive: boolean;
  closedAt: bigint;
};

type OperationWithDetails = Operation & {
  amountAFormatted?: string;
  amountBFormatted?: string;
};

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

export function OperationsList() {
  const router = useRouter();
  const { provider, account, isConnected } = useEthereum();
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<bigint | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Detectar modo oscuro
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // Cargar todas las operaciones
  const loadOperations = async () => {
    if (!ESCROW_ADDRESS) {
      console.warn("[OperationsList] ESCROW_ADDRESS no configurado");
      setOperations([]);
      return;
    }

    // Intentar crear provider si no existe
    let currentProvider = provider;
    if (!currentProvider) {
      try {
        currentProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      } catch (e) {
        console.warn("[OperationsList] No se pudo crear provider:", e);
        setOperations([]);
        return;
      }
    }

    try {
      setLoading(true);
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, currentProvider);
      const opsRaw: any[] = await escrow.getAllOperations();

      console.log("[OperationsList] Operaciones obtenidas:", opsRaw.length);

      // Transformar arrays/tuplas a objetos Operation
      const ops: Operation[] = opsRaw.map((opRaw) => {
        // Si ya es un objeto con propiedades, usarlo directamente
        if (opRaw && typeof opRaw === 'object' && 'id' in opRaw && opRaw.id !== undefined) {
          return opRaw as Operation;
        }
        // Si es un array/tupla, convertir a objeto
        const op: Operation = {
          id: (opRaw as any)[0] ?? (opRaw as any).id,
          user1: (opRaw as any)[1] ?? (opRaw as any).user1,
          user2: (opRaw as any)[2] ?? (opRaw as any).user2,
          tokenA: (opRaw as any)[3] ?? (opRaw as any).tokenA,
          tokenB: (opRaw as any)[4] ?? (opRaw as any).tokenB,
          amountA: (opRaw as any)[5] ?? (opRaw as any).amountA,
          amountB: (opRaw as any)[6] ?? (opRaw as any).amountB,
          isActive: (opRaw as any)[7] !== undefined ? (opRaw as any)[7] : ((opRaw as any).isActive ?? true),
          closedAt: (opRaw as any)[8] !== undefined ? (opRaw as any)[8] : ((opRaw as any).closedAt ?? 0n),
        };
        return op;
      });

      // Filtrar y validar operaciones
      const validOps = ops.filter(
        (op) =>
          op &&
          op.id !== undefined &&
          op.id !== null &&
          op.user1 &&
          op.user2 &&
          op.tokenA !== undefined &&
          op.tokenA !== null &&
          op.tokenB &&
          op.amountA !== undefined &&
          op.amountB !== undefined
      );

      // Enriquecer operaciones con formato ETH
      const opsWithDetails: OperationWithDetails[] = validOps.map((op) => {
        // Ambos tokens son ETH, convertir directamente de wei a ETH
        const amountAFormatted = ethers.formatEther(op.amountA);
        const amountBFormatted = ethers.formatEther(op.amountB);

        return {
          ...op,
          amountAFormatted,
          amountBFormatted,
        } as OperationWithDetails;
      });

      console.log("[OperationsList] Operaciones con detalles:", opsWithDetails);
      setOperations(opsWithDetails);
      setError(null);
    } catch (e: any) {
      console.error("[OperationsList] Error cargando operaciones:", e);
      setError(e?.message || "Error al cargar las operaciones");
      setOperations([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar operaciones inicialmente y cada 5 segundos
  useEffect(() => {
    if (!ESCROW_ADDRESS) return;

    loadOperations();
    const interval = setInterval(() => {
      loadOperations();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleCancel = async (operationId: bigint) => {
    if (!provider || !account || !ESCROW_ADDRESS) {
      setError("Conecta una wallet primero.");
      return;
    }

    try {
      setProcessingId(operationId);
      setError(null);
      setSuccess(null);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);

      // Obtener información de la operación antes de cancelar
      const operation = await escrow.getOperation(operationId);
      const operationDetails: OperationWithDetails = {
        id: operation.id,
        user1: operation.user1,
        user2: operation.user2,
        tokenA: operation.tokenA,
        tokenB: operation.tokenB,
        amountA: operation.amountA,
        amountB: operation.amountB,
        isActive: operation.isActive,
        closedAt: operation.closedAt,
        amountAFormatted: ethers.formatEther(operation.amountA),
        amountBFormatted: ethers.formatEther(operation.amountB),
      };

      // Verificar que el tokenA sea ETH
      if (operationDetails.tokenA.toLowerCase() !== ETH_ADDRESS.toLowerCase()) {
        setError("Esta operación no es de ETH. Solo se permiten operaciones de ETH.");
        setProcessingId(null);
        return;
      }

      // Verificar balances antes de cancelar
      const user1BalanceBefore = await provider.getBalance(operationDetails.user1);
      const escrowBalanceBefore = await provider.getBalance(ESCROW_ADDRESS);

      console.log("[OperationsList] Balances ANTES de cancelar:", {
        user1: operationDetails.user1,
        user1ETH: ethers.formatEther(user1BalanceBefore),
        escrowETH: ethers.formatEther(escrowBalanceBefore),
        amountToReturn: operationDetails.amountAFormatted,
      });

      setSuccess("Cancelando operación...");
      // cancelOperation no es payable, no necesita opciones de valor
      console.log("[OperationsList] Llamando cancelOperation con operationId:", operationId.toString());
      console.log("[OperationsList] Función cancelOperation, no debería enviar ETH");
      const tx = await escrow.cancelOperation(operationId);
      console.log("[OperationsList] Transacción de cancelación enviada:", tx.hash);
      const receipt = await tx.wait();

      console.log("[OperationsList] Transacción de cancelación completada:", {
        transactionHash: receipt.hash,
        operationId: operationId.toString(),
        from: account,
        user1: operationDetails.user1,
        amountA: operationDetails.amountA.toString(),
      });

      // Verificar balances después de cancelar
      const user1BalanceAfter = await provider.getBalance(operationDetails.user1);
      const escrowBalanceAfter = await provider.getBalance(ESCROW_ADDRESS);

      const user1Change = user1BalanceAfter - user1BalanceBefore;
      const escrowChange = escrowBalanceAfter - escrowBalanceBefore;

      console.log("=".repeat(80));
      console.log("[OperationsList] 📊 RESUMEN DE CANCELACIÓN:");
      console.log("=".repeat(80));
      console.log(`Operación ID: ${operationId.toString()}`);
      console.log(`Usuario 1 (creador): ${operationDetails.user1}`);
      console.log("");
      console.log("📥 TRANSFERENCIA ESPERADA:");
      console.log(`  - Usuario 1 debería RECIBIR: ${operationDetails.amountAFormatted} ETH (reembolso)`);
      console.log("");
      console.log("📊 BALANCES ANTES:");
      console.log(`  - Usuario 1 ETH: ${ethers.formatEther(user1BalanceBefore)} ETH`);
      console.log(`  - Contrato Escrow ETH: ${ethers.formatEther(escrowBalanceBefore)} ETH`);
      console.log("");
      console.log("📊 BALANCES DESPUÉS:");
      console.log(`  - Usuario 1 ETH: ${ethers.formatEther(user1BalanceAfter)} ETH`);
      console.log(`  - Contrato Escrow ETH: ${ethers.formatEther(escrowBalanceAfter)} ETH`);
      console.log("");
      console.log("💰 CAMBIOS REALES:");
      console.log(`  - Usuario 1 ETH: ${user1Change >= 0n ? "+" : ""}${ethers.formatEther(user1Change)} ETH`);
      console.log(`  - Contrato Escrow ETH: ${escrowChange >= 0n ? "+" : ""}${ethers.formatEther(escrowChange)} ETH`);
      console.log("");
      console.log("✅ VERIFICACIÓN:");
      const user1Correct = user1Change >= operationDetails.amountA - BigInt(10 ** 15); // Permitir diferencia de hasta 0.001 ETH por gas
      const escrowCorrect = escrowChange <= -operationDetails.amountA + BigInt(10 ** 15); // El contrato debería haber devuelto el ETH
      console.log(`  - Usuario 1 recibió el reembolso correctamente: ${user1Correct ? "✅ SÍ" : "❌ NO"}`);
      console.log(`  - Contrato devolvió el ETH correctamente: ${escrowCorrect ? "✅ SÍ" : "❌ NO"}`);
      console.log("=".repeat(80));

      if (user1Correct && escrowCorrect) {
        const successMsg = 
          `✅ Operación cancelada exitosamente!\n\n` +
          `📥 ${operationDetails.user1.slice(0, 10)}... (user1) recibió: ${operationDetails.amountAFormatted} ETH (reembolso)`;
        setSuccess(successMsg);
      } else {
        console.warn("[OperationsList] ⚠️ Cambios no coinciden exactamente (puede ser por gas fees):", {
          user1Change: user1Change.toString(),
          expectedUser1Change: operationDetails.amountA.toString(),
          escrowChange: escrowChange.toString(),
          expectedEscrowChange: (-operationDetails.amountA).toString(),
        });
        setSuccess("Operación cancelada. Verifica los balances (puede haber diferencias por gas fees).");
      }

      // Recargar operaciones
      await loadOperations();
      router.refresh();
    } catch (e: any) {
      const code =
        e?.code ??
        e?.error?.code ??
        e?.info?.error?.code;

      // Si el usuario rechazó la transacción, no es un error, solo una cancelación
      if (code === 4001 || e?.reason === "rejected" || e?.code === "ACTION_REJECTED") {
        setError(null);
        setSuccess(null);
        setProcessingId(null);
        // No mostrar error, solo limpiar el estado
        return;
      }

      // Para otros errores, sí mostrar el mensaje
      console.error("Error al cancelar operación:", e);
      setError(e?.message ?? "Error al cancelar la operación.");
      setProcessingId(null);
    }
  };

  const handleComplete = async (operation: OperationWithDetails) => {
    if (!provider || !account || !ESCROW_ADDRESS) {
      setError("Conecta una wallet primero.");
      return;
    }

    try {
      setProcessingId(operation.id);
      setError(null);
      setSuccess(null);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);

      // Verificar que ambos tokens sean ETH
      if (operation.tokenA.toLowerCase() !== ETH_ADDRESS.toLowerCase() || 
          operation.tokenB.toLowerCase() !== ETH_ADDRESS.toLowerCase()) {
        setError("Esta operación no es de ETH. Solo se permiten operaciones de ETH.");
        setProcessingId(null);
        return;
      }

      // Verificar balance de ETH
      const ethBalance = await provider.getBalance(account);
      if (ethBalance < operation.amountB) {
        setError(
          `Balance ETH insuficiente. Tienes ${ethers.formatEther(ethBalance)} ETH, ` +
          `necesitas ${ethers.formatEther(operation.amountB)} ETH.`
        );
        setProcessingId(null);
        return;
      }

      // Verificar que el contrato tiene suficiente balance de ETH antes de completar
      const escrowBalance = await provider.getBalance(ESCROW_ADDRESS);
      if (escrowBalance < operation.amountA) {
        setError(
          `Error: El contrato no tiene suficiente balance de ETH. ` +
          `Tiene ${ethers.formatEther(escrowBalance)} ETH, ` +
          `necesita ${ethers.formatEther(operation.amountA)} ETH.`
        );
        setProcessingId(null);
        return;
      }

      // Verificar balances antes de completar
      const user1BalanceBefore = await provider.getBalance(operation.user1);
      const user2BalanceBefore = await provider.getBalance(operation.user2);

      console.log("[OperationsList] Balances ANTES de completar:", {
        user1: operation.user1,
        user2: operation.user2,
        user1ETH: ethers.formatEther(user1BalanceBefore),
        user2ETH: ethers.formatEther(user2BalanceBefore),
      });

      // Completar la operación (user2 envía ETH, recibe ETH del contrato)
      setSuccess("Completando operación...");
      const tx = await escrow.completeOperation(operation.id, { value: operation.amountB });
      const receipt = await tx.wait();

      console.log("[OperationsList] Transacción completada:", {
        transactionHash: receipt.hash,
        operationId: operation.id.toString(),
        from: account,
        user1: operation.user1,
        user2: operation.user2,
        amountA: operation.amountA.toString(),
        amountB: operation.amountB.toString(),
      });

      // Verificar balances después de completar
      const user1BalanceAfter = await provider.getBalance(operation.user1);
      const user2BalanceAfter = await provider.getBalance(operation.user2);

      const user1Change = user1BalanceAfter - user1BalanceBefore;
      const user2Change = user2BalanceAfter - user2BalanceBefore;

      console.log("=".repeat(80));
      console.log("[OperationsList] 📊 RESUMEN DE TRANSFERENCIAS:");
      console.log("=".repeat(80));
      console.log(`Operación ID: ${operation.id.toString()}`);
      console.log(`Usuario 1 (creador): ${operation.user1}`);
      console.log(`Usuario 2 (completador): ${operation.user2}`);
      console.log("");
      console.log("📥 TRANSFERENCIAS ESPERADAS:");
      console.log(`  - Usuario 1 debería RECIBIR: ${ethers.formatEther(operation.amountB)} ETH`);
      console.log(`  - Usuario 2 debería RECIBIR: ${ethers.formatEther(operation.amountA)} ETH`);
      console.log("");
      console.log("📊 BALANCES ANTES:");
      console.log(`  - Usuario 1 ETH: ${ethers.formatEther(user1BalanceBefore)} ETH`);
      console.log(`  - Usuario 2 ETH: ${ethers.formatEther(user2BalanceBefore)} ETH`);
      console.log("");
      console.log("📊 BALANCES DESPUÉS:");
      console.log(`  - Usuario 1 ETH: ${ethers.formatEther(user1BalanceAfter)} ETH`);
      console.log(`  - Usuario 2 ETH: ${ethers.formatEther(user2BalanceAfter)} ETH`);
      console.log("");
      console.log("💰 CAMBIOS REALES:");
      console.log(`  - Usuario 1 ETH: ${user1Change >= 0n ? "+" : ""}${ethers.formatEther(user1Change)} ETH`);
      console.log(`  - Usuario 2 ETH: ${user2Change >= 0n ? "+" : ""}${ethers.formatEther(user2Change)} ETH`);
      console.log("=".repeat(80));

      // Verificar que los cambios sean correctos (considerando gas fees)
      const expectedUser1Change = operation.amountB;
      const expectedUser2Change = operation.amountA - operation.amountB; // Recibe amountA, pero envió amountB

      // Los cambios pueden no ser exactos debido a gas fees, así que verificamos aproximadamente
      const user1Correct = user1Change >= expectedUser1Change - BigInt(10 ** 15); // Permitir diferencia de hasta 0.001 ETH por gas
      const user2Correct = user2Change >= expectedUser2Change - BigInt(10 ** 15);

      if (user1Correct && user2Correct) {
        const successMsg = 
          `✅ Operación completada exitosamente!\n\n` +
          `📥 ${operation.user1.slice(0, 10)}... (user1) recibió: ${ethers.formatEther(operation.amountB)} ETH\n` +
          `📥 ${operation.user2.slice(0, 10)}... (user2) recibió: ${ethers.formatEther(operation.amountA)} ETH`;
        setSuccess(successMsg);
      } else {
        console.warn("[OperationsList] ⚠️ Cambios no coinciden exactamente (puede ser por gas fees):", {
          user1Change: user1Change.toString(),
          expectedUser1Change: expectedUser1Change.toString(),
          user2Change: user2Change.toString(),
          expectedUser2Change: expectedUser2Change.toString(),
        });
        setSuccess("Operación completada. Verifica los balances (puede haber diferencias por gas fees).");
      }

      // Recargar operaciones
      await loadOperations();
      router.refresh();
    } catch (e: any) {
      const code =
        e?.code ??
        e?.error?.code ??
        e?.info?.error?.code;

      // Si el usuario rechazó la transacción, no es un error, solo una cancelación
      if (code === 4001 || e?.reason === "rejected" || e?.code === "ACTION_REJECTED") {
        setError(null);
        setSuccess(null);
        setProcessingId(null);
        // No mostrar error, solo limpiar el estado
        return;
      }

      // Para otros errores, sí mostrar el mensaje
      console.error("Error al completar operación:", e);
      setError(e?.message ?? "Error al completar la operación.");
      setProcessingId(null);
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200/70 bg-background/80 p-6 shadow-sm dark:border-zinc-800/80">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Operaciones de swap</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Lista de todas las operaciones activas y cerradas (solo ETH)
          </p>
        </div>
        <button
          onClick={() => loadOperations()}
          disabled={loading || !ESCROW_ADDRESS}
          className="rounded-lg border border-zinc-300 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-pre-line">{success}</p>
      )}

      {!ESCROW_ADDRESS && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Error: No se ha configurado la dirección del contrato Escrow (NEXT_PUBLIC_ESCROW_ADDRESS).
        </p>
      )}

      {ESCROW_ADDRESS && operations.length === 0 && !loading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No hay operaciones registradas aún. Crea una operación para empezar.
        </p>
      )}

      {loading && operations.length === 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Cargando operaciones...
        </p>
      )}

      {operations.length > 0 && (
        <div className="space-y-3" data-testid="operations-list">
          {operations
            .filter((op) => {
              const opId = op.id !== undefined ? op.id : (op[0] !== undefined ? op[0] : null);
              const hasId = opId !== undefined && opId !== null;
              if (!hasId) {
                console.warn("[OperationsList] Operación sin ID:", op);
              }
              return hasId;
            })
            .map((op) => {
              const normalizedOp: OperationWithDetails = (op.id !== undefined && op.id !== null)
                ? op
                : {
                    id: (op as any)[0] ?? op.id,
                    user1: (op as any)[1] ?? op.user1,
                    user2: (op as any)[2] ?? op.user2,
                    tokenA: (op as any)[3] ?? op.tokenA,
                    tokenB: (op as any)[4] ?? op.tokenB,
                    amountA: (op as any)[5] ?? op.amountA,
                    amountB: (op as any)[6] ?? op.amountB,
                    isActive: (op as any)[7] !== undefined ? (op as any)[7] : op.isActive,
                    closedAt: (op as any)[8] !== undefined ? (op as any)[8] : op.closedAt,
                    amountAFormatted: op.amountAFormatted,
                    amountBFormatted: op.amountBFormatted,
                  } as OperationWithDetails;
              
              const opFinal = normalizedOp;
              const accountLower = account?.toLowerCase() || "";
              const user1Lower = opFinal.user1?.toLowerCase() || "";
              const user2Lower = opFinal.user2?.toLowerCase() || "";
              const isCreator = accountLower === user1Lower;
              const isUser2 = accountLower === user2Lower;
              const canCancel = isCreator && opFinal.isActive;
              const canComplete = isUser2 && opFinal.isActive && !isCreator;
              const opIdBigInt = typeof opFinal.id === "bigint" ? opFinal.id : BigInt(opFinal.id || 0);
              const processingIdBigInt = processingId !== null ? (typeof processingId === "bigint" ? processingId : BigInt(processingId)) : null;
              const isProcessing = processingIdBigInt !== null && processingIdBigInt === opIdBigInt;
              const operationId = opIdBigInt.toString();

              return (
                <div
                  key={operationId}
                  className="rounded-lg border border-zinc-200/70 bg-background/80 p-4 dark:border-zinc-800/80"
                >
                  <div className="space-y-2">
                    {/* Header con ID y Estado */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">ID: {operationId}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            opFinal.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200"
                          }`}
                        >
                          {opFinal.isActive ? "Active" : "Closed"}
                        </span>
                      </div>
                    </div>

                    {/* Información de usuarios */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">Creador (user1):</span>
                        <p className="font-mono text-foreground">
                          {shortenAddress(opFinal.user1)}
                          {isCreator && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400">(Tú)</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">Contraparte (user2):</span>
                        <p className="font-mono text-foreground">
                          {shortenAddress(opFinal.user2)}
                          {isUser2 && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400">(Tú)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Información de tokens y cantidades */}
                    <div 
                      className="space-y-1.5 rounded-md bg-zinc-50/50 p-2.5 border"
                      style={isDark ? {
                        backgroundColor: '#27272a', // zinc-800
                        borderColor: '#3f3f46', // zinc-700
                      } : {}}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span 
                          className="text-zinc-500 font-medium"
                          style={isDark ? { color: '#ffffff' } : {}}
                        >
                          Ofrece:
                        </span>
                        <span 
                          className="font-medium text-zinc-900"
                          style={isDark ? { color: '#ffffff' } : {}}
                        >
                          {opFinal.amountAFormatted} ETH
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span 
                          className="text-zinc-500 font-medium"
                          style={isDark ? { color: '#ffffff' } : {}}
                        >
                          Solicita:
                        </span>
                        <span 
                          className="font-medium text-zinc-900"
                          style={isDark ? { color: '#ffffff' } : {}}
                        >
                          {opFinal.amountBFormatted} ETH
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(opFinal.id)}
                        disabled={isProcessing}
                        className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
                      >
                        {isProcessing ? "Cancelando..." : "Cancelar operación"}
                      </button>
                    )}

                    {canComplete && (
                      <button
                        onClick={() => handleComplete(opFinal)}
                        disabled={isProcessing}
                        className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                      >
                        {isProcessing ? "Completando..." : "Completar operación"}
                      </button>
                    )}

                    {!canCancel && !canComplete && opFinal.isActive && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        No puedes realizar acciones en esta operación
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
