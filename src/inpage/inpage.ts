import { ethers } from 'ethers';
import { 
  ProviderRpcError, 
  ProviderMessage, 
  ProviderConnectInfo,
  TransactionRequest,
  TypedData,
  EIP6963ProviderInfo,
  EIP6963ProviderDetail
} from '../types';

/**
 * Provider EIP-1193 para inyección en páginas web
 */
class CodeCryptoProvider {
  private isConnected = false;
  private _chainId = '0x7a69'; // 31337 en hex (Anvil)
  private _accounts: string[] = [];
  private listeners: { [event: string]: Function[] } = {};

  constructor() {
    this.setupMessageListener();
    this.announceProvider();
  }

  /**
   * Configura el listener para mensajes del background script
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'CODECRYPTO_RESPONSE') {
        this.handleResponse(event.data);
      }
    });
  }

  /**
   * Maneja las respuestas del background script
   */
  private handleResponse(data: any): void {
    const { id, result, error } = data;
    
    if (this.pendingRequests[id]) {
      if (error) {
        this.pendingRequests[id].reject(new Error(error.message));
      } else {
        this.pendingRequests[id].resolve(result);
      }
      delete this.pendingRequests[id];
    }
  }

  private pendingRequests: { [id: string]: { resolve: Function; reject: Function } } = {};

  /**
   * Envía un mensaje al background script
   */
  private async sendMessage(type: string, data?: any): Promise<any> {
    const id = Math.random().toString(36).substr(2, 9);
    
    return new Promise((resolve, reject) => {
      this.pendingRequests[id] = { resolve, reject };
      
      window.postMessage({
        type: 'CODECRYPTO_REQUEST',
        id,
        method: type,
        data
      }, '*');
      
      // Timeout después de 30 segundos
      setTimeout(() => {
        if (this.pendingRequests[id]) {
          delete this.pendingRequests[id];
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Emite un evento a los listeners
   */
  private emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Error en listener:', error);
        }
      });
    }
  }

  // EIP-1193 Provider Interface

  /**
   * Solicita acceso a las cuentas
   */
  async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
    try {
      switch (method) {
        case 'eth_requestAccounts':
          return await this.eth_requestAccounts();
        
        case 'eth_accounts':
          return this.accounts;
        
        case 'eth_chainId':
          return this.chainId;
        
        case 'eth_sendTransaction':
          return await this.eth_sendTransaction(params?.[0]);
        
        case 'eth_sign':
          return await this.eth_sign(params?.[0], params?.[1]);
        
        case 'personal_sign':
          // personal_sign tiene los parámetros invertidos: [mensaje, dirección]
          return await this.eth_sign(params?.[1], params?.[0]);
        
        case 'eth_signTypedData_v4':
          return await this.eth_signTypedData_v4(params?.[0], params?.[1]);
        
        case 'eth_getBalance':
          return await this.eth_getBalance(params?.[0], params?.[1]);
        
        case 'eth_getTransactionCount':
          return await this.eth_getTransactionCount(params?.[0], params?.[1]);
        
        case 'eth_estimateGas':
          return await this.eth_estimateGas(params?.[0]);
        
        case 'eth_gasPrice':
          return await this.eth_gasPrice();
        
        case 'eth_feeHistory':
          return await this.eth_feeHistory(params?.[0], params?.[1], params?.[2]);
        
        case 'eth_blockNumber':
          return await this.eth_blockNumber();
        
        case 'eth_getBlockByNumber':
          return await this.eth_getBlockByNumber(params?.[0], params?.[1]);
        
        case 'eth_getTransactionByHash':
          return await this.eth_getTransactionByHash(params?.[0]);
        
        case 'eth_getTransactionReceipt':
          return await this.eth_getTransactionReceipt(params?.[0]);
        
        case 'eth_call':
          return await this.eth_call(params?.[0], params?.[1]);
        
        case 'eth_getCode':
          return await this.eth_getCode(params?.[0], params?.[1]);
        
        case 'eth_getStorageAt':
          return await this.eth_getStorageAt(params?.[0], params?.[1], params?.[2]);
        
        case 'wallet_switchEthereumChain':
          return await this.wallet_switchEthereumChain(params?.[0]);
        
        case 'wallet_addEthereumChain':
          return await this.wallet_addEthereumChain(params?.[0]);
        
        case 'wallet_getPermissions':
          return await this.wallet_getPermissions();
        
        case 'wallet_requestPermissions':
          return await this.wallet_requestPermissions(params?.[0]);
        
        default:
          throw new Error(`Método no soportado: ${method}`);
      }
    } catch (error) {
      console.error(`Error en ${method}:`, error);
      throw error;
    }
  }

