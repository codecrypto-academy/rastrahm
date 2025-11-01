import { ethers } from 'ethers';

/**
 * Utilidades para resolución de nombres ENS
 */
export class ENSUtils {
  // Direcciones de contratos ENS por red
  private static readonly ENS_ADDRESSES: { [chainId: string]: string } = {
    '1': '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // Ethereum Mainnet
    '11155111': '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // Sepolia
    '31337': '0x0000000000000000000000000000000000000000' // Anvil (no ENS)
  };

  // ABI del contrato ENS Registry
  private static readonly ENS_REGISTRY_ABI = [
    'function resolver(bytes32 node) view returns (address)',
    'function owner(bytes32 node) view returns (address)'
  ];

  // ABI del contrato ENS Resolver
  private static readonly ENS_RESOLVER_ABI = [
    'function addr(bytes32 node) view returns (address)',
    'function name(bytes32 node) view returns (string)',
    'function text(bytes32 node, string key) view returns (string)',
    'function contenthash(bytes32 node) view returns (bytes)'
  ];

  /**
   * Resuelve un nombre ENS a una dirección
   */
  static async resolveName(
    name: string,
    provider: ethers.Provider
  ): Promise<string | null> {
    try {
      // Verificar si es un nombre ENS válido
      if (!this.isValidENSName(name)) {
        throw new Error('Nombre ENS inválido');
      }

      // Obtener la dirección del contrato ENS para la red actual
      const network = await provider.getNetwork();
      const ensAddress = this.ENS_ADDRESSES[network.chainId.toString()];
      
      if (!ensAddress || ensAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('ENS no soportado en esta red');
      }

      // Crear contrato ENS Registry
      const ensRegistry = new ethers.Contract(ensAddress, this.ENS_REGISTRY_ABI, provider);
      
      // Obtener el hash del nombre
      const nameHash = ethers.namehash(name);
      
      // Obtener la dirección del resolver
      const resolverAddress = await ensRegistry.resolver(nameHash);
      
      if (resolverAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Resolver no encontrado para este nombre');
      }

      // Crear contrato Resolver
      const resolver = new ethers.Contract(resolverAddress, this.ENS_RESOLVER_ABI, provider);
      
      // Resolver la dirección
      const address = await resolver.addr(nameHash);
      
      if (address === '0x0000000000000000000000000000000000000000') {
        throw new Error('Dirección no encontrada para este nombre');
      }

      return address;
    } catch (error) {
      console.error('Error al resolver nombre ENS:', error);
      return null;
    }
  }

  /**
   * Resuelve una dirección a un nombre ENS
   */
  static async resolveAddress(
    address: string,
    provider: ethers.Provider
  ): Promise<string | null> {
    try {
      // Verificar si es una dirección válida
      if (!ethers.isAddress(address)) {
        throw new Error('Dirección inválida');
      }

      // Obtener la dirección del contrato ENS para la red actual
      const network = await provider.getNetwork();
      const ensAddress = this.ENS_ADDRESSES[network.chainId.toString()];
      
      if (!ensAddress || ensAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('ENS no soportado en esta red');
      }

      // Crear contrato ENS Registry
      const ensRegistry = new ethers.Contract(ensAddress, this.ENS_REGISTRY_ABI, provider);
      
      // Obtener el hash del nombre inverso
      const reverseName = `${address.slice(2).toLowerCase()}.addr.reverse`;
      const nameHash = ethers.namehash(reverseName);
      
      // Obtener la dirección del resolver
      const resolverAddress = await ensRegistry.resolver(nameHash);
      
      if (resolverAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Resolver no encontrado para esta dirección');
      }

      // Crear contrato Resolver
      const resolver = new ethers.Contract(resolverAddress, this.ENS_RESOLVER_ABI, provider);
      
      // Resolver el nombre
      const name = await resolver.name(nameHash);
      
      if (!name || name === '') {
        throw new Error('Nombre no encontrado para esta dirección');
      }

      return name;
    } catch (error) {
      console.error('Error al resolver dirección ENS:', error);
      return null;
    }
  }

  /**
   * Obtiene información completa de un nombre ENS
   */
  static async getENSInfo(
    name: string,
    provider: ethers.Provider
  ): Promise<{
    name: string;
    address: string | null;
    avatar: string | null;
    description: string | null;
    url: string | null;
    twitter: string | null;
    github: string | null;
  }> {
    try {
      const address = await this.resolveName(name, provider);
      
      if (!address) {
        throw new Error('No se pudo resolver la dirección');
      }

      // Obtener metadatos adicionales
      const [avatar, description, url, twitter, github] = await Promise.all([
        this.getENSText(name, 'avatar', provider),
        this.getENSText(name, 'description', provider),
        this.getENSText(name, 'url', provider),
        this.getENSText(name, 'com.twitter', provider),
        this.getENSText(name, 'com.github', provider)
      ]);

      return {
        name,
        address,
        avatar,
        description,
        url,
        twitter,
        github
      };
    } catch (error) {
      console.error('Error al obtener información ENS:', error);
      return {
        name,
        address: null,
        avatar: null,
        description: null,
        url: null,
        twitter: null,
        github: null
      };
    }
  }

