import { ethers } from 'ethers';
import { TokenInfo } from '../types';

/**
 * Utilidades para tokens ERC-20
 */
export class ERC20Utils {
  // ABI estándar ERC-20
  private static readonly ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
  ];

  /**
   * Obtiene información de un token ERC-20
   */
  static async getTokenInfo(
    tokenAddress: string,
    provider: ethers.Provider
  ): Promise<TokenInfo> {
    try {
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, provider);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        balance: '0',
        logo: undefined
      };
    } catch (error) {
      throw new Error(`Error al obtener información del token: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene el balance de un token ERC-20 para una dirección
   */
  static async getTokenBalance(
    tokenAddress: string,
    ownerAddress: string,
    provider: ethers.Provider
  ): Promise<string> {
    try {
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, provider);
      const balance = await contract.balanceOf(ownerAddress);
      return balance.toString();
    } catch (error) {
      throw new Error(`Error al obtener balance del token: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene información completa del token incluyendo balance
   */
  static async getTokenInfoWithBalance(
    tokenAddress: string,
    ownerAddress: string,
    provider: ethers.Provider
  ): Promise<TokenInfo> {
    try {
      const [tokenInfo, balance] = await Promise.all([
        this.getTokenInfo(tokenAddress, provider),
        this.getTokenBalance(tokenAddress, ownerAddress, provider)
      ]);

      return {
        ...tokenInfo,
        balance
      };
    } catch (error) {
      throw new Error(`Error al obtener información completa del token: ${(error as Error).message}`);
    }
  }

  /**
   * Transfiere tokens ERC-20
   */
  static async transferTokens(
    tokenAddress: string,
    to: string,
    amount: string,
    privateKey: string,
    provider: ethers.Provider
  ): Promise<string> {
    try {
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, wallet);
      
      const tx = await contract.transfer(to, amount);
      return tx.hash;
    } catch (error) {
      throw new Error(`Error al transferir tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Aprueba tokens para un spender
   */
  static async approveTokens(
    tokenAddress: string,
    spender: string,
    amount: string,
    privateKey: string,
    provider: ethers.Provider
  ): Promise<string> {
    try {
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, wallet);
      
      const tx = await contract.approve(spender, amount);
      return tx.hash;
    } catch (error) {
      throw new Error(`Error al aprobar tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene la allowance de tokens
   */
  static async getAllowance(
    tokenAddress: string,
    owner: string,
    spender: string,
    provider: ethers.Provider
  ): Promise<string> {
    try {
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, provider);
      const allowance = await contract.allowance(owner, spender);
      return allowance.toString();
    } catch (error) {
      throw new Error(`Error al obtener allowance: ${(error as Error).message}`);
    }
  }

  /**
   * Formatea el balance de un token según sus decimales
   */
  static formatTokenBalance(balance: string, decimals: number): string {
    try {
      const formatted = ethers.formatUnits(balance, decimals);
      return formatted;
    } catch (error) {
      return '0';
    }
  }

  /**
   * Convierte un monto a la unidad más pequeña del token
   */
  static parseTokenAmount(amount: string, decimals: number): string {
    try {
      const parsed = ethers.parseUnits(amount, decimals);
      return parsed.toString();
    } catch (error) {
      throw new Error(`Error al parsear monto del token: ${(error as Error).message}`);
    }
  }

  /**
   * Valida si una dirección es un contrato ERC-20 válido
   */
  static async isValidERC20Token(
    tokenAddress: string,
    provider: ethers.Provider
  ): Promise<boolean> {
    try {
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, provider);
      
      // Intentar llamar a los métodos básicos
      await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene múltiples balances de tokens para una dirección
   */
  static async getMultipleTokenBalances(
    tokenAddresses: string[],
    ownerAddress: string,
    provider: ethers.Provider
  ): Promise<TokenInfo[]> {
    try {
      const promises = tokenAddresses.map(async (tokenAddress) => {
        try {
          return await this.getTokenInfoWithBalance(tokenAddress, ownerAddress, provider);
        } catch (error) {
          console.error(`Error al obtener balance de ${tokenAddress}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((result): result is TokenInfo => result !== null);
    } catch (error) {
      throw new Error(`Error al obtener balances múltiples: ${(error as Error).message}`);
    }
  }

  /**
   * Tokens ERC-20 populares predefinidos
   */
  static readonly POPULAR_TOKENS: { [chainId: string]: TokenInfo[] } = {
    '1': [ // Ethereum Mainnet
      {
        address: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        balance: '0'
      },
      {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        balance: '0'
      },
      {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        balance: '0'
      }
    ],
    '31337': [ // Anvil Local
      {
        address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        balance: '0'
      }
    ]
  };

  /**
   * Obtiene tokens populares para una red
   */
  static getPopularTokens(chainId: string): TokenInfo[] {
    return this.POPULAR_TOKENS[chainId] || [];
  }

  /**
   * Busca tokens por símbolo o nombre
   */
  static searchTokens(tokens: TokenInfo[], query: string): TokenInfo[] {
    const lowerQuery = query.toLowerCase();
    return tokens.filter(token => 
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery) ||
      token.address.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Calcula el valor total de tokens en ETH (requiere precio)
   */
  static calculateTotalValue(
    tokens: TokenInfo[],
    prices: { [symbol: string]: number }
  ): number {
    return tokens.reduce((total, token) => {
      const price = prices[token.symbol] || 0;
      const balance = parseFloat(this.formatTokenBalance(token.balance, token.decimals));
      return total + (balance * price);
    }, 0);
  }
}
