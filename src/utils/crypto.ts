import * as bip39 from 'bip39';
// @ts-ignore
import HDKey from 'hdkey';
import { ethers } from 'ethers';
import { Account } from '../types';

/**
 * Utilidades para criptografía y derivación de claves
 */
export class CryptoUtils {
  /**
   * Genera un mnemonic de 12 palabras usando BIP-39
   */
  static generateMnemonic(): string {
    return bip39.generateMnemonic(128); // 12 palabras
  }

  /**
   * Valida un mnemonic
   */
  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Deriva una cuenta HD usando BIP-44
   * @param mnemonic - Frase mnemónica
   * @param accountIndex - Índice de la cuenta (0-4 para las primeras 5)
   * @returns Objeto Account con clave privada y dirección
   */
  static deriveAccount(mnemonic: string, accountIndex: number): Account {
    // BIP-44 path: m/44'/60'/0'/0/accountIndex
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // Ethereum path: m/44'/60'/0'/0/accountIndex
    const path = `m/44'/60'/0'/0/${accountIndex}`;
    const child = hdkey.derive(path);
    
    if (!child.privateKey) {
      throw new Error('No se pudo derivar la clave privada');
    }

    const wallet = new ethers.Wallet(child.privateKey);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.address, // Usar address como publicKey por ahora
      index: accountIndex,
      name: `Account ${accountIndex + 1}`,
      balance: '0'
    };
  }

  /**
   * Deriva las primeras 5 cuentas de Anvil
   */
  static deriveAnvilAccounts(mnemonic: string): Account[] {
    const accounts: Account[] = [];
    
    for (let i = 0; i < 5; i++) {
      const account = this.deriveAccount(mnemonic, i);
      accounts.push(account);
    }
    
    return accounts;
  }

  /**
   * Obtiene la dirección de una clave privada
   */
  static getAddressFromPrivateKey(privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }

  /**
   * Firma un mensaje con una clave privada
   */
  static async signMessage(message: string, privateKey: string): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  }

  /**
   * Firma datos tipados EIP-712
   */
  static async signTypedData(
    domain: any,
    types: any,
    value: any,
    privateKey: string
  ): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signTypedData(domain, types, value);
  }

  /**
   * Encripta datos usando una contraseña
   */
  static async encrypt(data: string, password: string): Promise<string> {
    // Para desarrollo, no encriptamos
    // En producción, usarías una librería como crypto-js
    return btoa(data);
  }

  /**
   * Desencripta datos usando una contraseña
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    // Para desarrollo, no desencriptamos
    // En producción, usarías una librería como crypto-js
    return atob(encryptedData);
  }

  /**
   * Genera un hash de datos
   */
  static hash(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  /**
   * Valida una dirección Ethereum
   */
  static isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Convierte una dirección a checksum
   */
  static toChecksumAddress(address: string): string {
    return ethers.getAddress(address);
  }

  /**
   * Formatea una dirección para mostrar
   */
  static formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!this.isValidAddress(address)) {
      return address;
    }
    
    const checksumAddress = this.toChecksumAddress(address);
    return `${checksumAddress.slice(0, startChars)}...${checksumAddress.slice(-endChars)}`;
  }

  /**
   * Convierte wei a ether
   */
  static weiToEther(wei: string): string {
    return ethers.formatEther(wei);
  }

  /**
   * Convierte ether a wei
   */
  static etherToWei(ether: string): string {
    return ethers.parseEther(ether).toString();
  }

  /**
   * Genera un nonce aleatorio
   */
  static generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
