import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import { ANVIL_URL, ANVIL_ACCOUNT_PRIVATE_KEY, ANVIL_ACCOUNTS, CONTRACT_ABI, CONTRACT_ADDRESS, USE_ANVIL } from './constants';

/**
 * Obtiene el proveedor de MetaMask si está disponible
 */
export const getMetaMaskProvider = (): ethers.BrowserProvider | null => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

/**
 * Crea un proveedor para Anvil usando la clave privada de la primera cuenta
 * Esto simula una wallet para desarrollo
 */
export const getAnvilProvider = (): { provider: ethers.JsonRpcProvider, signer: ethers.Wallet } | null => {
  try {
    const provider = new ethers.JsonRpcProvider(ANVIL_URL);
    const wallet = new ethers.Wallet(ANVIL_ACCOUNT_PRIVATE_KEY, provider);
    return { provider, signer: wallet };
  } catch (error) {
    console.error('Error conectando a Anvil:', error);
    return null;
  }
};

/**
 * Obtiene todas las cuentas disponibles de Anvil
 */
export const getAnvilAccounts = (): Array<{ index: number; address: string; privateKey: string }> => {
  const provider = new ethers.JsonRpcProvider(ANVIL_URL);
  return ANVIL_ACCOUNTS.map(account => ({
    index: account.index,
    address: new ethers.Wallet(account.privateKey, provider).address,
    privateKey: account.privateKey
  }));
};

/**
 * Crea un signer para Anvil usando una clave privada específica
 */
export const getAnvilSigner = (privateKey: string): ethers.Wallet | null => {
  try {
    const provider = new ethers.JsonRpcProvider(ANVIL_URL);
    return new ethers.Wallet(privateKey, provider);
  } catch (error) {
    console.error('Error creando signer de Anvil:', error);
    return null;
  }
};

/**
 * Obtiene un signer para Anvil usando una dirección
 * Busca en las cuentas predefinidas o intenta obtenerla de Anvil
 */
export const getAnvilSignerByAddress = async (address: string): Promise<ethers.Signer | null> => {
  try {
    // Normalizar la dirección
    const normalizedAddress = address.toLowerCase();
    
    // Buscar en las cuentas predefinidas
    const accounts = getAnvilAccounts();
    const account = accounts.find(acc => acc.address.toLowerCase() === normalizedAddress);
    
    if (account) {
      return getAnvilSigner(account.privateKey);
    }
    
    // Si no está en las predefinidas, intentar obtener las cuentas de Anvil
    const provider = new ethers.JsonRpcProvider(ANVIL_URL);
    const signer = await provider.getSigner(address);
    return signer;
  } catch (error) {
    console.error('Error obteniendo signer por dirección:', error);
    return null;
  }
};

/**
 * Obtiene el proveedor activo (MetaMask o Anvil)
 */
export const getActiveProvider = async (): Promise<{
  provider: ethers.Provider;
  signer: ethers.Signer;
  account: string;
  isMetaMask: boolean;
} | null> => {
  // Si USE_ANVIL está activo, usar Anvil directamente
  if (USE_ANVIL) {
    const anvilConnection = getAnvilProvider();
    
    if (anvilConnection) {
      const account = anvilConnection.signer.address;
      console.log('Usando Anvil como wallet (modo desarrollo)');
      return {
        provider: anvilConnection.provider,
        signer: anvilConnection.signer,
        account,
        isMetaMask: false
      };
    }
  }

  // Intentar primero con MetaMask
  const metaMaskProvider = getMetaMaskProvider();
  
  if (metaMaskProvider) {
    try {
      await metaMaskProvider.send('eth_requestAccounts', []);
      const signer = await metaMaskProvider.getSigner();
      const account = await signer.getAddress();
      return {
        provider: metaMaskProvider,
        signer,
        account,
        isMetaMask: true
      };
    } catch (error) {
      console.error('Error conectando a MetaMask:', error);
    }
  }

  // Si MetaMask no está disponible, usar Anvil
  const anvilConnection = getAnvilProvider();
  
  if (anvilConnection) {
    const account = anvilConnection.signer.address;
    console.log('Usando Anvil como fallback');
    return {
      provider: anvilConnection.provider,
      signer: anvilConnection.signer,
      account,
      isMetaMask: false
    };
  }

  return null;
};

/**
 * Calcula el hash SHA256 de un archivo
 */
export const calculateFileHash = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
        const hash = CryptoJS.SHA256(wordArray);
        resolve(`0x${hash.toString()}`);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Obtiene una instancia del contrato conectada
 */
export const getContractInstance = async (): Promise<ethers.Contract | null> => {
  const activeProvider = await getActiveProvider();
  
  if (!activeProvider) {
    return null;
  }

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    activeProvider.signer
  );
};

/**
 * Verifica el estado de conexión a MetaMask
 */
export const checkMetaMaskConnection = async (): Promise<{
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
}> => {
  const provider = getMetaMaskProvider();
  
  if (!provider) {
    return { isConnected: false, account: null, chainId: null };
  }

  try {
    const accounts = await provider.listAccounts();
    const network = await provider.getNetwork();
    
    if (accounts.length > 0) {
      return {
        isConnected: true,
        account: accounts[0].address,
        chainId: network.chainId.toString(16)
      };
    }
    
    return { isConnected: false, account: null, chainId: network.chainId.toString(16) };
  } catch (error) {
    console.error('Error verificando conexión MetaMask:', error);
    return { isConnected: false, account: null, chainId: null };
  }
};

/**
 * Verifica la conexión a Anvil
 */
export const checkAnvilConnection = async (): Promise<boolean> => {
  const anvilConnection = getAnvilProvider();
  
  if (!anvilConnection) {
    return false;
  }

  try {
    await anvilConnection.provider.getBlockNumber();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Convierte un timestamp de BigInt a Date
 */
export const timestampToDate = (timestamp: bigint): Date => {
  return new Date(Number(timestamp) * 1000);
};

/**
 * Formatea una dirección de Ethereum
 */
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

