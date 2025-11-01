import React from 'react';

interface TransactionConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: {
    to: string;
    value: string;
    gasLimit: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    data: string;
  };
  fromAddress: string;
  isLoading: boolean;
}

export const TransactionConfirmation: React.FC<TransactionConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  fromAddress,
  isLoading
}) => {
  if (!isOpen) return null;

  const formatValue = (value: string) => {
    if (!value || value === '0') return '0.0000';
    try {
      const num = parseFloat(value);
      return num.toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="transaction-confirmation-overlay">
      <div className="transaction-confirmation-modal">
        <div className="modal-header">
          <h3 data-i18n="confirm-transaction">Confirmar Transacción</h3>
          <button 
            className="close-button" 
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="transaction-details">
            <div className="detail-row">
              <span className="label" data-i18n="from-address">Desde:</span>
              <span className="value">{formatAddress(fromAddress)}</span>
            </div>
            
            <div className="detail-row">
              <span className="label" data-i18n="to-address">Hacia:</span>
              <span className="value">{formatAddress(transaction.to)}</span>
            </div>
            
            <div className="detail-row">
              <span className="label" data-i18n="amount">Monto:</span>
              <span className="value">{formatValue(transaction.value)} ETH</span>
            </div>
            
            <div className="detail-row">
              <span className="label" data-i18n="gas-limit">Límite de Gas:</span>
              <span className="value">{transaction.gasLimit}</span>
            </div>
            
            {transaction.gasPrice && (
              <div className="detail-row">
                <span className="label" data-i18n="gas-price">Gas Price:</span>
                <span className="value">{transaction.gasPrice} Gwei</span>
              </div>
            )}
            
            {transaction.maxFeePerGas && (
              <div className="detail-row">
                <span className="label" data-i18n="max-fee-per-gas">Max Fee Per Gas:</span>
                <span className="value">{transaction.maxFeePerGas} Gwei</span>
              </div>
            )}
            
            {transaction.maxPriorityFeePerGas && (
              <div className="detail-row">
                <span className="label" data-i18n="max-priority-fee-per-gas">Max Priority Fee Per Gas:</span>
                <span className="value">{transaction.maxPriorityFeePerGas} Gwei</span>
              </div>
            )}
            
            {transaction.data && transaction.data !== '0x' && (
              <div className="detail-row">
                <span className="label" data-i18n="data">Datos:</span>
                <span className="value data-value">{transaction.data}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isLoading}
          >
            <span data-i18n="cancel">Cancelar</span>
          </button>
          <button 
            className="confirm-button" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span data-i18n="sending">Enviando...</span>
            ) : (
              <span data-i18n="confirm-send">Confirmar Envío</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
