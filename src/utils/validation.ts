import { ethers } from 'ethers';
import { ValidationResult, TransactionRequest, TypedData } from '../types';

/**
 * Utilidades para validación de formularios y datos
 */
export class ValidationUtils {
  /**
   * Valida una dirección Ethereum
   */
  static validateAddress(address: string): ValidationResult {
    const errors: string[] = [];
    
    if (!address) {
      errors.push('La dirección es requerida');
    } else if (!ethers.isAddress(address)) {
      errors.push('La dirección no es válida');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida un monto en ETH
   */
  static validateAmount(amount: string, balance?: string): ValidationResult {
    const errors: string[] = [];
    
    if (!amount) {
      errors.push('El monto es requerido');
      return { isValid: false, errors };
    }
    
    // Verificar que sea un número válido
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      errors.push('El monto debe ser un número válido');
    } else if (numAmount <= 0) {
      errors.push('El monto debe ser mayor a 0');
    } else if (numAmount > 1e9) {
      errors.push('El monto es demasiado grande');
    }
    
    // Verificar balance si se proporciona
    if (balance) {
      const numBalance = parseFloat(ethers.formatEther(balance));
      if (numAmount > numBalance) {
        errors.push('Fondos insuficientes');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida una transacción
   */
  static validateTransaction(tx: TransactionRequest): ValidationResult {
    const errors: string[] = [];
    
    // Validar dirección de destino
    if (tx.to) {
      const addressValidation = this.validateAddress(tx.to);
      if (!addressValidation.isValid) {
        errors.push(...addressValidation.errors);
      }
    }
    
    // Validar valor
    if (tx.value) {
      // Si tx.value es un string en ETH, validarlo directamente
      // Si es un BigInt en wei, convertirlo primero
      let valueToValidate: string;
      if (typeof tx.value === 'string') {
        valueToValidate = tx.value;
      } else {
        valueToValidate = ethers.formatEther(tx.value);
      }
      
      const amountValidation = this.validateAmount(valueToValidate);
      if (!amountValidation.isValid) {
        errors.push(...amountValidation.errors);
      }
    }
    
    // Validar gas
    if (tx.gas) {
      const gasNum = parseInt(tx.gas);
      if (isNaN(gasNum) || gasNum <= 0) {
        errors.push('El gas debe ser un número positivo');
      } else if (gasNum > 30000000) {
        errors.push('El gas es demasiado alto');
      }
    }
    
    // Validar gas price
    if (tx.gasPrice) {
      const gasPriceNum = parseInt(tx.gasPrice);
      if (isNaN(gasPriceNum) || gasPriceNum <= 0) {
        errors.push('El gas price debe ser un número positivo');
      }
    }
    
    // Validar EIP-1559 fees
    if (tx.maxFeePerGas) {
      const maxFeeNum = parseInt(tx.maxFeePerGas);
      if (isNaN(maxFeeNum) || maxFeeNum <= 0) {
        errors.push('El maxFeePerGas debe ser un número positivo');
      }
    }
    
    if (tx.maxPriorityFeePerGas) {
      const priorityFeeNum = parseInt(tx.maxPriorityFeePerGas);
      if (isNaN(priorityFeeNum) || priorityFeeNum <= 0) {
        errors.push('El maxPriorityFeePerGas debe ser un número positivo');
      }
    }
    
    // Validar que maxPriorityFeePerGas no sea mayor que maxFeePerGas
    if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
      const maxFee = parseInt(tx.maxFeePerGas);
      const priorityFee = parseInt(tx.maxPriorityFeePerGas);
      if (priorityFee > maxFee) {
        errors.push('El maxPriorityFeePerGas no puede ser mayor que maxFeePerGas');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida datos tipados EIP-712
   */
  static validateTypedData(typedData: TypedData): ValidationResult {
    const errors: string[] = [];
    
    if (!typedData.domain) {
      errors.push('El dominio es requerido');
    }
    
    if (!typedData.types) {
      errors.push('Los tipos son requeridos');
    }
    
    if (!typedData.primaryType) {
      errors.push('El tipo primario es requerido');
    }
    
    if (!typedData.message) {
      errors.push('El mensaje es requerido');
    }
    
    // Validar que el primaryType exista en types
    if (typedData.types && typedData.primaryType) {
      if (!typedData.types[typedData.primaryType]) {
        errors.push(`El tipo primario '${typedData.primaryType}' no existe en los tipos`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida un mnemonic
   */
  static validateMnemonic(mnemonic: string): ValidationResult {
    const errors: string[] = [];
    
    if (!mnemonic) {
      errors.push('El mnemonic es requerido');
      return { isValid: false, errors };
    }
    
    const words = mnemonic.trim().split(/\s+/);
    
    if (words.length !== 12) {
      errors.push('El mnemonic debe tener exactamente 12 palabras');
    }
    
    // Verificar que todas las palabras sean válidas (esto es una validación básica)
    const invalidWords = words.filter(word => !/^[a-z]+$/.test(word));
    if (invalidWords.length > 0) {
      errors.push(`Palabras inválidas: ${invalidWords.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida un nombre de cuenta
   */
  static validateAccountName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('El nombre de la cuenta es requerido');
    } else if (name.length < 1) {
      errors.push('El nombre debe tener al menos 1 carácter');
    } else if (name.length > 50) {
      errors.push('El nombre no puede tener más de 50 caracteres');
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      errors.push('El nombre solo puede contener letras, números, espacios, guiones y guiones bajos');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida una URL de RPC
   */
  static validateRpcUrl(url: string): ValidationResult {
    const errors: string[] = [];
    
    if (!url) {
      errors.push('La URL de RPC es requerida');
    } else {
      try {
        new URL(url);
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          errors.push('La URL debe comenzar con http:// o https://');
        }
      } catch {
        errors.push('La URL no es válida');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida un chain ID
   */
  static validateChainId(chainId: string): ValidationResult {
    const errors: string[] = [];
    
    if (!chainId) {
      errors.push('El Chain ID es requerido');
    } else {
      const numChainId = parseInt(chainId);
      if (isNaN(numChainId) || numChainId <= 0) {
        errors.push('El Chain ID debe ser un número positivo');
      } else if (numChainId > 0x7fffffff) {
        errors.push('El Chain ID es demasiado grande');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida un nombre de red
   */
  static validateNetworkName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('El nombre de la red es requerido');
    } else if (name.length < 1) {
      errors.push('El nombre debe tener al menos 1 carácter');
    } else if (name.length > 50) {
      errors.push('El nombre no puede tener más de 50 caracteres');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida un símbolo de moneda
   */
  static validateCurrencySymbol(symbol: string): ValidationResult {
    const errors: string[] = [];
    
    if (!symbol) {
      errors.push('El símbolo de la moneda es requerido');
    } else if (symbol.length < 1 || symbol.length > 10) {
      errors.push('El símbolo debe tener entre 1 y 10 caracteres');
    } else if (!/^[A-Z]+$/.test(symbol)) {
      errors.push('El símbolo debe contener solo letras mayúsculas');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida decimales de moneda
   */
  static validateDecimals(decimals: string): ValidationResult {
    const errors: string[] = [];
    
    if (!decimals) {
      errors.push('Los decimales son requeridos');
    } else {
      const numDecimals = parseInt(decimals);
      if (isNaN(numDecimals) || numDecimals < 0 || numDecimals > 18) {
        errors.push('Los decimales deben ser un número entre 0 y 18');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida un ENS name
   */
  static validateEnsName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('El nombre ENS es requerido');
    } else if (!name.endsWith('.eth')) {
      errors.push('El nombre ENS debe terminar en .eth');
    } else if (name.length < 4) {
      errors.push('El nombre ENS es demasiado corto');
    } else if (name.length > 255) {
      errors.push('El nombre ENS es demasiado largo');
    } else if (!/^[a-z0-9\-]+\.eth$/.test(name)) {
      errors.push('El nombre ENS contiene caracteres inválidos');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
