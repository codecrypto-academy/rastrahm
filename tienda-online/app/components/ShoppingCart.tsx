"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, X, Plus, Minus, CreditCard, Loader2, Trash2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getEcommerceContractAsync } from "@/lib/contracts";
import { formatError } from "@/lib/utils";
import { ethers } from "ethers";

interface CartItem {
  productId: bigint;
  quantity: bigint;
}

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

interface ShoppingCartProps {
  companyId: bigint | null;
  onCheckout?: () => void;
  refreshTrigger?: number;
}

export function ShoppingCartComponent({ companyId, onCheckout, refreshTrigger }: ShoppingCartProps) {
  const { provider, account, isConnected, signer } = useWallet();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<bigint>(BigInt(0));

  const loadCart = async () => {
    if (!isConnected || !provider || !account) {
      setCartItems([]);
      setProducts(new Map());
      setTotal(BigInt(0));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(provider);
      const cart = await contract.getCart(account);
      
      // Formatear items del carrito
      const formattedItems: CartItem[] = cart.map((item: any) => {
        if (Array.isArray(item)) {
          return {
            productId: item[0] || BigInt(0),
            quantity: item[1] || BigInt(0),
          };
        }
        return {
          productId: item.productId || BigInt(0),
          quantity: item.quantity || BigInt(0),
        };
      });

      setCartItems(formattedItems);

      // Cargar información de productos
      const productsMap = new Map<string, Product>();
      let totalAmount = BigInt(0);

      for (const item of formattedItems) {
        try {
          const product = await contract.getProduct(item.productId);
          
          // Formatear producto
          let formattedProduct: Product;
          if (Array.isArray(product)) {
            formattedProduct = {
              productId: product[0] || BigInt(0),
              companyId: product[1] || BigInt(0),
              name: product[2] || "",
              description: product[3] || "",
              price: product[4] || BigInt(0),
              stock: product[5] || BigInt(0),
              ipfsImageHash: product[6] || "",
              isActive: product[7] !== undefined ? product[7] : true,
            };
          } else {
            formattedProduct = {
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

          productsMap.set(item.productId.toString(), formattedProduct);
          totalAmount += formattedProduct.price * item.quantity;
        } catch (err) {
          console.error(`Error cargando producto ${item.productId}:`, err);
        }
      }

      setProducts(productsMap);
      setTotal(totalAmount);
    } catch (err) {
      console.error("Error cargando carrito:", err);
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, provider, account, companyId, refreshTrigger]);

  const updateCartItem = async (productId: bigint, newQuantity: bigint) => {
    if (!isConnected || !signer || !account) {
      setError("Por favor conecta tu wallet primero");
      return;
    }

    if (newQuantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(signer);
      
      // Primero remover el item actual
      await contract.removeFromCart(productId);
      
      // Luego agregar con la nueva cantidad
      const tx = await contract.addToCart(productId, newQuantity);
      await tx.wait();
      
      await loadCart();
    } catch (err) {
      console.error("Error actualizando carrito:", err);
      setError(formatError(err));
    } finally {
      setIsUpdating(false);
    }
  };

  const removeFromCart = async (productId: bigint) => {
    if (!isConnected || !signer || !account) {
      setError("Por favor conecta tu wallet primero");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(signer);
      const tx = await contract.removeFromCart(productId);
      await tx.wait();
      
      await loadCart();
    } catch (err) {
      console.error("Error removiendo del carrito:", err);
      setError(formatError(err));
    } finally {
      setIsUpdating(false);
    }
  };

  const formatPrice = (priceInUnits: bigint): string => {
    const priceInEur = Number(ethers.formatUnits(priceInUnits, 6));
    return priceInEur.toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
          <ShoppingCart className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Conecta tu wallet para ver tu carrito
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Cargando carrito...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
          <ShoppingCart className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Tu carrito está vacío
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Agrega productos para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {cartItems.map((item) => {
          const product = products.get(item.productId.toString());
          if (!product) return null;

          const itemTotal = product.price * item.quantity;

          return (
            <div
              key={item.productId.toString()}
              className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    {product.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    €{formatPrice(product.price)} c/u
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  disabled={isUpdating}
                  className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateCartItem(item.productId, item.quantity - BigInt(1))}
                    disabled={isUpdating || item.quantity <= BigInt(1)}
                    className="p-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-12 text-center text-sm font-medium text-gray-900 dark:text-white">
                    {item.quantity.toString()}
                  </span>
                  <button
                    onClick={() => updateCartItem(item.productId, item.quantity + BigInt(1))}
                    disabled={isUpdating || Number(item.quantity) >= Number(product.stock)}
                    className="p-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  €{formatPrice(itemTotal)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">Total:</span>
          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            €{formatPrice(total)}
          </span>
        </div>

        {companyId && (
          <button
            onClick={onCheckout}
            disabled={isUpdating || cartItems.length === 0}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-5 h-5" />
            Proceder al Pago
          </button>
        )}
      </div>
    </div>
  );
}