  /**
   * Obtiene un texto específico de un nombre ENS
   */
  static async getENSText(
    name: string,
    key: string,
    provider: ethers.Provider
  ): Promise<string | null> {
    try {
      // Obtener la dirección del contrato ENS para la red actual
      const network = await provider.getNetwork();
      const ensAddress = this.ENS_ADDRESSES[network.chainId.toString()];
      
      if (!ensAddress || ensAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('ENS no soportado en esta red');
      }

      // Crear contrato ENS Registry
      const ensRegistry = new ethers.Contract(ensAddress, this.ENS_REGISTRY_ABI, provider);
      
      // Obtener el hash del nombre
      const nameHash = ethers.namehash(name);
      
      // Obtener la dirección del resolver
      const resolverAddress = await ensRegistry.resolver(nameHash);
      
      if (resolverAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Resolver no encontrado para este nombre');
      }

      // Crear contrato Resolver
      const resolver = new ethers.Contract(resolverAddress, this.ENS_RESOLVER_ABI, provider);
      
      // Obtener el texto
      const text = await resolver.text(nameHash, key);
      
      return text || null;
    } catch (error) {
      console.error(`Error al obtener texto ENS (${key}):`, error);
      return null;
    }
  }

  /**
   * Valida si un nombre es un nombre ENS válido
   */
  static isValidENSName(name: string): boolean {
    try {
      // Verificar formato básico
      if (!name || typeof name !== 'string') {
        return false;
      }

      // Debe terminar en .eth
      if (!name.endsWith('.eth')) {
        return false;
      }

      // Obtener la parte sin .eth
      const label = name.slice(0, -4);
      
      // Verificar longitud
      if (label.length < 1 || label.length > 63) {
        return false;
      }

      // Verificar caracteres válidos (letras, números, guiones)
      if (!/^[a-z0-9-]+$/.test(label)) {
        return false;
      }

      // No puede empezar o terminar con guión
      if (label.startsWith('-') || label.endsWith('-')) {
        return false;
      }

      // No puede tener guiones consecutivos
      if (label.includes('--')) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Normaliza un nombre ENS
   */
  static normalizeENSName(name: string): string {
    try {
      if (!name) return '';
      
      // Convertir a minúsculas
      let normalized = name.toLowerCase();
      
      // Asegurar que termine en .eth
      if (!normalized.endsWith('.eth')) {
        normalized += '.eth';
      }
      
      return normalized;
    } catch (error) {
      return name;
    }
  }

  /**
   * Obtiene el hash de un nombre ENS
   */
  static getNameHash(name: string): string {
    try {
      return ethers.namehash(name);
    } catch (error) {
      throw new Error(`Error al obtener hash del nombre: ${(error as Error).message}`);
    }
  }

  /**
   * Verifica si una red soporta ENS
   */
  static isENSSupported(chainId: string): boolean {
    const ensAddress = this.ENS_ADDRESSES[chainId];
    return ensAddress !== undefined && ensAddress !== '0x0000000000000000000000000000000000000000';
  }

  /**
   * Obtiene la dirección del contrato ENS para una red
   */
  static getENSAddress(chainId: string): string | null {
    const ensAddress = this.ENS_ADDRESSES[chainId];
    return ensAddress && ensAddress !== '0x0000000000000000000000000000000000000000' ? ensAddress : null;
  }

  /**
   * Resuelve múltiples nombres ENS en paralelo
   */
  static async resolveMultipleNames(
    names: string[],
    provider: ethers.Provider
  ): Promise<{ [name: string]: string | null }> {
    try {
      const promises = names.map(async (name) => {
        const address = await this.resolveName(name, provider);
        return { name, address };
      });

      const results = await Promise.all(promises);
      
      return results.reduce((acc, { name, address }) => {
        acc[name] = address;
        return acc;
      }, {} as { [name: string]: string | null });
    } catch (error) {
      throw new Error(`Error al resolver múltiples nombres: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene el avatar de un nombre ENS
   */
  static async getENSAvatar(
    name: string,
    provider: ethers.Provider
  ): Promise<string | null> {
    return await this.getENSText(name, 'avatar', provider);
  }

  /**
   * Obtiene la descripción de un nombre ENS
   */
  static async getENSDescription(
    name: string,
    provider: ethers.Provider
  ): Promise<string | null> {
    return await this.getENSText(name, 'description', provider);
  }

  /**
   * Obtiene la URL de un nombre ENS
   */
  static async getENSURL(
    name: string,
    provider: ethers.Provider
  ): Promise<string | null> {
    return await this.getENSText(name, 'url', provider);
  }
}
