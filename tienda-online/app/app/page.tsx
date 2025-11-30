"use client";

import { useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { CompanySelector } from "@/components/CompanySelector";
import { ProductList } from "@/components/ProductList";
import { ShoppingCartComponent } from "@/components/ShoppingCart";
import { CheckoutModal } from "@/components/CheckoutModal";
import { CustomerRegistrationModal } from "@/components/CustomerRegistrationModal";
import { ShoppingCart, Package, Wallet } from "lucide-react";

export default function Home() {
  const { isConnected, account, signer } = useWallet();
  const [selectedCompanyId, setSelectedCompanyId] = useState<bigint | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState<bigint | null>(null);
  const [totalAmount, setTotalAmount] = useState<bigint>(BigInt(0));
  const [cartRefreshTrigger, setCartRefreshTrigger] = useState(0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-block p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4 shadow-lg">
          <ShoppingCart className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
          Tienda Online
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Explora nuestros productos y realiza tus compras de forma segura con EURT o Stripe
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Catálogo de Productos
              </h2>
            </div>
            
            <div className="mb-6">
              <CompanySelector
                onCompanySelect={setSelectedCompanyId}
                selectedCompanyId={selectedCompanyId}
              />
            </div>

            <ProductList
              companyId={selectedCompanyId}
              onAddToCart={(product) => {
                console.log("Producto agregado al carrito:", product);
                setCartRefreshTrigger((prev) => prev + 1);
              }}
              onCartUpdate={() => {
                setCartRefreshTrigger((prev) => prev + 1);
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet Card */}
          <div className="p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl sticky top-24">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Wallet
              </h2>
            </div>
            <WalletButton />
            {isConnected && account && (
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">✓ Conectada</p>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{account}</p>
              </div>
            )}
          </div>

          {/* Shopping Cart Card */}
          <div className="p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Carrito
              </h2>
            </div>
            
            <ShoppingCartComponent
              companyId={selectedCompanyId}
              refreshTrigger={cartRefreshTrigger}
              onCheckout={async () => {
                if (!selectedCompanyId || !account) return;
                
                try {
                  // Verificar si el cliente está registrado
                  const checkCustomerResponse = await fetch("/api/check-customer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ customerAddress: account }),
                  });

                  const customerData = await checkCustomerResponse.json();
                  
                  if (!customerData.isRegistered) {
                    // Mostrar modal de registro
                    setIsCustomerModalOpen(true);
                    return;
                  }

                  // Verificar que el cliente esté registrado y el carrito tenga items
                  const checkResponse = await fetch("/api/create-invoice", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      companyId: selectedCompanyId.toString(),
                      customerAddress: account,
                    }),
                  });

                  if (!checkResponse.ok) {
                    const error = await checkResponse.json();
                    throw new Error(error.error || "Error al verificar factura");
                  }

                  const checkData = await checkResponse.json();
                  
                  if (!checkData.ready) {
                    throw new Error("No se puede crear la factura en este momento");
                  }

                  // Crear factura desde el frontend (el cliente debe firmar)
                  if (!signer) {
                    throw new Error("No hay signer disponible. Conecta tu wallet.");
                  }

                  const { getEcommerceContractAsync } = await import("@/lib/contracts");
                  const contract = await getEcommerceContractAsync(signer);
                  
                  // Crear factura (el cliente firma la transacción)
                  console.log("📝 Creando factura...", { account, companyId: selectedCompanyId.toString() });
                  const tx = await contract.createInvoice(account, selectedCompanyId);
                  console.log("⏳ Esperando confirmación de transacción...", tx.hash);
                  const receipt = await tx.wait();
                  console.log("✅ Transacción confirmada:", receipt);

                  // Obtener invoiceId del evento usando el filtro de eventos
                  let invoiceId: bigint | null = null;
                  
                  try {
                    // Usar el filtro de eventos para encontrar InvoiceCreated
                    const filter = contract.filters.InvoiceCreated(null, selectedCompanyId, account);
                    const events = await contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
                    
                    if (events.length > 0) {
                      invoiceId = events[0].args[0];
                      console.log("✅ InvoiceId obtenido del filtro de eventos:", invoiceId.toString());
                    } else {
                      // Fallback: buscar en los logs manualmente
                      console.warn("⚠️ No se encontró evento con filtro, buscando en logs...");
                      for (const log of receipt.logs) {
                        try {
                          const parsed = contract.interface.parseLog(log);
                          if (parsed && parsed.name === "InvoiceCreated") {
                            console.log("📋 Evento InvoiceCreated encontrado en logs:", parsed.args);
                            invoiceId = parsed.args[0];
                            break;
                          }
                        } catch (err) {
                          continue;
                        }
                      }
                    }
                  } catch (err) {
                    console.error("❌ Error obteniendo invoiceId del evento:", err);
                  }

                  if (!invoiceId) {
                    throw new Error("No se pudo obtener el ID de la factura creada. Verifica los logs de la consola.");
                  }

                  console.log("✅ InvoiceId final:", invoiceId.toString());

                  // Obtener información de la factura
                  const invoice = await contract.getInvoice(invoiceId);
                  console.log("📄 Información de la factura:", invoice);
                  
                  setInvoiceId(invoiceId);
                  setTotalAmount(invoice.totalAmount);
                  setIsCheckoutOpen(true);
                } catch (err: any) {
                  alert(err.message || "Error al crear factura");
                }
              }}
            />
          </div>

          {isCheckoutOpen && selectedCompanyId && (
            <CheckoutModal
              isOpen={isCheckoutOpen}
              onClose={() => {
                setIsCheckoutOpen(false);
                setInvoiceId(null);
                setTotalAmount(BigInt(0));
              }}
              companyId={selectedCompanyId}
              totalAmount={totalAmount}
              invoiceId={invoiceId}
              onPaymentSuccess={() => {
                setCartRefreshTrigger((prev) => prev + 1);
                setIsCheckoutOpen(false);
                setInvoiceId(null);
                setTotalAmount(BigInt(0));
              }}
            />
          )}

          <CustomerRegistrationModal
            isOpen={isCustomerModalOpen}
            onClose={() => setIsCustomerModalOpen(false)}
            onRegistered={async () => {
              setIsCustomerModalOpen(false);
              // Intentar crear factura nuevamente después del registro
              if (selectedCompanyId && account && signer) {
                try {
                  // Verificar que el cliente esté registrado y el carrito tenga items
                  const checkResponse = await fetch("/api/create-invoice", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      companyId: selectedCompanyId.toString(),
                      customerAddress: account,
                    }),
                  });

                  if (!checkResponse.ok) {
                    const error = await checkResponse.json();
                    throw new Error(error.error || "Error al verificar factura");
                  }

                  const checkData = await checkResponse.json();
                  
                  if (!checkData.ready) {
                    throw new Error("No se puede crear la factura en este momento");
                  }

                  // Crear factura desde el frontend (el cliente debe firmar)
                  const { getEcommerceContractAsync } = await import("@/lib/contracts");
                  const contract = await getEcommerceContractAsync(signer);
                  
                  // Crear factura (el cliente firma la transacción)
                  console.log("📝 Creando factura...", { account, companyId: selectedCompanyId.toString() });
                  const tx = await contract.createInvoice(account, selectedCompanyId);
                  console.log("⏳ Esperando confirmación de transacción...", tx.hash);
                  const receipt = await tx.wait();
                  console.log("✅ Transacción confirmada:", receipt);

                  // Obtener invoiceId del evento usando el filtro de eventos
                  let invoiceId: bigint | null = null;
                  
                  try {
                    // Usar el filtro de eventos para encontrar InvoiceCreated
                    const filter = contract.filters.InvoiceCreated(null, selectedCompanyId, account);
                    const events = await contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
                    
                    if (events.length > 0) {
                      invoiceId = events[0].args[0];
                      console.log("✅ InvoiceId obtenido del filtro de eventos:", invoiceId.toString());
                    } else {
                      // Fallback: buscar en los logs manualmente
                      console.warn("⚠️ No se encontró evento con filtro, buscando en logs...");
                      for (const log of receipt.logs) {
                        try {
                          const parsed = contract.interface.parseLog(log);
                          if (parsed && parsed.name === "InvoiceCreated") {
                            console.log("📋 Evento InvoiceCreated encontrado en logs:", parsed.args);
                            invoiceId = parsed.args[0];
                            break;
                          }
                        } catch (err) {
                          continue;
                        }
                      }
                    }
                  } catch (err) {
                    console.error("❌ Error obteniendo invoiceId del evento:", err);
                  }

                  if (!invoiceId) {
                    throw new Error("No se pudo obtener el ID de la factura creada. Verifica los logs de la consola.");
                  }

                  console.log("✅ InvoiceId final:", invoiceId.toString());

                  // Obtener información de la factura
                  const invoice = await contract.getInvoice(invoiceId);
                  console.log("📄 Información de la factura:", invoice);
                  
                  setInvoiceId(invoiceId);
                  setTotalAmount(invoice.totalAmount);
                  setIsCheckoutOpen(true);
                } catch (err: any) {
                  alert(err.message || "Error al crear factura");
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