  /**
   * eth_requestAccounts - Solicita acceso a las cuentas
   */
  private async eth_requestAccounts(): Promise<string[]> {
      const result = await this.sendMessage('eth_requestAccounts');
      // El result viene del background con { success: true, accounts: [...] }
      this._accounts = result.accounts || result || [];
      this.isConnected = true;
      this.emit('connect', { chainId: this._chainId });
      this.emit('accountsChanged', this._accounts);
      return this._accounts;
  }

  /**
   * eth_sendTransaction - Envía una transacción
   */
  private async eth_sendTransaction(transaction: TransactionRequest): Promise<string> {
    if (!this._accounts.length) {
      throw new Error('No hay cuentas conectadas');
    }
    
    const result = await this.sendMessage('eth_sendTransaction', { transaction });
    return result.transactionHash;
  }

  /**
   * eth_sign - Firma un mensaje
   */
  private async eth_sign(address: string, message: string): Promise<string> {
    if (!this._accounts.includes(address)) {
      throw new Error('Cuenta no autorizada');
    }
    
    const result = await this.sendMessage('eth_sign', { address, message });
    return result.signature;
  }

  /**
   * eth_signTypedData_v4 - Firma datos tipados EIP-712
   */
  private async eth_signTypedData_v4(address: string, typedData: TypedData): Promise<string> {
    if (!this._accounts.includes(address)) {
      throw new Error('Cuenta no autorizada');
    }
    
    const result = await this.sendMessage('eth_signTypedData_v4', { address, typedData });
    return result.signature;
  }

  /**
   * eth_getBalance - Obtiene el balance de una cuenta
   */
  private async eth_getBalance(address: string, blockTag: string = 'latest'): Promise<string> {
    const result = await this.sendMessage('eth_getBalance', { address, blockTag });
    return result.balance;
  }

  /**
   * eth_getTransactionCount - Obtiene el nonce de una cuenta
   */
  private async eth_getTransactionCount(address: string, blockTag: string = 'latest'): Promise<string> {
    const result = await this.sendMessage('eth_getTransactionCount', { address, blockTag });
    return result.nonce;
  }

  /**
   * eth_estimateGas - Estima el gas para una transacción
   */
  private async eth_estimateGas(transaction: TransactionRequest): Promise<string> {
    const result = await this.sendMessage('eth_estimateGas', { transaction });
    return result.gas;
  }

  /**
   * eth_gasPrice - Obtiene el precio del gas
   */
  private async eth_gasPrice(): Promise<string> {
    const result = await this.sendMessage('eth_gasPrice');
    return result.gasPrice;
  }

  /**
   * eth_feeHistory - Obtiene el historial de fees (EIP-1559)
   */
  private async eth_feeHistory(blockCount: string, newestBlock: string, rewardPercentiles: number[]): Promise<any> {
    const result = await this.sendMessage('eth_feeHistory', { blockCount, newestBlock, rewardPercentiles });
    return result.feeHistory;
  }

  /**
   * eth_blockNumber - Obtiene el número del bloque actual
   */
  private async eth_blockNumber(): Promise<string> {
    const result = await this.sendMessage('eth_blockNumber');
    return result.blockNumber;
  }

  /**
   * eth_getBlockByNumber - Obtiene un bloque por número
   */
  private async eth_getBlockByNumber(blockNumber: string, fullTransactions: boolean = false): Promise<any> {
    const result = await this.sendMessage('eth_getBlockByNumber', { blockNumber, fullTransactions });
    return result.block;
  }

  /**
   * eth_getTransactionByHash - Obtiene una transacción por hash
   */
  private async eth_getTransactionByHash(txHash: string): Promise<any> {
    const result = await this.sendMessage('eth_getTransactionByHash', { txHash });
    return result.transaction;
  }

