"use client";

import { useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Alert } from "./Alert";

export function ResetAnvilButton() {
  const [isResetting, setIsResetting] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsResetting(true);
    setAlert(null);

    try {
      const response = await fetch("/api/reset-anvil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setAlert({
          type: "success",
          message: data.message || "Anvil ha sido reseteado exitosamente. La blockchain se ha reiniciado al bloque 0.",
        });
        setShowConfirm(false);
        
        // Recargar la página después de 2 segundos para reflejar los cambios
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setAlert({
          type: "error",
          message: data.error || "Error al resetear Anvil. Verifica que Anvil esté corriendo en localhost:8545",
        });
        setShowConfirm(false);
      }
    } catch (error: any) {
      console.error("Error resetting Anvil:", error);
      setAlert({
        type: "error",
        message: error.message || "Error al comunicarse con Anvil. Verifica que esté corriendo.",
      });
      setShowConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-3">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
          autoClose={alert.type === "success" ? 2000 : 5000}
        />
      )}

      {!showConfirm ? (
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="w-full px-4 py-2 bg-orange-100 dark:bg-orange-800/50 hover:bg-orange-200 dark:hover:bg-orange-700/70 text-orange-700 dark:text-orange-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
          Resetear Anvil
        </button>
      ) : (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                ¿Confirmar reset de Anvil?
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Esta acción reseteará la blockchain local al bloque 0. Se perderán todas las transacciones y estados actuales. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Reseteando...
                </>
              ) : (
                "Sí, Resetear"
              )}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setAlert(null);
              }}
              disabled={isResetting}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

