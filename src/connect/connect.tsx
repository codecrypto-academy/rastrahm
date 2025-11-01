import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletProvider, useWallet } from '../components/WalletProvider';
import { Header } from '../components/Header';
import { AccountSelector } from '../components/AccountSelector';
import { NetworkSelector } from '../components/NetworkSelector';
import './connect.css';

const ConnectContent: React.FC = () => {
  const { state, currentAccount, currentNetwork, isLoading } = useWallet();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    // Simular solicitudes pendientes
    const interval = setInterval(() => {
      setPendingRequests(Math.floor(Math.random() * 5));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="connect-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!state.isUnlocked) {
    return (
      <div className="connect-container">
        <div className="error-state">
          <div className="error-icon">🔒</div>
          <h2>Wallet Bloqueado</h2>
          <p>El wallet no está desbloqueado. Por favor, abre el popup principal para configurar el wallet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="connect-container">
      <Header title="Conexión dApp" />
      
      <div className="connect-content">
        <div className="connection-status">
          <div className="status-header">
            <h3>Estado de Conexión</h3>
            <div className={`status-badge ${state.isConnected ? 'connected' : 'disconnected'}`}>
              {state.isConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
          
          <div className="status-info">
            <div className="info-item">
              <span className="info-label">Cuenta:</span>
              <span className="info-value">
                {currentAccount ? currentAccount.name : 'Sin cuenta'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Red:</span>
              <span className="info-value">
                {currentNetwork ? currentNetwork.name : 'Sin red'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Solicitudes pendientes:</span>
              <span className="info-value pending">
                {pendingRequests}
              </span>
            </div>
          </div>
        </div>

        <div className="account-section">
          <h3>Cuenta Actual</h3>
          <AccountSelector />
        </div>

        <div className="network-section">
          <h3>Red Actual</h3>
          <NetworkSelector />
        </div>

        <div className="actions-section">
          <h3>Acciones</h3>
          <div className="action-buttons">
            <button className="action-button primary">
              🔗 Conectar dApp
            </button>
            <button className="action-button secondary">
              🔄 Sincronizar
            </button>
            <button className="action-button danger">
              🚫 Desconectar
            </button>
          </div>
        </div>

        <div className="requests-section">
          <h3>Solicitudes Pendientes</h3>
          {pendingRequests > 0 ? (
            <div className="requests-list">
              {Array.from({ length: pendingRequests }, (_, i) => (
                <div key={i} className="request-item">
                  <div className="request-info">
                    <div className="request-type">eth_requestAccounts</div>
                    <div className="request-origin">dapp.example.com</div>
                  </div>
                  <div className="request-actions">
                    <button className="approve-button">✓</button>
                    <button className="reject-button">✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-requests">
              No hay solicitudes pendientes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Connect: React.FC = () => {
  return (
    <WalletProvider>
      <ConnectContent />
    </WalletProvider>
  );
};

// Renderizar la aplicación
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Connect />);
}