  /**
   * eth_getTransactionReceipt - Obtiene el recibo de una transacción
   */
  private async eth_getTransactionReceipt(txHash: string): Promise<any> {
    const result = await this.sendMessage('eth_getTransactionReceipt', { txHash });
    return result.receipt;
  }

  /**
   * eth_call - Ejecuta una llamada a un contrato
   */
  private async eth_call(callData: any, blockTag: string = 'latest'): Promise<string> {
    const result = await this.sendMessage('eth_call', { callData, blockTag });
    return result.result;
  }

  /**
   * eth_getCode - Obtiene el código de un contrato
   */
  private async eth_getCode(address: string, blockTag: string = 'latest'): Promise<string> {
    const result = await this.sendMessage('eth_getCode', { address, blockTag });
    return result.code;
  }

  /**
   * eth_getStorageAt - Obtiene el storage de un contrato
   */
  private async eth_getStorageAt(address: string, position: string, blockTag: string = 'latest'): Promise<string> {
    const result = await this.sendMessage('eth_getStorageAt', { address, position, blockTag });
    return result.storage;
  }

  /**
   * wallet_switchEthereumChain - Cambia de red
   */
  private async wallet_switchEthereumChain(chainId: string): Promise<null> {
    const result = await this.sendMessage('wallet_switchEthereumChain', { chainId });
    this._chainId = chainId;
    this.emit('chainChanged', chainId);
    return null;
  }

  /**
   * wallet_addEthereumChain - Agrega una nueva red
   */
  private async wallet_addEthereumChain(chainParams: any): Promise<null> {
    const result = await this.sendMessage('wallet_addEthereumChain', { chainParams });
    return null;
  }

  /**
   * wallet_getPermissions - Obtiene los permisos actuales
   */
  private async wallet_getPermissions(): Promise<any[]> {
    const result = await this.sendMessage('wallet_getPermissions');
    return result.permissions || [];
  }

  /**
   * wallet_requestPermissions - Solicita permisos
   */
  private async wallet_requestPermissions(permissions: any[]): Promise<any[]> {
    const result = await this.sendMessage('wallet_requestPermissions', { permissions });
    return result.permissions || [];
  }

  // Event Listeners

  /**
   * Agrega un listener de eventos
   */
  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  /**
   * Remueve un listener de eventos
   */
  removeListener(event: string, listener: Function): void {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(listener);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  /**
   * Agrega un listener que se ejecuta una sola vez
   */
  once(event: string, listener: Function): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.removeListener(event, onceListener);
    };
    this.on(event, onceListener);
  }

  // EIP-6963 Provider Discovery

  /**
   * Anuncia el provider usando EIP-6963
   */
  private announceProvider(): void {
    const providerInfo: EIP6963ProviderInfo = {
      uuid: 'codecrypto-wallet-uuid',
      name: 'CodeCrypto Wallet',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzAwN0JGRiIvPgo8cGF0aCBkPSJNOCAxMkgxNlYyMEg4VjEyWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE2IDEySDI0VjIwSDE2VjEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
      rdns: 'com.codecrypto.wallet'
    };

    const providerDetail: EIP6963ProviderDetail = {
      info: providerInfo,
      provider: this
    };

    // Anunciar el provider
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: providerDetail
    }));

    // Escuchar solicitudes de providers
    window.addEventListener('eip6963:requestProvider', () => {
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: providerDetail
      }));
    });
  }

  // Propiedades públicas

  get connected(): boolean {
    return this.isConnected;
  }

  get chainId(): string {
    return this._chainId;
  }

  get accounts(): string[] {
    return this._accounts;
  }
}

// Inyectar el provider en window
if (typeof window !== 'undefined') {
  const provider = new CodeCryptoProvider();
  
  // SIEMPRE inyectar como window.codecrypto (específico del wallet)
  (window as any).codecrypto = provider;
  
  // Solo inyectar como window.ethereum si no existe otro provider
  if (!(window as any).ethereum) {
    (window as any).ethereum = provider;
  }
  
  console.log('CodeCrypto Wallet Provider inyectado');
  console.log('window.codecrypto disponible');
  if ((window as any).ethereum === provider) {
    console.log('window.ethereum disponible (CodeCrypto)');
  } else {
    console.log('window.ethereum ya existe (otro wallet), usa window.codecrypto');
  }
}
