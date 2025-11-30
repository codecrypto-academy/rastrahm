"use client";

import { useState, useEffect } from "react";
import { Building2, RefreshCw, Loader2, CheckCircle2, XCircle, Power } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getEcommerceContractAsync } from "@/lib/contracts";
import { formatError } from "@/lib/utils";
import { ethers } from "ethers";

interface Company {
  companyId: bigint;
  name: string;
  companyAddress: string;
  taxId: string;
  isActive: boolean;
  ownerAddress: string;
}

export function CompanyList({ refreshTrigger }: { refreshTrigger?: number }) {
  const { provider, account, isConnected, signer } = useWallet();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingCompanyId, setUpdatingCompanyId] = useState<string | null>(null);

  const loadCompanies = async () => {
    if (!isConnected || !provider) {
      setCompanies([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(provider);
      const allCompanies = await contract.getAllCompanies();
      
      console.log("📦 Datos recibidos del contrato:", allCompanies);
      console.log("📦 Tipo de datos:", typeof allCompanies, Array.isArray(allCompanies));
      if (allCompanies.length > 0) {
        console.log("📦 Primera empresa (raw):", allCompanies[0]);
        console.log("📦 Primera empresa (keys):", Object.keys(allCompanies[0] || {}));
      }
      
      // Ethers v6 devuelve las structs como objetos con propiedades nombradas
      // Pero también puede devolverlas como arrays en algunos casos
      const formattedCompanies = allCompanies.map((company: any, index: number) => {
        // Verificar si tiene propiedades nombradas (objeto)
        if (company && typeof company === 'object' && 'companyId' in company) {
          return {
            companyId: company.companyId,
            name: company.name || "",
            companyAddress: company.companyAddress || "",
            taxId: company.taxId || "",
            isActive: company.isActive !== undefined ? company.isActive : true,
            ownerAddress: company.ownerAddress || "",
          };
        }
        
        // Si viene como array (tupla de Solidity) - orden: [companyId, name, companyAddress, taxId, isActive, ownerAddress]
        if (Array.isArray(company) || (company && typeof company === 'object' && company.length !== undefined)) {
          const arr = Array.isArray(company) ? company : Array.from(company);
          return {
            companyId: arr[0] || BigInt(0),
            name: arr[1] || "",
            companyAddress: arr[2] || "",
            taxId: arr[3] || "",
            isActive: arr[4] !== undefined ? arr[4] : true,
            ownerAddress: arr[5] || "",
          };
        }
        
        // Fallback: intentar acceder como objeto genérico
        console.warn(`⚠️ Formato inesperado para empresa ${index}:`, company);
        return {
          companyId: company?.companyId || company?.[0] || BigInt(0),
          name: company?.name || company?.[1] || "",
          companyAddress: company?.companyAddress || company?.[2] || "",
          taxId: company?.taxId || company?.[3] || "",
          isActive: company?.isActive !== undefined ? company.isActive : (company?.[4] !== undefined ? company[4] : true),
          ownerAddress: company?.ownerAddress || company?.[5] || "",
        };
      });

      console.log("✅ Empresas formateadas:", formattedCompanies);
      setCompanies(formattedCompanies);
    } catch (err) {
      console.error("❌ Error cargando empresas:", err);
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [isConnected, provider, refreshTrigger]);

  const toggleCompanyActive = async (companyId: bigint, currentStatus: boolean) => {
    if (!isConnected || !signer || !account) {
      setError("Por favor conecta tu wallet primero");
      return;
    }

    const companyIdStr = companyId.toString();
    setUpdatingCompanyId(companyIdStr);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(signer);
      const tx = await contract.setCompanyActive(companyId, !currentStatus);
      await tx.wait();
      
      // Recargar la lista después de la actualización
      await loadCompanies();
    } catch (err) {
      console.error("Error actualizando estado de empresa:", err);
      setError(formatError(err));
    } finally {
      setUpdatingCompanyId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Por favor conecta tu wallet para ver las empresas registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Empresas Registradas ({companies.length})
        </h4>
        <button
          onClick={loadCompanies}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-100 dark:bg-indigo-800/50 hover:bg-indigo-200 dark:hover:bg-indigo-700/70 text-indigo-700 dark:text-indigo-200 font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {isLoading && companies.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando empresas...</span>
        </div>
      ) : companies.length === 0 ? (
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No hay empresas registradas aún.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {companies.map((company, index) => {
            // Validar que la empresa tenga datos válidos
            if (!company || (company.companyId === undefined && company.companyId === null)) {
              console.warn(`⚠️ Empresa en índice ${index} tiene datos inválidos:`, company);
              return null;
            }

            const companyId = company.companyId?.toString() || `unknown-${index}`;
            const name = company.name || "Sin nombre";
            const companyAddress = company.companyAddress || "N/A";
            const taxId = company.taxId || "N/A";
            const ownerAddress = company.ownerAddress || "N/A";
            const isActive = company.isActive !== undefined ? company.isActive : true;

            const isOwner = account && ownerAddress.toLowerCase() === account.toLowerCase();
            const isUpdating = updatingCompanyId === companyId;

            return (
              <div
                key={companyId}
                className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {name}
                      </h5>
                      {isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Inactiva
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">ID:</span>
                        <span className="text-gray-900 dark:text-white font-mono">
                          {companyId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Dirección:</span>
                        <span className="text-gray-900 dark:text-white font-mono text-xs break-all">
                          {companyAddress}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Tax ID:</span>
                        <span className="text-gray-900 dark:text-white">{taxId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Propietario:</span>
                        <span className="text-gray-900 dark:text-white font-mono text-xs break-all">
                          {ownerAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isOwner && (
                    <div className="ml-4">
                      <button
                        onClick={() => toggleCompanyActive(company.companyId, isActive)}
                        disabled={isUpdating}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                          isActive
                            ? "bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700/70"
                            : "bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-700/70"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                        {isActive ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

