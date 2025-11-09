// Tipos para window.ethereum (MetaMask)

interface EthereumProvider {
  isMetaMask?: boolean;
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
  send(method: string, params?: any[]): Promise<any>;
}

interface Window {
  ethereum?: EthereumProvider;
}

