import React from 'react';
import { useWallet } from './WalletProvider';

interface HeaderProps {
  title: string;
  showNetwork?: boolean;
  showAccount?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showNetwork = true, showAccount = true }) => {
  const { currentAccount, currentNetwork, state } = useWallet();

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    if (!balance || balance === '0x0' || balance === '0') return '0.00';
    
    try {
      // Convertir de hexadecimal a decimal
      const hexBalance = balance.startsWith('0x') ? balance.slice(2) : balance;
      const weiBalance = BigInt('0x' + hexBalance);
      
      // Convertir de wei a ETH (1 ETH = 10^18 wei)
      const ethBalance = Number(weiBalance) / Math.pow(10, 18);
      
      return ethBalance.toFixed(4);
    } catch (error) {
      console.error('Error al formatear balance en Header:', error);
      return '0.00';
    }
  };

  return (
    <div className="header">
      <div className="header-top">
        <h1 className="header-title">{title}</h1>
        <div className="header-status">
          <div className={`status-indicator ${state.isUnlocked ? 'connected' : 'disconnected'}`}>
            {state.isUnlocked ? '🔓' : '🔒'}
          </div>
        </div>
      </div>
      
      {showAccount && currentAccount && (
        <div className="header-account">
          <div className="account-info">
            <div className="account-name">{currentAccount.name}</div>
            <div className="account-address">{formatAddress(currentAccount.address)}</div>
          </div>
          <div className="account-balance">
            {formatBalance(currentAccount.balance)} ETH
          </div>
        </div>
      )}
      
      {showNetwork && currentNetwork && (
        <div className="header-network">
          <div className="network-info">
            <div className="network-name">{currentNetwork.name}</div>
            <div className="network-chain-id">Chain ID: {currentNetwork.chainId}</div>
          </div>
          <div className="network-status">
            <div className="status-dot"></div>
          </div>
        </div>
      )}
    </div>
  );
};
