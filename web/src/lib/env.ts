/**
 * Environment Variables Validation Module
 * 
 * Este módulo valida y proporciona acceso seguro a las variables de entorno
 * con valores por defecto y validación de tipos.
 */

interface EnvConfig {
  anvilRpcUrl: string;
  chainId: number;
  euroAddress?: string;
  euroXAddress?: string;
  minFlowRateMonthly?: string;
  maxFlowRateMonthly?: string;
  recommendedDepositHours?: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: EnvConfig;
}

/**
 * Valida que una URL sea válida
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valida que una dirección Ethereum sea válida
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Valida que un número sea válido
 */
function isValidNumber(value: string, min?: number, max?: number): boolean {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

/**
 * Obtiene una variable de entorno de forma segura (funciona en cliente y servidor)
 */
function getEnvVarSafe(key: string): string | undefined {
  if (typeof window === 'undefined') {
    // Servidor
    return process.env[key];
  } else {
    // Cliente - Next.js expone NEXT_PUBLIC_* en window
    // Pero necesitamos acceder directamente a process.env en el cliente también
    return (process.env as any)[key];
  }
}

/**
 * Valida todas las variables de entorno
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Obtener variables de entorno con valores por defecto
  const anvilRpcUrl = getEnvVarSafe('NEXT_PUBLIC_ANVIL_RPC_URL') || 'http://127.0.0.1:8545';
  const chainIdStr = getEnvVarSafe('NEXT_PUBLIC_CHAIN_ID') || '31337';
  const euroAddress = getEnvVarSafe('NEXT_PUBLIC_EURO_ADDRESS');
  const euroXAddress = getEnvVarSafe('NEXT_PUBLIC_EUROX_ADDRESS');
  const minFlowRateMonthly = getEnvVarSafe('NEXT_PUBLIC_MIN_FLOW_RATE_MONTHLY');
  const maxFlowRateMonthly = getEnvVarSafe('NEXT_PUBLIC_MAX_FLOW_RATE_MONTHLY');
  const recommendedDepositHoursStr = getEnvVarSafe('NEXT_PUBLIC_RECOMMENDED_DEPOSIT_HOURS');

  // Validar ANVIL_RPC_URL
  if (!isValidUrl(anvilRpcUrl)) {
    errors.push(`NEXT_PUBLIC_ANVIL_RPC_URL tiene un formato inválido: ${anvilRpcUrl}`);
  }

  // Validar CHAIN_ID
  const chainId = parseInt(chainIdStr, 10);
  if (isNaN(chainId) || chainId <= 0) {
    errors.push(`NEXT_PUBLIC_CHAIN_ID debe ser un número positivo: ${chainIdStr}`);
  }

  // Validar EURO_ADDRESS (opcional pero debe ser válida si está presente)
  if (euroAddress && !isValidAddress(euroAddress)) {
    errors.push(`NEXT_PUBLIC_EURO_ADDRESS tiene un formato inválido: ${euroAddress}`);
  }
  // No mostrar warning si no está configurada - es opcional y tiene valor por defecto

  // Validar EUROX_ADDRESS (opcional pero debe ser válida si está presente)
  if (euroXAddress && !isValidAddress(euroXAddress)) {
    errors.push(`NEXT_PUBLIC_EUROX_ADDRESS tiene un formato inválido: ${euroXAddress}`);
  }
  // No mostrar warning si no está configurada - es opcional y tiene valor por defecto
  // EURx puede no estar disponible si Anvil no está corriendo con fork de mainnet

  // Validar MIN_FLOW_RATE_MONTHLY (opcional)
  if (minFlowRateMonthly && !isValidNumber(minFlowRateMonthly, 0.0001)) {
    errors.push(`NEXT_PUBLIC_MIN_FLOW_RATE_MONTHLY debe ser un número positivo: ${minFlowRateMonthly}`);
  }

  // Validar MAX_FLOW_RATE_MONTHLY (opcional)
  if (maxFlowRateMonthly && !isValidNumber(maxFlowRateMonthly, 1)) {
    errors.push(`NEXT_PUBLIC_MAX_FLOW_RATE_MONTHLY debe ser un número mayor a 1: ${maxFlowRateMonthly}`);
  }

  // Validar que MIN < MAX si ambos están configurados
  if (minFlowRateMonthly && maxFlowRateMonthly) {
    const min = parseFloat(minFlowRateMonthly);
    const max = parseFloat(maxFlowRateMonthly);
    if (min >= max) {
      errors.push(`NEXT_PUBLIC_MIN_FLOW_RATE_MONTHLY (${min}) debe ser menor que NEXT_PUBLIC_MAX_FLOW_RATE_MONTHLY (${max})`);
    }
  }

  // Validar RECOMMENDED_DEPOSIT_HOURS (opcional)
  if (recommendedDepositHoursStr) {
    const hours = parseInt(recommendedDepositHoursStr, 10);
    if (isNaN(hours) || hours < 1 || hours > 24) {
      errors.push(`NEXT_PUBLIC_RECOMMENDED_DEPOSIT_HOURS debe ser un número entre 1 y 24: ${recommendedDepositHoursStr}`);
    }
  }

  const config: EnvConfig = {
    anvilRpcUrl,
    chainId,
    euroAddress,
    euroXAddress,
    minFlowRateMonthly,
    maxFlowRateMonthly,
    recommendedDepositHours: recommendedDepositHoursStr ? parseInt(recommendedDepositHoursStr, 10) : undefined,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Obtiene la configuración validada de variables de entorno
 * @throws Error si hay errores de validación
 */
export function getEnvConfig(): EnvConfig {
  const validation = validateEnv();
  
  if (!validation.valid) {
    const errorMessage = [
      '❌ Errores en variables de entorno:',
      ...validation.errors.map(err => `  - ${err}`),
      '',
      '💡 Solución:',
      '  1. Revisa el archivo .env.local',
      '  2. Consulta .env.example para ver el formato correcto',
      '  3. Asegúrate de que todas las variables requeridas estén configuradas',
    ].join('\n');
    
    throw new Error(errorMessage);
  }

  // Mostrar warnings en desarrollo solo si son importantes
  // Los warnings sobre variables opcionales con valores por defecto no se muestran
  const nodeEnv = getEnvVarSafe('NODE_ENV') || 'development';
  if (validation.warnings.length > 0 && nodeEnv === 'development') {
    // Solo mostrar warnings importantes (no los de variables opcionales con defaults)
    const importantWarnings = validation.warnings.filter(w => 
      !w.includes('no está configurada. Se usará el valor por defecto')
    );
    if (importantWarnings.length > 0) {
      console.warn('⚠️ Advertencias de configuración:', importantWarnings);
    }
  }

  return validation.config;
}

/**
 * Valida variables de entorno y muestra errores de forma amigable
 * Útil para mostrar errores en la UI
 */
export function validateEnvForUI(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  formattedErrors: string;
} {
  const validation = validateEnv();
  
  const formattedErrors = validation.errors.length > 0
    ? [
        'Errores en la configuración:',
        ...validation.errors.map(err => `• ${err}`),
        '',
        'Por favor, revisa tu archivo .env.local y consulta .env.example',
      ].join('\n')
    : '';

  return {
    isValid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    formattedErrors,
  };
}

/**
 * Obtiene el valor de una variable de entorno con validación
 */
export function getEnvVar(
  key: string,
  defaultValue?: string,
  validator?: (value: string) => boolean
): string {
  const value = getEnvVarSafe(key) || defaultValue;
  
  if (!value) {
    throw new Error(`Variable de entorno ${key} no está configurada y no tiene valor por defecto`);
  }

  if (validator && !validator(value)) {
    throw new Error(`Variable de entorno ${key} tiene un valor inválido: ${value}`);
  }

  return value;
}

/**
 * Obtiene el valor de una variable de entorno numérica
 */
export function getEnvNumber(
  key: string,
  defaultValue?: number,
  min?: number,
  max?: number
): number {
  const valueStr = getEnvVarSafe(key);
  
  if (!valueStr && defaultValue !== undefined) {
    return defaultValue;
  }

  if (!valueStr) {
    throw new Error(`Variable de entorno ${key} no está configurada`);
  }

  const value = parseInt(valueStr, 10);
  
  if (isNaN(value)) {
    throw new Error(`Variable de entorno ${key} debe ser un número: ${valueStr}`);
  }

  if (min !== undefined && value < min) {
    throw new Error(`Variable de entorno ${key} debe ser >= ${min}: ${value}`);
  }

  if (max !== undefined && value > max) {
    throw new Error(`Variable de entorno ${key} debe ser <= ${max}: ${value}`);
  }

  return value;
}

/**
 * Valida y obtiene la URL del RPC de Anvil
 */
export function getAnvilRpcUrl(): string {
  return getEnvVar(
    'NEXT_PUBLIC_ANVIL_RPC_URL',
    'http://127.0.0.1:8545',
    isValidUrl
  );
}

/**
 * Valida y obtiene el Chain ID
 */
export function getChainId(): number {
  return getEnvNumber('NEXT_PUBLIC_CHAIN_ID', 31337, 1);
}

