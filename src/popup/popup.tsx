import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletProvider, useWallet } from '../components/WalletProvider';
import { Header } from '../components/Header';
import { WalletSetup } from '../components/WalletSetup';
import { AccountSelector } from '../components/AccountSelector';
import { NetworkSelector } from '../components/NetworkSelector';
import { TransactionForm } from '../components/TransactionForm';
import { LogsViewer } from '../components/LogsViewer';
import './popup.css';

const PopupContent: React.FC = () => {
  const { state, isLoading, currentAccount, loadWalletState, resetWallet } = useWallet();
  const [activeTab, setActiveTab] = useState<'wallet' | 'send' | 'logs' | 'settings'>('wallet');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [showImportAccount, setShowImportAccount] = useState(false);
  const [importAccountName, setImportAccountName] = useState('');
  const [importPrivateKey, setImportPrivateKey] = useState('');

  // Aplicar idioma cuando se carga el componente o cambia el idioma
  React.useEffect(() => {
    updateInterfaceLanguage(language);
  }, [language]);

  // Aplicar tema cuando se carga el componente o cambia el tema
  React.useEffect(() => {
    document.body.className = `theme-${theme}`;
    const popupContainer = document.querySelector('.popup-container');
    if (popupContainer) {
      popupContainer.className = `popup-container theme-${theme}`;
    }
  }, [theme]);

  // Re-aplicar idioma cuando cambia la pestaña activa
  React.useEffect(() => {
    updateInterfaceLanguage(language);
  }, [activeTab, language]);

  const handleSync = async () => {
    try {
      await loadWalletState();
    } catch (error) {
      console.error('Error al sincronizar:', error);
    }
  };

  const handleCopyAddress = async () => {
    if (currentAccount?.address) {
      try {
        await navigator.clipboard.writeText(currentAccount.address);
        // Aquí podrías agregar una notificación de éxito
      } catch (error) {
        console.error('Error al copiar dirección:', error);
      }
    }
  };

  const handleViewBalance = () => {
    if (currentAccount) {
      alert(`Balance: ${currentAccount.balance} ETH`);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    try {
      setTheme(newTheme);
      console.log('Tema cambiado a:', newTheme);
    } catch (error) {
      console.error('Error al cambiar tema:', error);
    }
  };

  const handleLanguageChange = async (newLanguage: 'es' | 'en') => {
    try {
      setLanguage(newLanguage);
      console.log('Idioma cambiado a:', newLanguage);
    } catch (error) {
      console.error('Error al cambiar idioma:', error);
    }
  };

  const updateInterfaceLanguage = (lang: 'es' | 'en') => {
    const translations = {
      es: {
        wallet: '💼 Wallet',
        send: '💸 Enviar',
        logs: '📋 Logs',
        config: '⚙️ Config',
        currentAccount: 'Cuenta Actual',
        currentNetwork: 'Red Actual',
        quickActions: 'Acciones Rápidas',
        viewBalance: '📊 Ver Balance',
        sync: '🔄 Sincronizar',
        copyAddress: '📋 Copiar Dirección',
        walletConfig: 'Configuración del Wallet',
        theme: 'Tema',
        light: 'Claro',
        dark: 'Oscuro',
        language: 'Idioma',
        spanish: 'Español',
        english: 'English',
        networks: 'Redes',
        addNetwork: '➕ Agregar Red',
        accounts: 'Cuentas',
        importAccount: '🔑 Importar Cuenta',
        security: 'Seguridad',
        closeSession: '🔒 Cerrar Sesión',
        resetWallet: '🗑️ Resetear Wallet',
        // Send tab
        sendTransaction: 'Enviar Transacción',
        balance: 'Balance',
        destinationAddress: 'Dirección de destino',
        amount: 'Monto (ETH)',
        gasLimit: 'Límite de Gas',
        useEIP1559: 'Usar EIP-1559 (Gas dinámico)',
        maxFeePerGas: 'Max Fee Per Gas (Gwei)',
        maxPriorityFeePerGas: 'Max Priority Fee Per Gas (Gwei)',
        gasPrice: 'Gas Price (Gwei)',
        data: 'Datos (opcional)',
        sending: 'Enviando...',
        sendTransactionButton: 'Enviar Transacción',
        // Transaction confirmation modal
        confirmTransaction: 'Confirmar Transacción',
        fromAddress: 'Desde:',
        toAddress: 'Hacia:',
        amountLabel: 'Monto:',
        dataLabel: 'Datos:',
        cancel: 'Cancelar',
        confirmSend: 'Confirmar Envío',
        // Logs tab
        systemLogs: 'Logs del Sistema',
        export: '📥 Exportar',
        clear: '🗑️ Limpiar',
        total: 'Total',
        errors: 'Errores',
        warnings: 'Advertencias',
        calls: 'Llamadas',
        events: 'Eventos',
        operations: 'Operaciones',
        type: 'Tipo',
        level: 'Nivel',
        search: 'Buscar',
        all: 'Todos',
        info: 'Info',
        warning: 'Advertencia',
        error: 'Error',
        searchLogs: 'Buscar en logs...',
        noLogsAvailable: 'No hay logs disponibles',
        noLogsFound: 'No se encontraron logs con los filtros aplicados'
      },
      en: {
        wallet: '💼 Wallet',
        send: '💸 Send',
        logs: '📋 Logs',
        config: '⚙️ Config',
        currentAccount: 'Current Account',
        currentNetwork: 'Current Network',
        quickActions: 'Quick Actions',
        viewBalance: '📊 View Balance',
        sync: '🔄 Sync',
        copyAddress: '📋 Copy Address',
        walletConfig: 'Wallet Configuration',
        theme: 'Theme',
        light: 'Light',
        dark: 'Dark',
        language: 'Language',
        spanish: 'Español',
        english: 'English',
        networks: 'Networks',
        addNetwork: '➕ Add Network',
        accounts: 'Accounts',
        importAccount: '🔑 Import Account',
        security: 'Security',
        closeSession: '🔒 Close Session',
        resetWallet: '🗑️ Reset Wallet',
        // Send tab
        sendTransaction: 'Send Transaction',
        balance: 'Balance',
        destinationAddress: 'Destination Address',
        amount: 'Amount (ETH)',
        gasLimit: 'Gas Limit',
        useEIP1559: 'Use EIP-1559 (Dynamic Gas)',
        maxFeePerGas: 'Max Fee Per Gas (Gwei)',
        maxPriorityFeePerGas: 'Max Priority Fee Per Gas (Gwei)',
        gasPrice: 'Gas Price (Gwei)',
        data: 'Data (optional)',
        sending: 'Sending...',
        sendTransactionButton: 'Send Transaction',
        // Transaction confirmation modal
        confirmTransaction: 'Confirm Transaction',
        fromAddress: 'From:',
        toAddress: 'To:',
        amountLabel: 'Amount:',
        dataLabel: 'Data:',
        cancel: 'Cancel',
        confirmSend: 'Confirm Send',
        // Logs tab
        systemLogs: 'System Logs',
        export: '📥 Export',
        clear: '🗑️ Clear',
        total: 'Total',
        errors: 'Errors',
        warnings: 'Warnings',
        calls: 'Calls',
        events: 'Events',
        operations: 'Operations',
        type: 'Type',
        level: 'Level',
        search: 'Search',
        all: 'All',
        info: 'Info',
        warning: 'Warning',
        error: 'Error',
        searchLogs: 'Search in logs...',
        noLogsAvailable: 'No logs available',
        noLogsFound: 'No logs found with applied filters'
      }
    };

    const t = translations[lang];
    
    // Actualizar textos de la interfaz
    const elements = {
      'tab-wallet': t.wallet,
      'tab-send': t.send,
      'tab-logs': t.logs,
      'tab-config': t.config,
      'current-account': t.currentAccount,
      'current-network': t.currentNetwork,
      'quick-actions': t.quickActions,
      'view-balance': t.viewBalance,
      'sync': t.sync,
      'copy-address': t.copyAddress,
      'wallet-config': t.walletConfig,
      'theme-label': t.theme,
      'light-option': t.light,
      'dark-option': t.dark,
      'language-label': t.language,
      'spanish-option': t.spanish,
      'english-option': t.english,
      'networks': t.networks,
      'add-network': t.addNetwork,
      'accounts': t.accounts,
      'import-account': t.importAccount,
      'security': t.security,
      'close-session': t.closeSession,
      'reset-wallet': t.resetWallet,
      // Send tab elements
      'send-transaction-title': t.sendTransaction,
      'balance-info': t.balance,
      'destination-address': t.destinationAddress,
      'amount-eth': t.amount,
      'gas-limit': t.gasLimit,
      'use-eip1559': t.useEIP1559,
      'max-fee-per-gas': t.maxFeePerGas,
      'max-priority-fee-per-gas': t.maxPriorityFeePerGas,
      'gas-price': t.gasPrice,
      'data-optional': t.data,
      'sending': t.sending,
      'send-transaction-button': t.sendTransactionButton,
      // Transaction confirmation modal elements
      'confirm-transaction': t.confirmTransaction,
      'from-address': t.fromAddress,
      'to-address': t.toAddress,
      'amount': t.amountLabel,
      'data': t.dataLabel,
      'cancel': t.cancel,
      'confirm-send': t.confirmSend,
      // Logs tab elements
      'system-logs': t.systemLogs,
      'export-logs': t.export,
      'clear-logs': t.clear,
      'total-logs': t.total,
      'errors-logs': t.errors,
      'warnings-logs': t.warnings,
      'calls-logs': t.calls,
      'events-logs': t.events,
      'operations-logs': t.operations,
      'type-filter': t.type,
      'level-filter': t.level,
      'search-filter': t.search,
      'all-filter': t.all,
      'info-level': t.info,
      'warning-level': t.warning,
      'error-level': t.error,
      'search-placeholder': t.searchLogs,
      'no-logs-available': t.noLogsAvailable,
      'no-logs-found': t.noLogsFound,
      'data-label': t.dataLabel
    };

    // Aplicar traducciones con un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      Object.entries(elements).forEach(([id, text]) => {
        const element = document.querySelector(`[data-i18n="${id}"]`);
        if (element) {
          element.textContent = text;
        }
      });
    }, 10);
  };

  const handleAddNetwork = () => {
    setShowAddNetwork(true);
  };

  const handleCloseSession = () => {
    // Implementar cierre de sesión
    window.close();
  };

  const handleResetWallet = async () => {
    if (confirm('¿Estás seguro de que quieres resetear el wallet? Esta acción no se puede deshacer.')) {
      try {
        await resetWallet();
        alert('Wallet reseteado correctamente');
      } catch (error) {
        console.error('Error al resetear wallet:', error);
        alert('Error al resetear el wallet');
      }
    }
  };

  const handleImportAccount = () => {
    setShowImportAccount(true);
  };

  const handleConfirmImportAccount = async () => {
    if (!importPrivateKey.trim()) {
      alert('Por favor, ingresa una clave privada válida');
      return;
    }

    if (!importPrivateKey.startsWith('0x') || importPrivateKey.length !== 66) {
      alert('La clave privada debe tener el formato 0x seguido de 64 caracteres hexadecimales');
      return;
    }

    try {
      // Calcular la dirección en el popup usando ethers (aquí sí funciona)
      const { ethers } = await import('ethers');
      const wallet = new ethers.Wallet(importPrivateKey.trim());
      const address = wallet.address;

      // Enviar al background tanto la clave privada como la dirección calculada
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_ACCOUNT',
        data: {
          privateKey: importPrivateKey.trim(),
          address: address, // Incluir la dirección ya calculada
          accountName: importAccountName || `Account ${Date.now()}`
        }
      });

      if (response.success) {
        alert('Cuenta importada correctamente');
        setShowImportAccount(false);
        setImportAccountName('');
        setImportPrivateKey('');
        // Recargar el estado del wallet
        await loadWalletState();
      } else {
        alert(`Error al importar cuenta: ${response.error}`);
      }
    } catch (error) {
      console.error('Error al importar cuenta:', error);
      alert('Error al importar la cuenta: ' + (error as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="popup-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Cargando wallet...</p>
        </div>
      </div>
    );
  }

  if (!state.isUnlocked) {
    return (
      <div className="popup-container">
        <Header title="CodeCrypto Wallet" showNetwork={false} showAccount={false} />
        <WalletSetup onComplete={() => setActiveTab('wallet')} />
      </div>
    );
  }

  return (
    <div className="popup-container">
      <Header title="CodeCrypto Wallet" />
      
      <div className="popup-tabs">
        <button 
          className={`tab-button ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallet')}
          data-i18n="tab-wallet"
        >
          💼 Wallet
        </button>
        <button 
          className={`tab-button ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
          data-i18n="tab-send"
        >
          💸 Enviar
        </button>
        <button 
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
          data-i18n="tab-logs"
        >
          📋 Logs
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          data-i18n="tab-config"
        >
          ⚙️ Config
        </button>
      </div>

      <div className="popup-content">
        {activeTab === 'wallet' && (
          <div className="wallet-tab">
            <div className="wallet-section">
              <h3 data-i18n="current-account">Cuenta Actual</h3>
              <AccountSelector />
            </div>
            
            <div className="wallet-section">
              <h3 data-i18n="current-network">Red Actual</h3>
              <NetworkSelector />
            </div>
            
            <div className="wallet-section">
              <h3 data-i18n="quick-actions">Acciones Rápidas</h3>
              <div className="quick-actions">
                <button className="action-button" onClick={handleViewBalance} data-i18n="view-balance">
                  📊 Ver Balance
                </button>
                <button className="action-button" onClick={handleSync} data-i18n="sync">
                  🔄 Sincronizar
                </button>
                <button className="action-button" onClick={handleCopyAddress} data-i18n="copy-address">
                  📋 Copiar Dirección
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'send' && (
          <div className="send-tab">
            <TransactionForm />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-tab">
            <LogsViewer />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <div className="settings-section">
              <h3 data-i18n="wallet-config">Configuración del Wallet</h3>
              <div className="setting-item">
                <label data-i18n="theme-label">Tema</label>
                <select 
                  value={theme} 
                  onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
                >
                  <option value="light" data-i18n="light-option">Claro</option>
                  <option value="dark" data-i18n="dark-option">Oscuro</option>
                </select>
              </div>
              <div className="setting-item">
                <label data-i18n="language-label">Idioma</label>
                <select 
                  value={language} 
                  onChange={(e) => handleLanguageChange(e.target.value as 'es' | 'en')}
                >
                  <option value="es" data-i18n="spanish-option">Español</option>
                  <option value="en" data-i18n="english-option">English</option>
                </select>
              </div>
            </div>
            
            <div className="settings-section">
              <h3 data-i18n="networks">Redes</h3>
              <button className="action-button" onClick={handleAddNetwork} data-i18n="add-network">
                ➕ Agregar Red
              </button>
              {showAddNetwork && (
                <div className="add-network-form">
                  <h4>Agregar Nueva Red</h4>
                  <div className="form-group">
                    <label>Nombre de la Red:</label>
                    <input type="text" placeholder="Ej: Ethereum Mainnet" />
                  </div>
                  <div className="form-group">
                    <label>RPC URL:</label>
                    <input type="text" placeholder="https://mainnet.infura.io/v3/YOUR_KEY" />
                  </div>
                  <div className="form-group">
                    <label>Chain ID:</label>
                    <input type="number" placeholder="1" />
                  </div>
                  <div className="form-group">
                    <label>Símbolo:</label>
                    <input type="text" placeholder="ETH" />
                  </div>
                  <div className="form-actions">
                    <button className="action-button" onClick={() => setShowAddNetwork(false)}>
                      Cancelar
                    </button>
                    <button className="action-button primary">
                      Agregar Red
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="settings-section">
              <h3 data-i18n="accounts">Cuentas</h3>
              <button className="action-button" onClick={handleImportAccount} data-i18n="import-account">
                🔑 Importar Cuenta
              </button>
              {showImportAccount && (
                <div className="import-account-form">
                  <h4>Importar Cuenta con Clave Privada</h4>
                  <div className="form-group">
                    <label>Nombre de la Cuenta:</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Mi Cuenta Importada" 
                      value={importAccountName}
                      onChange={(e) => setImportAccountName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Clave Privada:</label>
                    <input 
                      type="password" 
                      placeholder="0x..." 
                      value={importPrivateKey}
                      onChange={(e) => setImportPrivateKey(e.target.value)}
                    />
                  </div>
                  <div className="form-actions">
                    <button className="action-button" onClick={() => setShowImportAccount(false)}>
                      Cancelar
                    </button>
                    <button className="action-button primary" onClick={handleConfirmImportAccount}>
                      Importar Cuenta
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="settings-section">
              <h3 data-i18n="security">Seguridad</h3>
              <button className="action-button danger" onClick={handleCloseSession} data-i18n="close-session">
                🔒 Cerrar Sesión
              </button>
              <button className="action-button danger" onClick={handleResetWallet} data-i18n="reset-wallet">
                🗑️ Resetear Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Popup: React.FC = () => {
  return (
    <WalletProvider>
      <PopupContent />
    </WalletProvider>
  );
};

// Renderizar la aplicación
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
