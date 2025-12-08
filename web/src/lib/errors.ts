/**
 * Error Handling Module
 * 
 * Este módulo proporciona un sistema robusto de manejo de errores
 * con categorización, mensajes descriptivos y recovery.
 */

export enum ErrorType {
  // Errores de conexión
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Errores de transacción
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  TRANSACTION_REVERTED = 'TRANSACTION_REVERTED',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  USER_REJECTED = 'USER_REJECTED',
  
  // Errores de Superfluid
  SUPERFLUID_ERROR = 'SUPERFLUID_ERROR',
  FLOW_ERROR = 'FLOW_ERROR',
  BALANCE_ERROR = 'BALANCE_ERROR',
  DEPOSIT_ERROR = 'DEPOSIT_ERROR',
  
  // Errores de validación
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  
  // Errores de contrato
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  CONTRACT_NOT_DEPLOYED = 'CONTRACT_NOT_DEPLOYED',
  
  // Errores desconocidos
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  userMessage: string;
  recoverable: boolean;
  suggestions?: string[];
}

/**
 * Clase personalizada de error para la aplicación
 */
export class SuperfluidAppError extends Error {
  public readonly type: ErrorType;
  public readonly userMessage: string;
  public readonly recoverable: boolean;
  public readonly suggestions?: string[];
  public readonly originalError?: any;

  constructor(
    type: ErrorType,
    message: string,
    userMessage: string,
    recoverable: boolean = false,
    suggestions?: string[],
    originalError?: any
  ) {
    super(message);
    this.name = 'SuperfluidAppError';
    this.type = type;
    this.userMessage = userMessage;
    this.recoverable = recoverable;
    this.suggestions = suggestions;
    this.originalError = originalError;
    
    // Mantener el stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SuperfluidAppError);
    }
  }
}

/**
 * Parsea errores de ethers.js y los convierte en errores de la aplicación
 */
export function parseEthersError(error: any): AppError {
  const errorMessage = error?.message || error?.toString() || 'Error desconocido';
  const errorCode = error?.code;
  const errorData = error?.data;

  // Errores de usuario rechazado
  if (
    errorCode === 4001 ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('User denied') ||
    errorMessage.includes('User rejected')
  ) {
    return {
      type: ErrorType.USER_REJECTED,
      message: 'Usuario rechazó la transacción',
      userMessage: 'Has cancelado la transacción. No se realizó ningún cambio.',
      recoverable: true,
      originalError: error,
    };
  }

  // Errores de transacción revertida
  if (
    errorCode === 'CALL_EXCEPTION' ||
    errorMessage.includes('revert') ||
    errorMessage.includes('execution reverted')
  ) {
    const reason = extractRevertReason(errorMessage, errorData);
    return {
      type: ErrorType.TRANSACTION_REVERTED,
      message: `Transacción revertida: ${reason}`,
      userMessage: `La transacción fue revertida: ${reason}`,
      recoverable: true,
      suggestions: [
        'Verifica que tienes suficiente balance',
        'Verifica que los contratos están desplegados',
        'Verifica que los parámetros son correctos',
      ],
      originalError: error,
    };
  }

  // Errores de gas insuficiente
  if (
    errorCode === 'UNPREDICTABLE_GAS_LIMIT' ||
    errorMessage.includes('gas') ||
    errorMessage.includes('out of gas')
  ) {
    return {
      type: ErrorType.INSUFFICIENT_GAS,
      message: 'Error de gas en la transacción',
      userMessage: 'Error al estimar el gas necesario. Intenta de nuevo.',
      recoverable: true,
      suggestions: ['Intenta la operación de nuevo', 'Verifica tu conexión a la red'],
      originalError: error,
    };
  }

  // Errores de conexión RPC
  if (
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorCode === 'NETWORK_ERROR'
  ) {
    return {
      type: ErrorType.CONNECTION_ERROR,
      message: 'Error de conexión',
      userMessage: 'No se pudo conectar a la red. Verifica que Anvil esté corriendo.',
      recoverable: true,
      suggestions: [
        'Verifica que Anvil esté corriendo en http://127.0.0.1:8545',
        'Revisa tu conexión a internet',
      ],
      originalError: error,
    };
  }

  // Error desconocido
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: errorMessage,
    userMessage: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
    recoverable: true,
    suggestions: ['Intenta la operación de nuevo', 'Recarga la página'],
    originalError: error,
  };
}

/**
 * Parsea errores específicos de Superfluid
 */
