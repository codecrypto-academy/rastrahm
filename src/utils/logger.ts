import { LogEntry } from '../types';
import { StorageUtils } from './storage';

/**
 * Sistema de logging para el wallet
 */
export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Genera un ID único para el log
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Crea una entrada de log
   */
  private createLogEntry(
    type: LogEntry['type'],
    message: string,
    data?: any,
    level: LogEntry['level'] = 'info'
  ): LogEntry {
    return {
      id: this.generateId(),
      type,
      message,
      data,
      timestamp: Date.now(),
      level
    };
  }

  /**
   * Log de llamadas a métodos
   */
  async logCall(method: string, params?: any): Promise<void> {
    const log = this.createLogEntry(
      'call',
      `Llamada a método: ${method}`,
      { method, params },
      'info'
    );
    
    this.logs.push(log);
    await StorageUtils.addLog(log);
    
    console.log(`[CALL] ${method}`, params);
  }

  /**
   * Log de eventos
   */
  async logEvent(eventType: string, data?: any): Promise<void> {
    const log = this.createLogEntry(
      'event',
      `Evento: ${eventType}`,
      { eventType, data },
      'info'
    );
    
    this.logs.push(log);
    await StorageUtils.addLog(log);
    
    console.log(`[EVENT] ${eventType}`, data);
  }

  /**
   * Log de errores
   */
  async logError(error: Error | string, context?: any): Promise<void> {
    const message = error instanceof Error ? error.message : error;
    const log = this.createLogEntry(
      'error',
      `Error: ${message}`,
      { 
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        context 
      },
      'error'
    );
    
    this.logs.push(log);
    await StorageUtils.addLog(log);
    
    console.error(`[ERROR] ${message}`, context);
  }

  /**
   * Log de operaciones
   */
  async logOperation(operation: string, data?: any): Promise<void> {
    const log = this.createLogEntry(
      'operation',
      `Operación: ${operation}`,
      { operation, data },
      'info'
    );
    
    this.logs.push(log);
    await StorageUtils.addLog(log);
    
    console.log(`[OPERATION] ${operation}`, data);
  }

  /**
   * Log de advertencias
   */
  async logWarning(message: string, data?: any): Promise<void> {
    const log = this.createLogEntry(
      'operation',
      `Advertencia: ${message}`,
      { message, data },
      'warn'
    );
    
    this.logs.push(log);
    await StorageUtils.addLog(log);
    
    console.warn(`[WARNING] ${message}`, data);
  }

  /**
   * Obtiene todos los logs
   */
  async getLogs(): Promise<LogEntry[]> {
    return await StorageUtils.getLogs();
  }

  /**
   * Obtiene logs por tipo
   */
  async getLogsByType(type: LogEntry['type']): Promise<LogEntry[]> {
    const allLogs = await this.getLogs();
    return allLogs.filter(log => log.type === type);
  }

  /**
   * Obtiene logs por nivel
   */
  async getLogsByLevel(level: LogEntry['level']): Promise<LogEntry[]> {
    const allLogs = await this.getLogs();
    return allLogs.filter(log => log.level === level);
  }

  /**
   * Limpia todos los logs
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    await StorageUtils.clearLogs();
  }

  /**
   * Exporta logs en formato JSON
   */
  async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Formatea un log para mostrar
   */
  formatLog(log: LogEntry): string {
    const date = new Date(log.timestamp).toLocaleString();
    const level = log.level.toUpperCase().padEnd(5);
    const type = log.type.toUpperCase().padEnd(10);
    
    return `[${date}] ${level} ${type} ${log.message}`;
  }

  /**
   * Obtiene estadísticas de logs
   */
  async getLogStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    errors: number;
    warnings: number;
  }> {
    const logs = await this.getLogs();
    
    const stats = {
      total: logs.length,
      byType: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      errors: 0,
      warnings: 0
    };

    logs.forEach(log => {
      // Por tipo
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      
      // Por nivel
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Errores y advertencias
      if (log.level === 'error') stats.errors++;
      if (log.level === 'warn') stats.warnings++;
    });

    return stats;
  }
}
