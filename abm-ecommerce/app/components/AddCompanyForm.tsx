"use client";

import { useState } from "react";
import { Building2, Plus, X, Loader2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getEcommerceContractAsync } from "@/lib/contracts";
import { formatError } from "@/lib/utils";
import { ethers } from "ethers";

export function AddCompanyForm({ onSuccess }: { onSuccess?: () => void }) {
  const { signer, account, isConnected } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    companyAddress: "",
    taxId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isConnected || !signer || !account) {
      setError("Por favor conecta tu wallet primero");
      return;
    }

    // Validaciones
    if (!formData.name.trim()) {
      setError("El nombre de la empresa es requerido");
      return;
    }

    if (!formData.companyAddress.trim()) {
      setError("La dirección de la empresa es requerida");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.companyAddress)) {
      setError("Dirección Ethereum inválida");
      return;
    }

    if (!formData.taxId.trim()) {
      setError("El número de identificación fiscal es requerido");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = await getEcommerceContractAsync(signer);
      
      const tx = await contract.registerCompany(
        formData.name.trim(),
        formData.companyAddress.trim(),
        formData.taxId.trim()
      );

      setSuccess(`Transacción enviada: ${tx.hash}. Esperando confirmación...`);

      const receipt = await tx.wait();
      
      // Buscar el evento CompanyRegistered para obtener el companyId
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "CompanyRegistered";
        } catch {
          return false;
        }
      });

      let companyId = null;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        companyId = parsed?.args[0]?.toString();
      }

      setSuccess(
        `✅ Empresa registrada exitosamente!${companyId ? ` ID: ${companyId}` : ""}`
      );
      
      // Limpiar formulario
      setFormData({ name: "", companyAddress: "", taxId: "" });
      setIsOpen(false);
      
      // Llamar callback de éxito
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error("Error registrando empresa:", err);
      setError(formatError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Agregar Empresa
      </button>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Nueva Empresa
          </h3>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setError(null);
            setSuccess(null);
            setFormData({ name: "", companyAddress: "", taxId: "" });
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nombre de la Empresa *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ej: Mi Empresa S.A."
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dirección de Wallet (para recibir pagos) *
          </label>
          <input
            type="text"
            value={formData.companyAddress}
            onChange={(e) =>
              setFormData({ ...formData, companyAddress: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            placeholder="0x..."
            required
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Dirección Ethereum donde la empresa recibirá los pagos
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Número de Identificación Fiscal *
          </label>
          <input
            type="text"
            value={formData.taxId}
            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ej: CIF-12345678"
            required
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Registrar Empresa
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError(null);
              setSuccess(null);
              setFormData({ name: "", companyAddress: "", taxId: "" });
            }}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

