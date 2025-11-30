"use client";

import { useState, useEffect } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getEcommerceContractAsync } from "@/lib/contracts";
import { formatError } from "@/lib/utils";

interface Company {
  companyId: bigint;
  name: string;
  companyAddress: string;
  taxId: string;
  isActive: boolean;
  ownerAddress: string;
}

interface CompanySelectorProps {
  onCompanySelect: (companyId: bigint | null) => void;
  selectedCompanyId: bigint | null;
}

export function CompanySelector({ onCompanySelect, selectedCompanyId }: CompanySelectorProps) {
  const { provider, isConnected } = useWallet();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Filtrar solo empresas activas y formatear
      const formattedCompanies = allCompanies
        .map((company: any) => {
          // Manejar diferentes formatos de datos
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
          
          // Si viene como array
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
          
          return null;
        })
        .filter((company: Company | null): company is Company => 
          company !== null && company.isActive && company.companyId !== undefined
        );

      setCompanies(formattedCompanies);
    } catch (err) {
      console.error("Error cargando empresas:", err);
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [isConnected, provider]);

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Por favor conecta tu wallet para ver las empresas disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Seleccionar Empresa
      </label>
      
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Cargando empresas...</span>
        </div>
      ) : companies.length === 0 ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <Building2 className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No hay empresas activas disponibles.
          </p>
        </div>
      ) : (
        <select
          value={selectedCompanyId?.toString() || ""}
          onChange={(e) => {
            const companyId = e.target.value ? BigInt(e.target.value) : null;
            onCompanySelect(companyId);
          }}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
        >
          <option value="">-- Selecciona una empresa --</option>
          {companies.map((company) => (
            <option key={company.companyId.toString()} value={company.companyId.toString()}>
              {company.name} (ID: {company.companyId.toString()})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

