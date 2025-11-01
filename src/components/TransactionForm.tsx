import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { ValidationUtils } from '../utils/validation';
import { ethers } from 'ethers';
import { TransactionConfirmation } from './TransactionConfirmation';

export const TransactionForm: React.FC = () => {
  const { currentAccount, sendTransaction, error, setError } = useWallet();
  const [formData, setFormData] = useState({
    to: '',
    value: '',
    gasLimit: '21000',
    gasPrice: '',
    maxFeePerGas: '',
    maxPriorityFeePerGas: '',
    data: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [useEIP1559, setUseEIP1559] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentAccount) {
      setError('No hay cuenta seleccionada');
      return;
    }

    try {
      setError(null);

      // Validar dirección de destino
      const addressValidation = ValidationUtils.validateAddress(formData.to);
      if (!addressValidation.isValid) {
        setError(addressValidation.errors.join(', '));
        return;
      }

      // Validar monto
      const amountValidation = ValidationUtils.validateAmount(formData.value, currentAccount.balance);
      if (!amountValidation.isValid) {
        setError(amountValidation.errors.join(', '));
        return;
      }

      // Preparar transacción
      const transaction: any = {
        to: formData.to,
        value: formData.value, // Mantener como string para mostrar en confirmación
        data: formData.data || '0x'
      };

      // Agregar gas
      if (formData.gasLimit) {
        transaction.gas = formData.gasLimit;
      }

      // EIP-1559 o gas price tradicional
      if (useEIP1559) {
        if (formData.maxFeePerGas) {
          transaction.maxFeePerGas = formData.maxFeePerGas;
        }
        if (formData.maxPriorityFeePerGas) {
          transaction.maxPriorityFeePerGas = formData.maxPriorityFeePerGas;
        }
      } else {
        if (formData.gasPrice) {
          transaction.gasPrice = formData.gasPrice;
        }
      }

      // Validar transacción completa
      const transactionValidation = ValidationUtils.validateTransaction(transaction);
      if (!transactionValidation.isValid) {
        setError(transactionValidation.errors.join(', '));
        return;
      }

      // Mostrar modal de confirmación
      setPendingTransaction(transaction);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error al preparar transacción:', error);
      setError('Error al preparar transacción');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!pendingTransaction || !currentAccount) return;

    try {
      setIsLoading(true);
      setError(null);

      // Preparar transacción para envío
      const transactionToSend = {
        ...pendingTransaction,
        value: pendingTransaction.value, // Mantener como string en ETH para el background script
        data: pendingTransaction.data || '0x'
      };

      // Convertir gas price si es necesario
      if (transactionToSend.gasPrice) {
        transactionToSend.gasPrice = ethers.parseUnits(transactionToSend.gasPrice, 'gwei').toString();
      }
      if (transactionToSend.maxFeePerGas) {
        transactionToSend.maxFeePerGas = ethers.parseUnits(transactionToSend.maxFeePerGas, 'gwei').toString();
      }
      if (transactionToSend.maxPriorityFeePerGas) {
        transactionToSend.maxPriorityFeePerGas = ethers.parseUnits(transactionToSend.maxPriorityFeePerGas, 'gwei').toString();
      }

      // Enviar transacción
      const result = await sendTransaction(transactionToSend);
      
      if (result.success) {
        // Limpiar formulario
        setFormData({
          to: '',
          value: '',
          gasLimit: '21000',
          gasPrice: '',
          maxFeePerGas: '',
          maxPriorityFeePerGas: '',
          data: ''
        });
        
        // Cerrar modal
        setShowConfirmation(false);
        setPendingTransaction(null);
        
        // Mostrar éxito
        alert(`Transacción enviada: ${result.hash}`);
      } else {
        setError('Error al enviar transacción');
      }
    } catch (error) {
      console.error('Error al enviar transacción:', error);
      setError('Error al enviar transacción');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTransaction = () => {
    setShowConfirmation(false);
    setPendingTransaction(null);
  };

  const formatBalance = (balance: string) => {
    if (!balance || balance === '0x0' || balance === '0') return '0.00';
    try {
      const hexBalance = balance.startsWith('0x') ? balance.slice(2) : balance;
      const weiBalance = BigInt('0x' + hexBalance);
      const ethBalance = Number(weiBalance) / Math.pow(10, 18);
      return ethBalance.toFixed(4);
    } catch (error) {
      console.error('Error al formatear balance:', error);
      return '0.00';
    }
  };

  return (
    <div className="transaction-form">
      <div className="form-header">
        <h3 data-i18n="send-transaction-title">Enviar Transacción</h3>
        <div className="balance-info">
          <span data-i18n="balance-info">Balance:</span> {currentAccount ? `${formatBalance(currentAccount.balance)} ETH` : '0.00 ETH'}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="to" data-i18n="destination-address">Dirección de destino</label>
          <input
            type="text"
            id="to"
            value={formData.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            placeholder="0x..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="value" data-i18n="amount-eth">Monto (ETH)</label>
          <input
            type="number"
            id="value"
            value={formData.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            placeholder="0.0"
            step="0.0001"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="gasLimit" data-i18n="gas-limit">Límite de Gas</label>
          <input
            type="number"
            id="gasLimit"
            value={formData.gasLimit}
            onChange={(e) => handleInputChange('gasLimit', e.target.value)}
            placeholder="21000"
            min="21000"
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useEIP1559}
              onChange={(e) => setUseEIP1559(e.target.checked)}
            />
            <span data-i18n="use-eip1559">Usar EIP-1559 (Gas dinámico)</span>
          </label>
        </div>

        {useEIP1559 ? (
          <>
            <div className="form-group">
              <label htmlFor="maxFeePerGas" data-i18n="max-fee-per-gas">Max Fee Per Gas (Gwei)</label>
              <input
                type="number"
                id="maxFeePerGas"
                value={formData.maxFeePerGas}
                onChange={(e) => handleInputChange('maxFeePerGas', e.target.value)}
                placeholder="20"
                step="0.1"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxPriorityFeePerGas" data-i18n="max-priority-fee-per-gas">Max Priority Fee Per Gas (Gwei)</label>
              <input
                type="number"
                id="maxPriorityFeePerGas"
                value={formData.maxPriorityFeePerGas}
                onChange={(e) => handleInputChange('maxPriorityFeePerGas', e.target.value)}
                placeholder="2"
                step="0.1"
                min="0"
              />
            </div>
          </>
        ) : (
          <div className="form-group">
            <label htmlFor="gasPrice" data-i18n="gas-price">Gas Price (Gwei)</label>
            <input
              type="number"
              id="gasPrice"
              value={formData.gasPrice}
              onChange={(e) => handleInputChange('gasPrice', e.target.value)}
              placeholder="20"
              step="0.1"
              min="0"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="data" data-i18n="data-optional">Datos (opcional)</label>
          <textarea
            id="data"
            value={formData.data}
            onChange={(e) => handleInputChange('data', e.target.value)}
            placeholder="0x..."
            rows={3}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading || !currentAccount}
        >
          {isLoading ? <span data-i18n="sending">Enviando...</span> : <span data-i18n="send-transaction-button">Enviar Transacción</span>}
        </button>
      </form>

      <TransactionConfirmation
        isOpen={showConfirmation}
        onClose={handleCancelTransaction}
        onConfirm={handleConfirmTransaction}
        transaction={pendingTransaction || {}}
        fromAddress={currentAccount?.address || ''}
        isLoading={isLoading}
      />
    </div>
  );
};
