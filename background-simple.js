// Background script simple para testing
console.log('Background script iniciado');

// Datos de prueba para el wallet
let walletData = {
    accounts: [],
    currentAccount: null,
    currentAccountIndex: 0,
    chainId: '31337',
    networks: [
        {
            chainId: '31337',
            name: 'Anvil Local',
            rpcUrl: 'http://localhost:8545',
            blockExplorer: '',
            nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
            },
            isTestnet: true
        }
    ],
    currentNetwork: {
        chainId: '31337',
        name: 'Anvil Local',
        rpcUrl: 'http://localhost:8545',
        blockExplorer: '',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        isTestnet: true
    },
    mnemonic: '',
    theme: 'light',
    language: 'es'
};

// Función para generar cuentas de prueba
function generateTestAccounts() {
    return [
        {
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            balance: '0x21e19e0c9bab2400000', // 10000 ETH en wei
            index: 0,
            name: 'Account 1',
            privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            publicKey: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
        },
        {
            address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            balance: '0x21e19e0c9bab2400000', // 10000 ETH en wei
            index: 1,
            name: 'Account 2',
            privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
            publicKey: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
        }
    ];
}

// Listener de mensajes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Mensaje recibido:', message);
    
    switch (message.type) {
        case 'PING':
            console.log('Respondiendo PING');
            sendResponse({ success: true, message: 'Pong', timestamp: Date.now() });
            break;
            
        case 'GET_WALLET_STATE':
            console.log('Obteniendo estado del wallet');
            sendResponse(walletData);
            break;
            
        case 'GENERATE_WALLET':
            console.log('Generando wallet');
            walletData.accounts = generateTestAccounts();
            walletData.currentAccount = walletData.accounts[0];
            walletData.mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            sendResponse({ success: true, mnemonic: walletData.mnemonic });
            break;
            
        case 'IMPORT_WALLET':
            console.log('Importando wallet');
            try {
                const { mnemonic } = message.data;
                if (!mnemonic || mnemonic.trim() === '') {
                    sendResponse({ success: false, error: 'Mnemonic requerido' });
                    return;
                }
                
                // Simular importación exitosa
                walletData.accounts = generateTestAccounts();
                walletData.currentAccount = walletData.accounts[0];
                walletData.mnemonic = mnemonic;
                
                sendResponse({ success: true, message: 'Wallet importado correctamente' });
            } catch (error) {
                console.error('Error al importar wallet:', error);
                sendResponse({ success: false, error: 'Error al importar wallet' });
            }
            break;
            
        case 'SWITCH_ACCOUNT':
            console.log('Cambiando cuenta');
            try {
                const { accountIndex } = message.data;
                if (accountIndex >= 0 && accountIndex < walletData.accounts.length) {
                    walletData.currentAccountIndex = accountIndex;
                    walletData.currentAccount = walletData.accounts[accountIndex];
                    sendResponse({ success: true, message: 'Cuenta cambiada correctamente' });
                } else {
                    sendResponse({ success: false, error: 'Índice de cuenta inválido' });
                }
            } catch (error) {
                console.error('Error al cambiar cuenta:', error);
                sendResponse({ success: false, error: 'Error al cambiar cuenta' });
            }
            break;
            
        case 'SEND_TRANSACTION':
            console.log('Enviando transacción');
            try {
                const { transaction } = message.data;
                if (!transaction.to || !transaction.value) {
                    sendResponse({ success: false, error: 'Datos de transacción incompletos' });
                    return;
                }
                
                // Simular envío exitoso
                const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
                console.log('Transacción simulada:', {
                    from: walletData.currentAccount?.address,
                    to: transaction.to,
                    value: transaction.value,
                    hash: mockTxHash
                });
                
                sendResponse({ success: true, hash: mockTxHash });
            } catch (error) {
                console.error('Error al enviar transacción:', error);
                sendResponse({ success: false, error: 'Error al enviar transacción' });
            }
            break;
            
        default:
            console.log('Método no soportado:', message.type);
            sendResponse({ error: 'Método no soportado' });
    }
    
    return true; // Mantener el canal abierto para respuesta asíncrona
});

console.log('Background script configurado correctamente');