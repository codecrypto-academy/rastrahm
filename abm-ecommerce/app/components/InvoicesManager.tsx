"use client";

import { useState, useEffect } from "react";
import { FileText, RefreshCw, Loader2, CheckCircle2, XCircle, Building2, User, Calendar, DollarSign } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getEcommerceContractAsync } from "@/lib/contracts";
import { formatError, formatCurrency, formatUnits } from "@/lib/utils";
import { ethers } from "ethers";

interface InvoiceItem {
  productId: bigint;
  quantity: bigint;
}

interface Invoice {
  invoiceId: bigint;
  companyId: bigint;
  customerAddress: string;
  totalAmount: bigint;
  timestamp: bigint;
  isPaid: boolean;
  paymentTxHash: string;
  items: InvoiceItem[];
}

interface Company {
  companyId: bigint;
  name: string;
  companyAddress: string;
  taxId: string;
  isActive: boolean;
  ownerAddress: string;
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

// Helper para normalizar la estructura de la factura
const normalizeInvoice = (data: any): Invoice => {
  if (Array.isArray(data)) {
    return {
      invoiceId: data[0],
      companyId: data[1],
      customerAddress: data[2],
      totalAmount: data[3],
      timestamp: data[4],
      isPaid: data[5],
      paymentTxHash: data[6],
      items: data[7] || [],
    };
  }
  return data;
};

// Helper para normalizar items de factura
const normalizeInvoiceItems = (items: any[]): InvoiceItem[] => {
  return items.map((item: any) => {
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
};

export function InvoicesManager({ refreshTrigger }: { refreshTrigger?: number }) {
  const { provider, account, isConnected } = useWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Map<string, Company>>(new Map());
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCompanyId, setFilterCompanyId] = useState<string | null>(null);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);

  const loadInvoices = async () => {
    if (!isConnected || !provider) {
      setInvoices([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = await getEcommerceContractAsync(provider);
      
      // Cargar todas las empresas para mostrar nombres
      const allCompaniesRaw = await contract.getAllCompanies();
      const companiesMap = new Map<string, Company>();
      const userCompaniesList: Company[] = [];
      
      allCompaniesRaw.forEach((companyData: any) => {
        const company: Company = Array.isArray(companyData) ? {
          companyId: companyData[0],
          name: companyData[1],
          companyAddress: companyData[2],
          taxId: companyData[3],
          isActive: companyData[4],
          ownerAddress: companyData[5],
        } : companyData;
        
        companiesMap.set(company.companyId.toString(), company);
        
        // Si el usuario es dueño de la empresa, agregarla a la lista
        if (account && company.ownerAddress.toLowerCase() === account.toLowerCase()) {
          userCompaniesList.push(company);
        }
      });
      
      setCompanies(companiesMap);
      setUserCompanies(userCompaniesList);

      // Cargar todas las facturas
      let invoicesRaw: any[] = [];
      if (filterCompanyId) {
        // Si hay filtro, cargar facturas de esa empresa
        invoicesRaw = await contract.getInvoicesByCompany(BigInt(filterCompanyId));
      } else {
        // Cargar todas las facturas
        invoicesRaw = await contract.getAllInvoices();
      }

      // Cargar productos para mostrar nombres
      const allProductsRaw = await contract.getAllProducts();
      const productsMap = new Map<string, Product>();
      
      allProductsRaw.forEach((productData: any) => {
        const product: Product = Array.isArray(productData) ? {
          productId: productData[0],
          companyId: productData[1],
          name: productData[2],
          description: productData[3],
          price: productData[4],
          stock: productData[5],
          ipfsImageHash: productData[6],
          isActive: productData[7],
        } : productData;
        
        productsMap.set(product.productId.toString(), product);
      });
      
      setProducts(productsMap);

      // Formatear facturas
      const formattedInvoices = invoicesRaw.map((invoiceData: any) => {
        const invoice = normalizeInvoice(invoiceData);
        return {
          ...invoice,
          items: normalizeInvoiceItems(invoice.items || []),
        };
      });

      setInvoices(formattedInvoices);
    } catch (err) {
      console.error("Error cargando facturas:", err);
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [isConnected, provider, account, filterCompanyId, refreshTrigger]);

  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Por favor conecta tu wallet para ver las facturas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Facturas ({invoices.length})
        </h4>
        <div className="flex items-center gap-3">
          {userCompanies.length > 0 && (
            <select
              value={filterCompanyId || ""}
              onChange={(e) => setFilterCompanyId(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Todas las Empresas</option>
              {userCompanies.map((company) => (
                <option key={company.companyId.toString()} value={company.companyId.toString()}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={loadInvoices}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700/70 text-emerald-700 dark:text-emerald-200 font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {isLoading && invoices.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando facturas...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No hay facturas registradas aún.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => {
            const company = companies.get(invoice.companyId.toString());
            const companyName = company?.name || `Empresa ID: ${invoice.companyId.toString()}`;

            return (
              <div
                key={invoice.invoiceId.toString()}
                className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Factura #{invoice.invoiceId.toString()}
                      </h5>
                      {invoice.isPaid ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Pagada
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Empresa:</span>
                        <span className="text-gray-900 dark:text-white">{companyName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Cliente:</span>
                        <span className="text-gray-900 dark:text-white font-mono text-xs break-all">
                          {invoice.customerAddress}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Fecha:</span>
                        <span className="text-gray-900 dark:text-white">{formatDate(invoice.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Total:</span>
                        <span className="text-gray-900 dark:text-white font-semibold text-lg">
                          {formatCurrency(parseFloat(formatUnits(invoice.totalAmount, 6)))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {invoice.items && invoice.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Items ({invoice.items.length}):
                    </h6>
                    <div className="space-y-2">
                      {invoice.items.map((item, index) => {
                        const product = products.get(item.productId.toString());
                        const productName = product?.name || `Producto ID: ${item.productId.toString()}`;
                        const itemPrice = product?.price || BigInt(0);
                        const itemTotal = itemPrice * item.quantity;

                        return (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {productName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Cantidad: {item.quantity.toString()} × {formatCurrency(parseFloat(formatUnits(itemPrice, 6)))}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(parseFloat(formatUnits(itemTotal, 6)))}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {invoice.isPaid && invoice.paymentTxHash && invoice.paymentTxHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Hash de Transacción:</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                      {invoice.paymentTxHash}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

