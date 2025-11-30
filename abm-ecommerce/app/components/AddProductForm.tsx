"use client";

import { useState, useEffect } from "react";
import { Package, Plus, X, Loader2 } from "lucide-react";
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

export function AddProductForm({ onSuccess }: { onSuccess?: () => void }) {
  const { signer, account, isConnected, provider } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [formData, setFormData] = useState({
    companyId: "",
    name: "",
    description: "",
    price: "",
    stock: "",
    ipfsImageHash: "",
  });

  // Cargar empresas cuando se abre el formulario
  useEffect(() => {
    if (isOpen && isConnected && provider) {
      loadCompanies();
    }
  }, [isOpen, isConnected, provider]);

  const loadCompanies = async () => {
    if (!provider || !account) return;

    setIsLoadingCompanies(true);
    try {
      const contract = await getEcommerceContractAsync(provider);
      const allCompanies = await contract.getAllCompanies();
      
      // Filtrar solo las empresas del usuario actual
      const userCompanies = allCompanies.filter(
        (company: Company) => company.ownerAddress.toLowerCase() === account.toLowerCase()
      );
      
      setCompanies(userCompanies);
    } catch (err) {
      console.error("Error cargando empresas:", err);
      setError("Error al cargar empresas");
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isConnected || !signer || !account) {
      setError("Por favor conecta tu wallet primero");
      return;
    }

    // Validaciones
    if (!formData.companyId) {
      setError("Debes seleccionar una empresa");
      return;
    }

    if (!formData.name.trim()) {
      setError("El nombre del producto es requerido");
      return;
    }

    if (!formData.description.trim()) {
      setError("La descripción del producto es requerida");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError("El precio debe ser un número mayor que cero");
      return;
    }

    const stock = parseInt(formData.stock);
    if (isNaN(stock) || stock < 0) {
      setError("El stock debe ser un número mayor o igual a cero");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = await getEcommerceContractAsync(signer);
      
      // Convertir precio de EUR a unidades base con 6 decimales
      // Ejemplo: 10.50 EUR = 10.50 * 10^6 = 10500000 unidades base
      const priceInUnits = ethers.parseUnits(price.toFixed(6), 6);
      
      const tx = await contract.addProduct(
        BigInt(formData.companyId),
        formData.name.trim(),
        formData.description.trim(),
        priceInUnits,
        BigInt(stock),
        formData.ipfsImageHash.trim() || "" // IPFS hash opcional
      );

      setSuccess(`Transacción enviada: ${tx.hash}. Esperando confirmación...`);

      const receipt = await tx.wait();
      
      // Buscar el evento ProductAdded para obtener el productId
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "ProductAdded";
        } catch {
          return false;
        }
      });

      let productId = null;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        productId = parsed?.args[0]?.toString();
      }

      setSuccess(
        `✅ Producto agregado exitosamente!${productId ? ` ID: ${productId}` : ""}`
      );
      
      // Limpiar formulario
      setFormData({
        companyId: "",
        name: "",
        description: "",
        price: "",
        stock: "",
        ipfsImageHash: "",
      });
      setIsOpen(false);
      
      // Llamar callback de éxito
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error("Error agregando producto:", err);
      setError(formatError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Agregar Producto
      </button>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Nuevo Producto
          </h3>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setError(null);
            setSuccess(null);
            setFormData({
              companyId: "",
              name: "",
              description: "",
              price: "",
              stock: "",
              ipfsImageHash: "",
            });
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
            Empresa *
          </label>
          {isLoadingCompanies ? (
            <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-center">
              <Loader2 className="w-5 h-5 animate-spin inline text-gray-400" />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Cargando empresas...
              </span>
            </div>
          ) : companies.length === 0 ? (
            <div className="w-full px-4 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-center">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                No tienes empresas registradas. Por favor registra una empresa primero.
              </p>
            </div>
          ) : (
            <select
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              disabled={isSubmitting}
            >
              <option value="">Selecciona una empresa</option>
              {companies.map((company) => (
                <option key={company.companyId.toString()} value={company.companyId.toString()}>
                  {company.name} (ID: {company.companyId.toString()})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nombre del Producto *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ej: Producto Premium"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Descripción *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Descripción detallada del producto..."
            rows={3}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Precio (EUR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="10.50"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stock *
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="100"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Hash IPFS de la Imagen (Opcional)
          </label>
          <input
            type="text"
            value={formData.ipfsImageHash}
            onChange={(e) => setFormData({ ...formData, ipfsImageHash: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            placeholder="Qm..."
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Hash IPFS de la imagen del producto (opcional)
          </p>
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
            disabled={isSubmitting || companies.length === 0}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Agregar Producto
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError(null);
              setSuccess(null);
              setFormData({
                companyId: "",
                name: "",
                description: "",
                price: "",
                stock: "",
                ipfsImageHash: "",
              });
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

