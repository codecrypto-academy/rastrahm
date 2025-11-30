"use client";

import { useState, useEffect } from "react";
import { Package, Loader2, ShoppingCart } from "lucide-react";
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

interface ProductListProps {
  companyId: bigint | null;
  onAddToCart?: (product: Product) => void;
  onCartUpdate?: () => void;
}

export function ProductList({ companyId, onAddToCart, onCartUpdate }: ProductListProps) {
  const { provider, isConnected, signer, account } = useWallet();
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    if (!isConnected || !provider || !companyId) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(provider);
      const companyProducts = await contract.getProductsByCompany(companyId);
      
      // Formatear productos y filtrar solo activos
      const formattedProducts = companyProducts
        .map((product: any) => {
          // Manejar diferentes formatos de datos
          if (product && typeof product === 'object' && 'productId' in product) {
            return {
              productId: product.productId,
              companyId: product.companyId,
              name: product.name || "",
              description: product.description || "",
              price: product.price || BigInt(0),
              stock: product.stock || BigInt(0),
              ipfsImageHash: product.ipfsImageHash || "",
              isActive: product.isActive !== undefined ? product.isActive : true,
            };
          }
          
          // Si viene como array
          if (Array.isArray(product) || (product && typeof product === 'object' && product.length !== undefined)) {
            const arr = Array.isArray(product) ? product : Array.from(product);
            return {
              productId: arr[0] || BigInt(0),
              companyId: arr[1] || BigInt(0),
              name: arr[2] || "",
              description: arr[3] || "",
              price: arr[4] || BigInt(0),
              stock: arr[5] || BigInt(0),
              ipfsImageHash: arr[6] || "",
              isActive: arr[7] !== undefined ? arr[7] : true,
            };
          }
          
          return null;
        })
        .filter((product: Product | null): product is Product => 
          product !== null && product.isActive && Number(product.stock) > 0
        );

      setProducts(formattedProducts);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [isConnected, provider, companyId]);

  // Función para formatear el precio de unidades base (6 decimales) a EUR
  const formatPrice = (priceInUnits: bigint): string => {
    const priceInEur = Number(ethers.formatUnits(priceInUnits, 6));
    return priceInEur.toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Por favor conecta tu wallet para ver los productos.
        </p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
        <Package className="w-12 h-12 text-blue-400 dark:text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Por favor selecciona una empresa para ver sus productos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando productos...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Esta empresa no tiene productos disponibles en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((product) => (
            <div
              key={product.productId.toString()}
              className="group p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-xl transition-all duration-300 hover:border-orange-300 dark:hover:border-orange-700"
            >
              <div className="h-48 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg mb-4 flex items-center justify-center">
                {product.ipfsImageHash ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all p-2">
                    IPFS: {product.ipfsImageHash.slice(0, 20)}...
                  </div>
                ) : (
                  <Package className="w-16 h-16 text-orange-500 dark:text-orange-400" />
                )}
              </div>
              
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                {product.name}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {product.description}
              </p>
              
              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    €{formatPrice(product.price)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Stock: {product.stock.toString()}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!isConnected || !signer || !account) {
                      alert("Por favor conecta tu wallet primero");
                      return;
                    }

                    setAddingProductId(product.productId.toString());
                    try {
                      const contract = await getEcommerceContractAsync(signer);
                      const tx = await contract.addToCart(product.productId, BigInt(1));
                      await tx.wait();
                      onAddToCart?.(product);
                      onCartUpdate?.();
                    } catch (err) {
                      console.error("Error agregando al carrito:", err);
                      alert(formatError(err));
                    } finally {
                      setAddingProductId(null);
                    }
                  }}
                  disabled={addingProductId === product.productId.toString() || Number(product.stock) === 0}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingProductId === product.productId.toString() ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Agregando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Agregar
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

