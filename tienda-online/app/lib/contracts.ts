import { ethers } from "ethers";
import { ECOMMERCE_CONTRACT_ADDRESS } from "./constants";

// ABI del contrato Ecommerce
export const ECOMMERCE_ABI = [
  // Empresas
  "function getCompany(uint256 companyId) external view returns (tuple(uint256 companyId, string name, address companyAddress, string taxId, bool isActive, address ownerAddress))",
  "function getAllCompanies() external view returns (tuple(uint256 companyId, string name, address companyAddress, string taxId, bool isActive, address ownerAddress)[])",
  
  // Productos
  "function getProduct(uint256 productId) external view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, uint256 stock, string ipfsImageHash, bool isActive))",
  "function getAllProducts() external view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, uint256 stock, string ipfsImageHash, bool isActive)[])",
  "function getProductsByCompany(uint256 companyId) external view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, uint256 stock, string ipfsImageHash, bool isActive)[])",
  
  // Carrito
  "function addToCart(uint256 productId, uint256 quantity) external",
  "function removeFromCart(uint256 productId) external",
  "function getCart(address customer) external view returns (tuple(uint256 productId, uint256 quantity)[])",
  "function clearCart(address customer) external",
  
  // Contratos relacionados
  "function paymentGateway() external view returns (address)",
  "function euroToken() external view returns (address)",
  
  // Clientes
  "function registerCustomer(string memory name, string memory email) external",
  "function getCustomer(address customerAddress) external view returns (tuple(address customerAddress, string name, string email, uint256 registeredAt, bool isActive))",
  
  // Facturas
  "function createInvoice(address customer, uint256 companyId) external returns (uint256)",
  "function processPayment(uint256 invoiceId, string memory paymentId) external returns (bool)",
  "function getInvoice(uint256 invoiceId) external view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, bytes32 paymentTxHash, tuple(uint256 productId, uint256 quantity)[] items))",
  
  // Eventos
  "event InvoiceCreated(uint256 indexed invoiceId, uint256 indexed companyId, address indexed customerAddress, uint256 totalAmount)",
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
 * Get Ecommerce contract instance (versión asíncrona - lee dinámicamente desde .env.local)
 * Esta es la función recomendada para usar en componentes del cliente
 */
export async function getEcommerceContractAsync(signerOrProvider: ethers.Provider | ethers.Signer) {
  const address = await getEcommerceContractAddress();
  return new ethers.Contract(address, ECOMMERCE_ABI, signerOrProvider);
}

