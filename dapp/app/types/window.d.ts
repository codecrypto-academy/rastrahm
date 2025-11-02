interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    send: (method: string, params?: any[]) => Promise<any>;
    on: (event: string, callback: (accounts: string[]) => void) => void;
    removeListener: (event: string, callback: (accounts: string[]) => void) => void;
    isMetaMask?: boolean;
    selectedAddress?: string;
    networkVersion?: string;
    chainId?: string;
  };
}

