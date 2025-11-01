import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { Network } from '../types';

export const NetworkSelector: React.FC = () => {
  const { networks, currentNetwork, switchNetwork } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  const handleNetworkSelect = async (chainId: string) => {
    try {
      await switchNetwork(chainId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error al cambiar red:', error);
    }
  };

  const getNetworkIcon = (network: Network) => {
    if (network.chainId === '1') return '🌐'; // Ethereum Mainnet
    if (network.chainId === '11155111') return '🧪'; // Sepolia
    if (network.chainId === '31337') return '🔧'; // Anvil
    return '🔗'; // Default
  };

  const getNetworkStatus = (network: Network) => {
    if (network.chainId === '31337') return 'Local';
    if (network.isTestnet) return 'Testnet';
    return 'Mainnet';
  };

  return (
    <div className="network-selector">
      <button 
        className="network-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="network-info">
          <div className="network-icon">{currentNetwork ? getNetworkIcon(currentNetwork) : '🔗'}</div>
          <div className="network-details">
            <div className="network-name">{currentNetwork?.name || 'Sin red'}</div>
            <div className="network-chain-id">Chain ID: {currentNetwork?.chainId || 'N/A'}</div>
          </div>
        </div>
        <div className="dropdown-arrow">
          {isOpen ? '▲' : '▼'}
        </div>
      </button>
      
      {isOpen && (
        <div className="network-dropdown">
          <div className="dropdown-header">
            <h3>Seleccionar Red</h3>
            <button 
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="network-list">
            {networks.map((network) => (
              <button
                key={network.chainId}
                className={`network-item ${currentNetwork?.chainId === network.chainId ? 'active' : ''}`}
                onClick={() => handleNetworkSelect(network.chainId)}
              >
                <div className="network-item-icon">{getNetworkIcon(network)}</div>
                <div className="network-item-info">
                  <div className="network-item-name">{network.name}</div>
                  <div className="network-item-details">
                    <span className="network-item-chain-id">Chain ID: {network.chainId}</span>
                    <span className="network-item-status">{getNetworkStatus(network)}</span>
                  </div>
                </div>
                {currentNetwork?.chainId === network.chainId && (
                  <div className="network-item-check">✓</div>
                )}
              </button>
            ))}
          </div>
          
          <div className="dropdown-footer">
            <p>Total: {networks.length} redes</p>
          </div>
        </div>
      )}
    </div>
  );
};
