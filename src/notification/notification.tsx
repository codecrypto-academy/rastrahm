import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletProvider, useWallet } from '../components/WalletProvider';
import { Header } from '../components/Header';
import { LogsViewer } from '../components/LogsViewer';
import './notification.css';

const NotificationContent: React.FC = () => {
  const { state, isLoading } = useWallet();
  const [activeTab, setActiveTab] = useState<'notifications' | 'logs' | 'errors'>('notifications');
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Simular notificaciones
    const mockNotifications = [
      {
        id: '1',
        type: 'transaction',
        title: 'Transacción Enviada',
        message: 'Transacción 0x1234... enviada exitosamente',
        timestamp: Date.now() - 1000 * 60 * 5,
        data: { hash: '0x1234567890abcdef' }
      },
      {
        id: '2',
        type: 'connection',
        title: 'dApp Conectada',
        message: 'Uniswap se conectó a tu wallet',
        timestamp: Date.now() - 1000 * 60 * 15,
        data: { origin: 'app.uniswap.org' }
      },
      {
        id: '3',
        type: 'error',
        title: 'Error de Transacción',
        message: 'Transacción falló: Gas insuficiente',
        timestamp: Date.now() - 1000 * 60 * 30,
        data: { error: 'insufficient gas' }
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${days} días`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction': return '💸';
      case 'connection': return '🔗';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'transaction': return 'success';
      case 'connection': return 'info';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="notification-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Cargando notificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-container">
      <Header title="Notificaciones" showNetwork={false} showAccount={false} />
      
      <div className="notification-tabs">
        <button 
          className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notificaciones
        </button>
        <button 
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Logs
        </button>
        <button 
          className={`tab-button ${activeTab === 'errors' ? 'active' : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          ❌ Errores
        </button>
      </div>

      <div className="notification-content">
        {activeTab === 'notifications' && (
          <div className="notifications-tab">
            <div className="notifications-header">
              <h3>Notificaciones Recientes</h3>
              <button className="clear-button">
                🗑️ Limpiar
              </button>
            </div>
            
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  No hay notificaciones
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${getNotificationColor(notification.type)}`}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-time">
                          {formatTimestamp(notification.timestamp)}
                        </div>
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      {notification.data && (
                        <div className="notification-data">
                          <details>
                            <summary>Detalles</summary>
                            <pre>{JSON.stringify(notification.data, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-tab">
            <LogsViewer />
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="errors-tab">
            <div className="errors-header">
              <h3>Errores del Sistema</h3>
              <button className="clear-button">
                🗑️ Limpiar
              </button>
            </div>
            
            <div className="errors-list">
              <div className="error-item">
                <div className="error-icon">❌</div>
                <div className="error-content">
                  <div className="error-title">Error de Transacción</div>
                  <div className="error-message">Gas insuficiente para la transacción</div>
                  <div className="error-time">Hace 30 min</div>
                </div>
              </div>
              
              <div className="error-item">
                <div className="error-icon">⚠️</div>
                <div className="error-content">
                  <div className="error-title">Advertencia de Red</div>
                  <div className="error-message">Conexión lenta a la red</div>
                  <div className="error-time">Hace 1 h</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Notification: React.FC = () => {
  return (
    <WalletProvider>
      <NotificationContent />
    </WalletProvider>
  );
};

// Renderizar la aplicación
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Notification />);
}