export function parseSuperfluidError(error: any, operation: string): AppError {
  const errorMessage = error?.message || error?.toString() || 'Error desconocido';

  // Errores de balance insuficiente
  if (
    errorMessage.includes('insufficient') ||
    errorMessage.includes('balance') ||
    errorMessage.includes('deposit')
  ) {
    return {
      type: ErrorType.BALANCE_ERROR,
      message: `Balance insuficiente para ${operation}`,
      userMessage: errorMessage.includes('Balance insuficiente')
        ? errorMessage
        : `No tienes suficiente balance para realizar esta operación.`,
      recoverable: true,
      suggestions: [
        'Haz upgrade de más EUR a EURx',
        'Reduce el flow rate',
        'Espera a que lleguen más fondos',
      ],
      originalError: error,
    };
  }

  // Errores de flow
  if (
    errorMessage.includes('flow') ||
    errorMessage.includes('CFA') ||
    errorMessage.includes('stream')
  ) {
    return {
      type: ErrorType.FLOW_ERROR,
      message: `Error en operación de flow: ${errorMessage}`,
      userMessage: `Error al ${operation} el stream: ${errorMessage}`,
      recoverable: true,
      suggestions: [
        'Verifica que el flow existe',
        'Verifica que tienes permisos',
        'Intenta de nuevo',
      ],
      originalError: error,
    };
  }

  // Errores de validación
  if (
    errorMessage.includes('Flow rate') ||
    errorMessage.includes('demasiado') ||
    errorMessage.includes('mínimo') ||
    errorMessage.includes('máximo')
  ) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      message: errorMessage,
      userMessage: errorMessage,
      recoverable: true,
      suggestions: ['Ajusta el flow rate según los límites permitidos'],
      originalError: error,
    };
  }

  // Error genérico de Superfluid
  return {
    type: ErrorType.SUPERFLUID_ERROR,
    message: `Error de Superfluid en ${operation}: ${errorMessage}`,
    userMessage: `Error al ${operation}: ${errorMessage}`,
    recoverable: true,
    suggestions: ['Verifica la configuración', 'Intenta de nuevo'],
    originalError: error,
  };
}

/**
 * Extrae el motivo de revert de un error
 */
function extractRevertReason(errorMessage: string, errorData?: any): string {
  // Intentar extraer el mensaje de revert
  const revertMatch = errorMessage.match(/revert\s+(.+)/i);
  if (revertMatch) {
    return revertMatch[1];
  }

  // Intentar extraer de error data
  if (errorData) {
    if (typeof errorData === 'string') {
      try {
        const decoded = errorData.slice(2); // Remover 0x
        // Intentar decodificar como string
        return `Error: ${errorData}`;
      } catch {
        // Ignorar
      }
    }
  }

  // Errores comunes conocidos
  if (errorMessage.includes('insufficient funds')) {
    return 'Fondos insuficientes';
  }
  if (errorMessage.includes('allowance')) {
    return 'Aprobación insuficiente';
  }
  if (errorMessage.includes('not owner')) {
    return 'No eres el propietario';
  }

  return 'Razón desconocida';
}

/**
 * Crea un error de la aplicación desde cualquier error
 */
export function createAppError(
  error: any,
  operation: string,
  context?: string
): SuperfluidAppError {
  // Si ya es un AppError, retornarlo
  if (error instanceof SuperfluidAppError) {
    return error;
  }

  // Intentar parsear como error de Superfluid primero
  if (error?.message?.includes('Superfluid') || context?.includes('superfluid')) {
    const appError = parseSuperfluidError(error, operation);
    return new SuperfluidAppError(
      appError.type,
      appError.message,
      appError.userMessage,
      appError.recoverable,
      appError.suggestions,
      appError.originalError
    );
  }

  // Parsear como error de ethers
  const appError = parseEthersError(error);
  return new SuperfluidAppError(
    appError.type,
    appError.message,
    appError.userMessage,
    appError.recoverable,
    appError.suggestions,
    appError.originalError
  );
}

/**
 * Log de error con información detallada
 */
export function logError(error: AppError | SuperfluidAppError, context?: string): void {
  const errorInfo = {
    type: error.type,
    message: error.message,
    userMessage: error.userMessage,
    recoverable: error.recoverable,
    suggestions: error.suggestions,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('🚨 Error:', errorInfo);
  
  if (error.originalError) {
    console.error('Original error:', error.originalError);
  }

  // En producción, podrías enviar esto a un servicio de logging
  // Ejemplo: Sentry, LogRocket, etc.
}

/**
 * Formatea un error para mostrar al usuario
 */
export function formatErrorForUser(error: AppError | SuperfluidAppError): string {
  let message = error.userMessage;

  if (error.suggestions && error.suggestions.length > 0) {
    message += '\n\n💡 Sugerencias:\n';
    error.suggestions.forEach((suggestion, index) => {
      message += `${index + 1}. ${suggestion}\n`;
    });
  }

  return message;
}

/**
 * Determina si un error es recuperable
 */
export function isRecoverableError(error: any): boolean {
  if (error instanceof SuperfluidAppError) {
    return error.recoverable;
  }

  const appError = createAppError(error, 'unknown');
  return appError.recoverable;
}

