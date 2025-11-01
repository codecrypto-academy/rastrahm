import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ethers } from 'ethers';
import './test.css';

const TestPage: React.FC = () => {
  const [provider, setProvider] = useState<any>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainId, setChainId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verificar si el provider está disponible
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      setProvider((window as any).ethereum);
    }
  }, []);

  const addTestResult = (test: string, result: boolean, message: string, data?: any) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      result,
      message,
      data,
      timestamp: new Date().toLocaleString()
    }]);
  };

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setIsLoading(true);
    try {
      const result = await testFunction();
      addTestResult(testName, true, 'Prueba exitosa', result);
    } catch (error) {
      addTestResult(testName, false, `Error: ${(error as Error).message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!provider) {
      throw new Error('Provider no disponible');
    }
    
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    setAccounts(accounts);
    setIsConnected(true);
    return accounts;
  };

  const testChainId = async () => {
    if (!provider) {
      throw new Error('Provider no disponible');
    }
    
    const chainId = await provider.request({ method: 'eth_chainId' });
    setChainId(chainId);
    return chainId;
  };

  const testGetBalance = async () => {
    if (!provider || accounts.length === 0) {
      throw new Error('Provider o cuentas no disponibles');
    }
    
    const balance = await provider.request({
      method: 'eth_getBalance',
      params: [accounts[0], 'latest']
    });
    return balance;
  };

  const testGetTransactionCount = async () => {
    if (!provider || accounts.length === 0) {
      throw new Error('Provider o cuentas no disponibles');
    }
    
    const nonce = await provider.request({
      method: 'eth_getTransactionCount',
      params: [accounts[0], 'latest']
    });
    return nonce;
  };

  const testGasPrice = async () => {
    if (!provider) {
      throw new Error('Provider no disponible');
    }
    
    const gasPrice = await provider.request({ method: 'eth_gasPrice' });
    return gasPrice;
  };

  const testBlockNumber = async () => {
    if (!provider) {
      throw new Error('Provider no disponible');
    }
    
    const blockNumber = await provider.request({ method: 'eth_blockNumber' });
    return blockNumber;
  };

  const testSignMessage = async () => {
    if (!provider || accounts.length === 0) {
      throw new Error('Provider o cuentas no disponibles');
    }
    
    const message = 'Hello CodeCrypto Wallet!';
    const signature = await provider.request({
      method: 'eth_sign',
      params: [accounts[0], message]
    });
    return { message, signature };
  };

  const testSignTypedData = async () => {
    if (!provider || accounts.length === 0) {
      throw new Error('Provider o cuentas no disponibles');
    }
    
    const typedData = {
      domain: {
        name: 'CodeCrypto Wallet',
        version: '1',
        chainId: parseInt(chainId, 16),
        verifyingContract: '0x0000000000000000000000000000000000000000'
      },
      types: {
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' }
        ]
      },
      primaryType: 'Person',
      message: {
        name: 'Test User',
        wallet: accounts[0]
      }
    };
    
    const signature = await provider.request({
      method: 'eth_signTypedData_v4',
      params: [accounts[0], JSON.stringify(typedData)]
    });
    return { typedData, signature };
  };

  const testSendTransaction = async () => {
    if (!provider || accounts.length === 0) {
      throw new Error('Provider o cuentas no disponibles');
    }
    
    const transaction = {
      to: accounts[0], // Enviar a la misma cuenta
      value: '0x1', // 1 wei
      gas: '0x5208' // 21000 gas
    };
    
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [transaction]
    });
    return { transaction, txHash };
  };

  const testEstimateGas = async () => {
    if (!provider || accounts.length === 0) {
      throw new Error('Provider o cuentas no disponibles');
    }
    
    const transaction = {
      to: accounts[0],
      value: '0x1',
      data: '0x'
    };
    
    const gas = await provider.request({
      method: 'eth_estimateGas',
      params: [transaction]
    });
    return { transaction, gas };
  };

  const testEvents = async () => {
    if (!provider) {
      throw new Error('Provider no disponible');
    }
    
    let eventCount = 0;
    
    const handleAccountsChanged = (newAccounts: string[]) => {
      eventCount++;
      addTestResult('Event: accountsChanged', true, `Cuentas cambiadas: ${newAccounts.length}`, newAccounts);
    };
    
    const handleChainChanged = (newChainId: string) => {
      eventCount++;
      addTestResult('Event: chainChanged', true, `Red cambiada: ${newChainId}`, newChainId);
    };
    
    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    
    // Simular eventos después de 2 segundos
    setTimeout(() => {
      if (eventCount === 0) {
        addTestResult('Events Setup', true, 'Listeners de eventos configurados correctamente');
      }
    }, 2000);
    
    return Promise.resolve({ eventCount });
  };

  const runAllTests = async () => {
    setTestResults([]);
    
    await runTest('Conexión', testConnection);
    await runTest('Chain ID', testChainId);
    await runTest('Balance', testGetBalance);
    await runTest('Nonce', testGetTransactionCount);
    await runTest('Gas Price', testGasPrice);
    await runTest('Block Number', testBlockNumber);
    await runTest('Firmar Mensaje', testSignMessage);
    await runTest('Firmar Datos Tipados', testSignTypedData);
    await runTest('Estimar Gas', testEstimateGas);
    await runTest('Configurar Eventos', testEvents);
    
    // Solo ejecutar transacción si hay balance suficiente
    try {
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      });
      if (parseInt(balance, 16) > 1000000000000000) { // 0.001 ETH
        await runTest('Enviar Transacción', testSendTransaction);
      } else {
        addTestResult('Enviar Transacción', false, 'Balance insuficiente para enviar transacción');
      }
    } catch (error) {
      addTestResult('Enviar Transacción', false, `Error: ${(error as Error).message}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    if (!balance) return '0';
    const wei = parseInt(balance, 16);
    return ethers.formatEther(wei.toString());
  };

  return (
    <div className="test-container">
      <div className="test-header">
        <h1>🧪 CodeCrypto Wallet - Página de Pruebas</h1>
        <p>Prueba todas las funcionalidades del wallet</p>
      </div>

      <div className="test-content">
        <div className="test-info">
          <div className="info-section">
            <h3>Estado del Provider</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Provider:</span>
                <span className={`info-value ${provider ? 'success' : 'error'}`}>
                  {provider ? 'Disponible' : 'No disponible'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Conectado:</span>
                <span className={`info-value ${isConnected ? 'success' : 'error'}`}>
                  {isConnected ? 'Sí' : 'No'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Chain ID:</span>
                <span className="info-value">{chainId || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Cuentas:</span>
                <span className="info-value">{accounts.length}</span>
              </div>
            </div>
          </div>

          {accounts.length > 0 && (
            <div className="info-section">
              <h3>Cuenta Actual</h3>
              <div className="account-info">
                <div className="account-address">
                  {formatAddress(accounts[0])}
                </div>
                <div className="account-balance">
                  Balance: {formatBalance(accounts[0])} ETH
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="test-actions">
          <h3>Pruebas Disponibles</h3>
          <div className="action-buttons">
            <button 
              className="action-button primary"
              onClick={() => runTest('Conexión', testConnection)}
              disabled={isLoading || !provider}
            >
              🔗 Conectar
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Chain ID', testChainId)}
              disabled={isLoading || !provider}
            >
              🔗 Chain ID
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Balance', testGetBalance)}
              disabled={isLoading || !provider || accounts.length === 0}
            >
              💰 Balance
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Nonce', testGetTransactionCount)}
              disabled={isLoading || !provider || accounts.length === 0}
            >
              🔢 Nonce
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Gas Price', testGasPrice)}
              disabled={isLoading || !provider}
            >
              ⛽ Gas Price
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Block Number', testBlockNumber)}
              disabled={isLoading || !provider}
            >
              📦 Block Number
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Firmar Mensaje', testSignMessage)}
              disabled={isLoading || !provider || accounts.length === 0}
            >
              ✍️ Firmar Mensaje
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Firmar Datos Tipados', testSignTypedData)}
              disabled={isLoading || !provider || accounts.length === 0}
            >
              📝 Firmar EIP-712
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Estimar Gas', testEstimateGas)}
              disabled={isLoading || !provider || accounts.length === 0}
            >
              📊 Estimar Gas
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Enviar Transacción', testSendTransaction)}
              disabled={isLoading || !provider || accounts.length === 0}
            >
              💸 Enviar TX
            </button>
            <button 
              className="action-button"
              onClick={() => runTest('Configurar Eventos', testEvents)}
              disabled={isLoading || !provider}
            >
              📡 Eventos
            </button>
          </div>
          
          <div className="test-controls">
            <button 
              className="action-button success"
              onClick={runAllTests}
              disabled={isLoading || !provider}
            >
              🚀 Ejecutar Todas las Pruebas
            </button>
            <button 
              className="action-button danger"
              onClick={clearResults}
              disabled={isLoading}
            >
              🗑️ Limpiar Resultados
            </button>
          </div>
        </div>

        <div className="test-results">
          <h3>Resultados de las Pruebas</h3>
          {isLoading && (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              <span>Ejecutando prueba...</span>
            </div>
          )}
          
          <div className="results-list">
            {testResults.length === 0 ? (
              <div className="no-results">
                No hay resultados de pruebas. Ejecuta algunas pruebas para ver los resultados.
              </div>
            ) : (
              testResults.map((result) => (
                <div key={result.id} className={`result-item ${result.result ? 'success' : 'error'}`}>
                  <div className="result-header">
                    <div className="result-icon">
                      {result.result ? '✅' : '❌'}
                    </div>
                    <div className="result-info">
                      <div className="result-test">{result.test}</div>
                      <div className="result-message">{result.message}</div>
                    </div>
                    <div className="result-time">{result.timestamp}</div>
                  </div>
                  
                  {result.data && (
                    <div className="result-data">
                      <details>
                        <summary>Datos</summary>
                        <pre>{JSON.stringify(result.data, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Renderizar la aplicación
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TestPage />);
}
