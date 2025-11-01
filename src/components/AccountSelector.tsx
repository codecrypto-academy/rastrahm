import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { CryptoUtils } from '../utils/crypto';

export const AccountSelector: React.FC = () => {
  const { accounts, currentAccount, switchAccount } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [displayBalance, setDisplayBalance] = useState('0.00');

  // Actualizar el balance cuando cambie la cuenta actual
  React.useEffect(() => {
    if (currentAccount?.balance) {
      const formatted = formatBalance(currentAccount.balance);
      setDisplayBalance(formatted);
    } else {
      setDisplayBalance('0.00');
    }
  }, [currentAccount?.balance, currentAccount?.address]);

  const handleAccountSelect = async (accountIndex: number) => {
    try {
      await switchAccount(accountIndex);
      setIsOpen(false);
    } catch (error) {
      console.error('Error al cambiar cuenta:', error);
    }
  };

  const formatAddress = (address: string) => {
    return CryptoUtils.formatAddress(address);
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
      console.error('Error al formatear balance:', error);
      return '0.00';
    }
  };

  return (
    <div className="account-selector">
      <button 
        className="account-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="account-info">
          <div className="account-name">{currentAccount?.name || 'Sin cuenta'}</div>
          <div className="account-address">{currentAccount ? formatAddress(currentAccount.address) : ''}</div>
        </div>
        <div className="account-balance">
          {displayBalance} ETH
        </div>
        <div className="dropdown-arrow">
          {isOpen ? '▲' : '▼'}
        </div>
      </button>
      
      {isOpen && (
        <div className="account-dropdown">
          <div className="dropdown-header">
            <h3>Seleccionar Cuenta</h3>
            <button 
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="account-list">
            {accounts.map((account, index) => (
              <button
                key={account.address}
                className={`account-item ${currentAccount?.address === account.address ? 'active' : ''}`}
                onClick={() => handleAccountSelect(index)}
              >
                <div className="account-item-info">
                  <div className="account-item-name">{account.name}</div>
                  <div className="account-item-address">{formatAddress(account.address)}</div>
                </div>
                <div className="account-item-balance">
                  {formatBalance(account.balance)} ETH
                </div>
                {currentAccount?.address === account.address && (
                  <div className="account-item-check">✓</div>
                )}
              </button>
            ))}
          </div>
          
          <div className="dropdown-footer">
            <p>Total: {accounts.length} cuentas</p>
          </div>
        </div>
      )}
    </div>
  );
};
