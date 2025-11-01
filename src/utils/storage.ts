import { WalletStorage, Account, Network, LogEntry, NotificationData } from '../types';

/**
 * Utilidades para el manejo del almacenamiento con chrome.storage.local
 */
export class StorageUtils {
  private static readonly STORAGE_KEY = 'codecrypto_wallet';

  /**
   * Obtiene todos los datos del wallet
   */
  static async getWalletData(): Promise<WalletStorage | null> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || null;
    } catch (error) {
      console.error('Error al obtener datos del wallet:', error);
      return null;
    }
  }

  /**
   * Guarda todos los datos del wallet
   */
  static async setWalletData(data: WalletStorage): Promise<boolean> {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
      return true;
    } catch (error) {
      console.error('Error al guardar datos del wallet:', error);
      return false;
    }
  }

  /**
   * Obtiene el mnemonic
   */
  static async getMnemonic(): Promise<string | null> {
    const data = await this.getWalletData();
    return data?.mnemonic || null;
  }

  /**
   * Guarda el mnemonic
   */
  static async setMnemonic(mnemonic: string): Promise<boolean> {
    const data = await this.getWalletData() || this.getDefaultWalletData();
    data.mnemonic = mnemonic;
    return await this.setWalletData(data);
  }

  /**
   * Obtiene las cuentas
   */
  static async getAccounts(): Promise<Account[]> {
    const data = await this.getWalletData();
    return data?.accounts || [];
  }

  /**
   * Guarda las cuentas
   */
  static async setAccounts(accounts: Account[]): Promise<boolean> {
    const data = await this.getWalletData() || this.getDefaultWalletData();
    data.accounts = accounts;
    return await this.setWalletData(data);
  }

  /**
   * Obtiene la cuenta actual
   */
  static async getCurrentAccount(): Promise<number> {
    const data = await this.getWalletData();
    return data?.currentAccount || 0;
  }

  /**
   * Establece la cuenta actual
   */
  static async setCurrentAccount(accountIndex: number): Promise<boolean> {
    const data = await this.getWalletData() || this.getDefaultWalletData();
    data.currentAccount = accountIndex;
    return await this.setWalletData(data);
  }

  /**
   * Obtiene el chain ID actual
   */
  static async getChainId(): Promise<string> {
    const data = await this.getWalletData();
    return data?.chainId || '31337'; // Anvil por defecto
  }

  /**
   * Establece el chain ID actual
   */
  static async setChainId(chainId: string): Promise<boolean> {
    const data = await this.getWalletData() || this.getDefaultWalletData();
    data.chainId = chainId;
    return await this.setWalletData(data);
  }

  /**
   * Obtiene las redes configuradas
   */
  static async getNetworks(): Promise<Network[]> {
    const data = await this.getWalletData();
    return data?.networks || this.getDefaultNetworks();
  }

  /**
   * Guarda las redes configuradas
   */
  static async setNetworks(networks: Network[]): Promise<boolean> {
    const data = await this.getWalletData() || this.getDefaultWalletData();
    data.networks = networks;
    return await this.setWalletData(data);
  }

  /**
   * Obtiene el tema actual
   */
  static async getTheme(): Promise<'light' | 'dark'> {
    const data = await this.getWalletData();
    return data?.theme || 'light';
  }

  /**
   * Establece el tema
   */
  static async setTheme(theme: 'light' | 'dark'): Promise<boolean> {
    const data = await this.getWalletData() || this.getDefaultWalletData();
    data.theme = theme;
    return await this.setWalletData(data);
  }

  /**
   * Obtiene el idioma actual
   */
  static async getLanguage(): Promise<'es' | 'en'> {
    const data = await this.getWalletData();
    return data?.language || 'es';
  }

  /**
   * Establece el idioma
   */
  static async setLanguage(language: 'es' | 'en'): Promise<boolean> {
    const data = await this.getWalletData() || this.getDefaultWalletData();
    data.language = language;
    return await this.setWalletData(data);
  }

  /**
   * Obtiene los logs
   */
  static async getLogs(): Promise<LogEntry[]> {
    try {
      const result = await chrome.storage.local.get('codecrypto_logs');
      return result.codecrypto_logs || [];
    } catch (error) {
      console.error('Error al obtener logs:', error);
      return [];
    }
  }

  /**
   * Guarda un log
   */
  static async addLog(log: LogEntry): Promise<boolean> {
    try {
      const logs = await this.getLogs();
      logs.push(log);
      
      // Mantener solo los últimos 1000 logs
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      
      await chrome.storage.local.set({ codecrypto_logs: logs });
      return true;
    } catch (error) {
      console.error('Error al guardar log:', error);
      return false;
    }
  }

  /**
   * Limpia los logs
   */
  static async clearLogs(): Promise<boolean> {
    try {
      await chrome.storage.local.set({ codecrypto_logs: [] });
      return true;
    } catch (error) {
      console.error('Error al limpiar logs:', error);
      return false;
    }
  }

  /**
   * Obtiene las notificaciones
   */
  static async getNotifications(): Promise<NotificationData[]> {
    try {
      const result = await chrome.storage.local.get('codecrypto_notifications');
      return result.codecrypto_notifications || [];
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      return [];
    }
  }

  /**
   * Guarda una notificación
   */
  static async addNotification(notification: NotificationData): Promise<boolean> {
    try {
      const notifications = await this.getNotifications();
      notifications.push(notification);
      
      // Mantener solo las últimas 100 notificaciones
      if (notifications.length > 100) {
        notifications.splice(0, notifications.length - 100);
      }
      
      await chrome.storage.local.set({ codecrypto_notifications: notifications });
      return true;
    } catch (error) {
      console.error('Error al guardar notificación:', error);
      return false;
    }
  }

  /**
   * Limpia las notificaciones
   */
  static async clearNotifications(): Promise<boolean> {
    try {
      await chrome.storage.local.set({ codecrypto_notifications: [] });
      return true;
    } catch (error) {
      console.error('Error al limpiar notificaciones:', error);
      return false;
    }
  }

  /**
   * Resetea completamente el wallet
   */
  static async resetWallet(): Promise<boolean> {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Error al resetear wallet:', error);
      return false;
    }
  }

  /**
   * Obtiene los datos por defecto del wallet
   */
  private static getDefaultWalletData(): WalletStorage {
    return {
      accounts: [],
      currentAccount: 0,
      chainId: '31337',
      networks: this.getDefaultNetworks(),
      theme: 'light',
      language: 'es'
    };
  }

  /**
   * Obtiene las redes por defecto
   */
  private static getDefaultNetworks(): Network[] {
    return [
      {
        chainId: '31337',
        name: 'Anvil Local',
        rpcUrl: 'http://localhost:8545',
        blockExplorer: '',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        isTestnet: true
      },
      {
        chainId: '1',
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
        blockExplorer: 'https://etherscan.io',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        isTestnet: false
      },
      {
        chainId: '11155111',
        name: 'Sepolia Testnet',
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
        blockExplorer: 'https://sepolia.etherscan.io',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        isTestnet: true
      }
    ];
  }

  /**
   * Escucha cambios en el almacenamiento
   */
  static onStorageChanged(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
    chrome.storage.onChanged.addListener(callback);
  }

  /**
   * Remueve el listener de cambios en el almacenamiento
   */
  static removeStorageListener(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
    chrome.storage.onChanged.removeListener(callback);
  }
}
