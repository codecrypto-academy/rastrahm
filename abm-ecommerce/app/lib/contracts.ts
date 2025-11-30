import { ethers } from "ethers";
import { ECOMMERCE_CONTRACT_ADDRESS } from "./constants";

// ABI del contrato Ecommerce
export const ECOMMERCE_ABI = [
  // Empresas
  "function registerCompany(string memory name, address companyAddress, string memory taxId) external returns (uint256)",
  "function getCompany(uint256 companyId) external view returns (tuple(uint256 companyId, string name, address companyAddress, string taxId, bool isActive, address ownerAddress))",
  "function getAllCompanies() external view returns (tuple(uint256 companyId, string name, address companyAddress, string taxId, bool isActive, address ownerAddress)[])",
  "function setCompanyActive(uint256 companyId, bool isActive) external",
  
  // Productos
  "function addProduct(uint256 companyId, string memory name, string memory description, uint256 price, uint256 stock, string memory ipfsImageHash) external returns (uint256)",
  "function getProduct(uint256 productId) external view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, uint256 stock, string ipfsImageHash, bool isActive))",
  "function getAllProducts() external view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, uint256 stock, string ipfsImageHash, bool isActive)[])",
  "function getProductsByCompany(uint256 companyId) external view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, uint256 stock, string ipfsImageHash, bool isActive)[])",
  "function updateProduct(uint256 productId, uint256 price, uint256 stock) external",
  "function setProductActive(uint256 productId, bool isActive) external",
  
  // Clientes
  "function registerCustomer(string memory name, string memory email) external",
  "function getCustomer(address customerAddress) external view returns (tuple(address customerAddress, string name, string email, uint256 registeredAt, bool isActive))",
  
  // Facturas
  "function getInvoice(uint256 invoiceId) external view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, bytes32 paymentTxHash, tuple(uint256 productId, uint256 quantity)[] items))",
  "function getAllInvoices() external view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, bytes32 paymentTxHash, tuple(uint256 productId, uint256 quantity)[] items)[])",
  "function getInvoicesByCustomer(address customer) external view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, bytes32 paymentTxHash, tuple(uint256 productId, uint256 quantity)[] items)[])",
  "function getInvoicesByCompany(uint256 companyId) external view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, bytes32 paymentTxHash, tuple(uint256 productId, uint256 quantity)[] items)[])",
] as const;

/**
 * Obtiene dinámicamente la dirección del contrato Ecommerce desde la API
 */
export async function getEcommerceContractAddress(): Promise<string> {
  try {
    const response = await fetch("/api/ecommerce-contract-address");
    if (!response.ok) {
      throw new Error("Failed to fetch contract address");
    }
    const data = await response.json();
    if (!data.address) {
      throw new Error("Contract address not found in response");
    }
    return data.address;
  } catch (error) {
    console.error("Error fetching contract address:", error);
    // Fallback a la constante estática si la API falla
    if (ECOMMERCE_CONTRACT_ADDRESS) {
      return ECOMMERCE_CONTRACT_ADDRESS;
    }
    throw new Error("ECOMMERCE_CONTRACT_ADDRESS not configured");
  }
}

/**
 * Get Ecommerce contract instance (versión síncrona - usa constante estática)
 * @deprecated Usar getEcommerceContractAsync en su lugar para lectura dinámica
 */
export function getEcommerceContract(signerOrProvider: ethers.Provider | ethers.Signer) {
  if (!ECOMMERCE_CONTRACT_ADDRESS) {
    throw new Error("ECOMMERCE_CONTRACT_ADDRESS not configured");
  }
  return new ethers.Contract(ECOMMERCE_CONTRACT_ADDRESS, ECOMMERCE_ABI, signerOrProvider);
}

/**
 * Get Ecommerce contract instance (versión asíncrona - lee dinámicamente desde .env.local)
 * Esta es la función recomendada para usar en componentes del cliente
 */
export async function getEcommerceContractAsync(signerOrProvider: ethers.Provider | ethers.Signer) {
  const address = await getEcommerceContractAddress();
  return new ethers.Contract(address, ECOMMERCE_ABI, signerOrProvider);
}

