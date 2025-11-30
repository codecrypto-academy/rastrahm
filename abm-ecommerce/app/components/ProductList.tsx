"use client";

import { useState, useEffect } from "react";
import { Package, RefreshCw, Loader2, CheckCircle2, XCircle, Power } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getEcommerceContractAsync } from "@/lib/contracts";
import { formatError } from "@/lib/utils";
import { ethers } from "ethers";

interface Product {
  productId: bigint;
  companyId: bigint;
  name: string;
  description: string;
  price: bigint;
  stock: bigint;
  ipfsImageHash: string;
  isActive: boolean;
}

export function ProductList({ refreshTrigger }: { refreshTrigger?: number }) {
  const { provider, account, isConnected, signer } = useWallet();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [companyOwners, setCompanyOwners] = useState<Map<string, string>>(new Map());

  const loadProducts = async () => {
    if (!isConnected || !provider) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(provider);
      const allProducts = await contract.getAllProducts();
      
      setProducts(allProducts);

      // Cargar información de propietarios de empresas para verificar permisos
      const uniqueCompanyIds = [...new Set(allProducts.map((p: Product) => p.companyId.toString()))];
      const ownersMap = new Map<string, string>();
      
      for (const companyIdStr of uniqueCompanyIds) {
        try {
          const company = await contract.getCompany(BigInt(companyIdStr));
          ownersMap.set(companyIdStr, company.ownerAddress);
        } catch (err) {
          console.warn(`Error obteniendo empresa ${companyIdStr}:`, err);
        }
      }
      
      setCompanyOwners(ownersMap);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [isConnected, provider, refreshTrigger]);

  const toggleProductActive = async (productId: bigint, currentStatus: boolean) => {
    if (!isConnected || !signer || !account) {
      setError("Por favor conecta tu wallet primero");
      return;
    }

    const productIdStr = productId.toString();
    setUpdatingProductId(productIdStr);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(signer);
      const tx = await contract.setProductActive(productId, !currentStatus);
      await tx.wait();
      
      // Recargar la lista después de la actualización
      await loadProducts();
    } catch (err) {
      console.error("Error actualizando estado de producto:", err);
      setError(formatError(err));
    } finally {
      setUpdatingProductId(null);
    }
  };

  // Función para formatear el precio de unidades base (6 decimales) a EUR
  const formatPrice = (priceInUnits: bigint): string => {
    const priceInEur = Number(ethers.formatUnits(priceInUnits, 6));
    return priceInEur.toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Por favor conecta tu wallet para ver los productos registrados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Productos Registrados ({products.length})
        </h4>
        <button
          onClick={loadProducts}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-100 dark:bg-purple-800/50 hover:bg-purple-200 dark:hover:bg-purple-700/70 text-purple-700 dark:text-purple-200 font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {isLoading && products.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando productos...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No hay productos registrados aún.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => {
            const companyIdStr = product.companyId.toString();
            const productIdStr = product.productId.toString();
            const ownerAddress = companyOwners.get(companyIdStr);
            const isOwner = account && ownerAddress && ownerAddress.toLowerCase() === account.toLowerCase();
            const isUpdating = updatingProductId === productIdStr;

            return (
              <div
                key={productIdStr}
                className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {product.name}
                      </h5>
                      {product.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Inactivo
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {product.description}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">ID:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-mono">
                          {productIdStr}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Empresa ID:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-mono">
                          {companyIdStr}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Precio:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-semibold">
                          {formatPrice(product.price)} EUR
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Stock:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-semibold">
                          {product.stock.toString()}
                        </span>
                      </div>
                    </div>
                    
                    {product.ipfsImageHash && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">IPFS Hash:</span>
                        <span className="ml-2 text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                          {product.ipfsImageHash}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {isOwner && (
                    <div className="ml-4">
                      <button
                        onClick={() => toggleProductActive(product.productId, product.isActive)}
                        disabled={isUpdating}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                          product.isActive
                            ? "bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700/70"
                            : "bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-700/70"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                        {product.isActive ? "Desactivar" : "Activar"}
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

