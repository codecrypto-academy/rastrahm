import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletProvider';
import { LogEntry } from '../types';

export const LogsViewer: React.FC = () => {
  const { logs, loadLogs, clearLogs } = useWallet();
  const [filter, setFilter] = useState<'all' | 'call' | 'event' | 'error' | 'operation'>('all');
  const [level, setLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar logs al montar el componente
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.type === filter;
    const matchesLevel = level === 'all' || log.level === level;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.data || {}).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesLevel && matchesSearch;
  });

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLogIcon = (type: string, level: string) => {
    if (level === 'error') return '❌';
    if (level === 'warn') return '⚠️';
    if (type === 'call') return '📞';
    if (type === 'event') return '📡';
    if (type === 'operation') return '⚙️';
    return 'ℹ️';
  };

  const getLogColor = (level: string) => {
    if (level === 'error') return 'error';
    if (level === 'warn') return 'warning';
    return 'info';
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codecrypto-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStats = () => {
    const total = logs.length;
    const errors = logs.filter(log => log.level === 'error').length;
    const warnings = logs.filter(log => log.level === 'warn').length;
    const calls = logs.filter(log => log.type === 'call').length;
    const events = logs.filter(log => log.type === 'event').length;
    const operations = logs.filter(log => log.type === 'operation').length;

    return { total, errors, warnings, calls, events, operations };
  };

  const stats = getStats();

  return (
    <div className="logs-viewer">
      <div className="logs-header">
        <h3 data-i18n="system-logs">Logs del Sistema</h3>
        <div className="logs-actions">
          <button 
            className="refresh-button"
            onClick={loadLogs}
            data-i18n="refresh-logs"
          >
            🔄 Refrescar
          </button>
          <button 
            className="export-button"
            onClick={exportLogs}
            disabled={filteredLogs.length === 0}
            data-i18n="export-logs"
          >
            📥 Exportar
          </button>
          <button 
            className="clear-button"
            onClick={clearLogs}
            disabled={logs.length === 0}
            data-i18n="clear-logs"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      <div className="logs-stats">
        <div className="stat-item">
          <span className="stat-label" data-i18n="total-logs">Total:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label" data-i18n="errors-logs">Errores:</span>
          <span className="stat-value error">{stats.errors}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label" data-i18n="warnings-logs">Advertencias:</span>
          <span className="stat-value warning">{stats.warnings}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label" data-i18n="calls-logs">Llamadas:</span>
          <span className="stat-value">{stats.calls}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label" data-i18n="events-logs">Eventos:</span>
          <span className="stat-value">{stats.events}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label" data-i18n="operations-logs">Operaciones:</span>
          <span className="stat-value">{stats.operations}</span>
        </div>
      </div>

      <div className="logs-filters">
        <div className="filter-group">
          <label htmlFor="type-filter" data-i18n="type-filter">Tipo:</label>
          <select
            id="type-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all" data-i18n="all-filter">Todos</option>
            <option value="call" data-i18n="calls-logs">Llamadas</option>
            <option value="event" data-i18n="events-logs">Eventos</option>
            <option value="error" data-i18n="errors-logs">Errores</option>
            <option value="operation" data-i18n="operations-logs">Operaciones</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="level-filter" data-i18n="level-filter">Nivel:</label>
          <select
            id="level-filter"
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
          >
            <option value="all" data-i18n="all-filter">Todos</option>
            <option value="info" data-i18n="info-level">Info</option>
            <option value="warn" data-i18n="warning-level">Advertencia</option>
            <option value="error" data-i18n="error-level">Error</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="search" data-i18n="search-filter">Buscar:</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en logs..."
            data-i18n-placeholder="search-placeholder"
          />
        </div>
      </div>

      <div className="logs-list">
        {filteredLogs.length === 0 ? (
          <div className="no-logs">
            {logs.length === 0 ? <span data-i18n="no-logs-available">No hay logs disponibles</span> : <span data-i18n="no-logs-found">No se encontraron logs con los filtros aplicados</span>}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className={`log-entry ${getLogColor(log.level)}`}>
              <div className="log-header">
                <div className="log-icon">{getLogIcon(log.type, log.level)}</div>
                <div className="log-info">
                  <div className="log-type">{log.type.toUpperCase()}</div>
                  <div className="log-level">{log.level.toUpperCase()}</div>
                </div>
                <div className="log-timestamp">{formatTimestamp(log.timestamp)}</div>
              </div>
              
              <div className="log-message">{log.message}</div>
              
              {log.data && (
                <div className="log-data">
                  <details>
                    <summary data-i18n="data-label">Datos</summary>
                    <pre>{JSON.stringify(log.data, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
