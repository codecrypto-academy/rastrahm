// Background script híbrido con mejor manejo de errores
console.log('Background script híbrido iniciado');

// Función para manejar errores
function handleError(error, context) {
    console.error(`Error en ${context}:`, error);
    return { error: error.message || 'Error desconocido' };
}

// Función para obtener datos del storage
async function getStorageData() {
    try {
        const result = await chrome.storage.local.get('codecrypto_wallet');
        return result.codecrypto_wallet || {
            accounts: [],
            currentAccount: 0,
            chainId: '31337',
            networks: [
                {
                    chainId: '31337',
                    name: 'Anvil Local',
                    rpcUrl: 'http://localhost:8545',
                    blockExplorer: '',
                    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                    isTestnet: true
                }
            ],
            theme: 'light',
            language: 'es'
        };
    } catch (error) {
        console.error('Error al obtener datos del storage:', error);
        return null;
    }
}

// Función para guardar datos en el storage
async function setStorageData(data) {
    try {
        await chrome.storage.local.set({ codecrypto_wallet: data });
        return true;
    } catch (error) {
        console.error('Error al guardar datos en el storage:', error);
        return false;
    }
}

// Función para generar wallet
async function generateWallet() {
    try {
        // Generar mnemonic simple para testing
        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        
        // Crear cuentas de prueba
        const accounts = [
            {
                address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
                publicKey: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                index: 0,
                name: 'Account 1',
                balance: '0'
            },
            {
                address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
                publicKey: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                index: 1,
                name: 'Account 2',
                balance: '0'
            }
        ];
        
        const walletData = {
            mnemonic: mnemonic,
            accounts: accounts,
            currentAccount: 0,
            chainId: '31337',
            networks: [
                {
                    chainId: '31337',
                    name: 'Anvil Local',
                    rpcUrl: 'http://localhost:8545',
                    blockExplorer: '',
                    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                    isTestnet: true
                }
            ],
            theme: 'light',
            language: 'es'
        };
        
        await setStorageData(walletData);
        console.log('Wallet generado exitosamente');
        
        return { success: true, mnemonic: mnemonic };
    } catch (error) {
        return handleError(error, 'generateWallet');
    }
}

// Función para obtener balance de Anvil
async function getAnvilBalance(address) {
    try {
        const response = await fetch('http://localhost:8545', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 1
            })
        });
        
        const data = await response.json();
        return data.result || '0x0';
    } catch (error) {
        console.error('Error al obtener balance de Anvil:', error);
        return '0x0';
    }
}

// Función para cambiar de cuenta
async function switchAccount(accountIndex) {
    try {
        const walletData = await getStorageData();
        if (!walletData || !walletData.accounts || accountIndex >= walletData.accounts.length) {
            return { success: false, error: 'Cuenta no válida' };
        }
        
        walletData.currentAccount = accountIndex;
        await setStorageData(walletData);
        
        return { success: true, message: `Cuenta cambiada a ${walletData.accounts[accountIndex].name}` };
    } catch (error) {
        console.error('Error al cambiar cuenta:', error);
        return { success: false, error: error.message };
    }
}

// Función para obtener estado del wallet
async function getWalletState() {
    try {
        const walletData = await getStorageData();
        if (!walletData) {
            return {
                accounts: [],
                currentAccount: null,
                currentAccountIndex: 0,
                chainId: '31337',
                networks: [],
                currentNetwork: null
            };
        }
        
        // Actualizar balances de Anvil
        if (walletData.accounts && walletData.accounts.length > 0) {
            for (let account of walletData.accounts) {
                try {
                    const balance = await getAnvilBalance(account.address);
                    account.balance = balance;
                } catch (error) {
                    console.error(`Error al obtener balance de ${account.address}:`, error);
                }
            }
        }
        
        const currentAccount = walletData.accounts[walletData.currentAccount] || null;
        const currentNetwork = walletData.networks.find(n => n.chainId === walletData.chainId) || null;
        
        return {
            accounts: walletData.accounts,
            currentAccount: currentAccount,
            currentAccountIndex: walletData.currentAccount,
            chainId: walletData.chainId,
            networks: walletData.networks,
            currentNetwork: currentNetwork
        };
    } catch (error) {
        return handleError(error, 'getWalletState');
    }
}

// Listener de mensajes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Manejar respuestas asíncronas
    (async () => {
        try {
            let response;
            
            switch (message.type) {
                case 'PING':
                    response = { success: true, message: 'Pong', timestamp: Date.now() };
                    break;
                    
                case 'GET_WALLET_STATE':
                    response = await getWalletState();
                    break;
                    
                case 'GENERATE_WALLET':
                    response = await generateWallet();
                    break;
                    
                case 'IMPORT_WALLET':
                    response = { success: true, message: 'Importación no implementada en versión de prueba' };
                    break;
                    
                case 'SWITCH_ACCOUNT':
                    response = await switchAccount(message.data.accountIndex);
                    break;
                    
                case 'SWITCH_NETWORK':
                    response = { success: true, message: 'Cambio de red no implementado en versión de prueba' };
                    break;
                    
                case 'SEND_TRANSACTION':
                    response = { success: true, message: 'Transacciones no implementadas en versión de prueba' };
                    break;
                    
                case 'SIGN_MESSAGE':
                    response = { success: true, message: 'Firma de mensajes no implementada en versión de prueba' };
                    break;
                    
                case 'SIGN_TYPED_DATA':
                    response = { success: true, message: 'Firma de datos tipados no implementada en versión de prueba' };
                    break;
                    
                case 'GET_BALANCE':
                    response = { success: true, message: 'Obtención de balance no implementada en versión de prueba' };
                    break;
                    
                case 'RESET_WALLET':
                    try {
                        await chrome.storage.local.clear();
                        response = { success: true, message: 'Wallet reseteado' };
                    } catch (error) {
                        response = handleError(error, 'resetWallet');
                    }
                    break;
                    
                default:
                    response = { error: `Método no soportado: ${message.type}` };
            }
            
            sendResponse(response);
            
        } catch (error) {
            console.error('Error en manejo de mensaje:', error);
            sendResponse(handleError(error, 'messageHandler'));
        }
    })();
    
    return true; // Mantener el canal abierto para respuesta asíncrona
});

console.log('Background script híbrido configurado correctamente');
