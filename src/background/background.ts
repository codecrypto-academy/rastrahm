// Background script con conexión real a Anvil
console.log('Background script iniciado');

// Tipos para TypeScript
interface Account {
    address: string;
    balance: string;
    index: number;
    name: string;
    privateKey: string;
    publicKey: string;
}

interface WalletData {
    accounts: Account[];
    currentAccount: Account | null;
    currentAccountIndex: number;
    chainId: string;
    networks: any[];
    currentNetwork: any;
    mnemonic: string;
    theme: string;
    language: string;
    logs: any[];
}

// Datos de prueba para el wallet
let walletData: WalletData = {
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
    language: 'es',
    logs: []
};

// Función para generar cuentas de prueba (Anvil accounts)
function generateTestAccounts(): Account[] {
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

// Función para actualizar balances de las cuentas
async function updateAccountBalances() {
    try {
        console.log('Actualizando balances de las cuentas...');
        
        for (let i = 0; i < walletData.accounts.length; i++) {
            const account = walletData.accounts[i];
            
            try {
                // Obtener balance de Anvil
                const response = await fetch('http://localhost:8545', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getBalance',
                        params: [account.address, 'latest'],
                        id: 1
                    })
                });
                
                const result = await response.json();
                if (result.result) {
                    account.balance = result.result;
                    console.log(`Balance actualizado para ${account.address}: ${result.result}`);
                }
            } catch (error) {
                console.error(`Error al actualizar balance de ${account.address}:`, error);
            }
        }
        
        // Actualizar cuenta actual
        if (walletData.currentAccount && walletData.accounts[walletData.currentAccountIndex]) {
            walletData.currentAccount = walletData.accounts[walletData.currentAccountIndex];
        }
        
        console.log('Balances actualizados correctamente');
    } catch (error) {
        console.error('Error al actualizar balances:', error);
    }
}

// Función para agregar log de transacción
function addTransactionLog(transaction: any, hash: string): void {
    const logEntry = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'transaction',
        message: `Transacción enviada: ${hash}`,
        data: {
            from: transaction.from || walletData.currentAccount?.address,
            to: transaction.to,
            value: transaction.value,
            hash: hash,
            timestamp: Date.now()
        },
        timestamp: Date.now(),
        level: 'info'
    };
    
    // Agregar al array de logs
    walletData.logs.push(logEntry);
    
    // Guardar en chrome.storage.local
    chrome.storage.local.set({ 'codecrypto_logs': walletData.logs });
    
    console.log('Log de transacción agregado:', logEntry);
}

// Función para agregar log general
function addLog(type: string, message: string, data: any = {}, level: string = 'info'): void {
    const logEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type,
        message: message,
        data: data,
        timestamp: Date.now(),
        level: level
    };
    
    // Agregar al array de logs
    walletData.logs.push(logEntry);
    
    // Guardar en chrome.storage.local
    chrome.storage.local.set({ 'codecrypto_logs': walletData.logs });
    
    console.log('Log agregado:', logEntry);
}

// Función para cargar logs desde storage
async function loadLogsFromStorage(): Promise<void> {
    try {
        const result = await chrome.storage.local.get('codecrypto_logs');
        if (result.codecrypto_logs) {
            walletData.logs = result.codecrypto_logs;
            console.log('Logs cargados desde storage:', walletData.logs.length);
        }
    } catch (error) {
        console.error('Error al cargar logs desde storage:', error);
    }
}

// Mapa de solicitudes de firma pendientes
const pendingSignatures: { [requestId: string]: (response: any) => void } = {};

// Función para manejar solicitudes de firma
async function handleSignatureRequest(message: any, sendResponse: (response: any) => void): Promise<void> {
    try {
        const requestId = `sign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Guardar el callback de respuesta
        pendingSignatures[requestId] = sendResponse;
        
        // Preparar datos para la ventana de confirmación
        const confirmData = {
            type: message.type,
            account: message.data?.address || walletData.currentAccount?.address,
            message: message.data?.message,
            typedData: message.data?.typedData,
            origin: message.data?.origin || 'unknown',
            requestId: requestId
        };
        
        // Abrir ventana de confirmación
        const url = chrome.runtime.getURL(`confirm.html?data=${encodeURIComponent(JSON.stringify(confirmData))}`);
        
        chrome.windows.create({
            url: url,
            type: 'popup',
            width: 400,
            height: 600,
            focused: true
        });
        
    } catch (error) {
        console.error('Error al abrir ventana de confirmación:', error);
        sendResponse({ 
            success: false, 
            error: 'Error al abrir ventana de confirmación' 
        });
    }
}

// Función para manejar la confirmación/rechazo de firma
function handleSignatureConfirmation(message: any, sendResponse: (response: any) => void): void {
    const { approved, requestId } = message;
    
    // Obtener el callback de respuesta
    const callback = pendingSignatures[requestId];
    
    if (!callback) {
        console.error('No se encontró callback para requestId:', requestId);
        sendResponse({ success: false, error: 'Solicitud no encontrada' });
        return;
    }
    
    if (approved) {
        // Usuario aprobó - generar firma simulada
        const signature = '0x' + '0'.repeat(130);
        addLog('operation', 'Firma aprobada y generada', { requestId });
        callback({ 
            success: true, 
            signature: signature 
        });
    } else {
        // Usuario rechazó
        addLog('operation', 'Firma rechazada por el usuario', { requestId });
        callback({ 
            success: false, 
            error: 'Usuario rechazó la firma' 
        });
    }
    
    // Limpiar el callback
    delete pendingSignatures[requestId];
    
    sendResponse({ success: true });
}

// Función para enviar transacción real a Anvil usando impersonate
async function sendRealTransaction(transaction: any): Promise<any> {
    try {
        console.log('Enviando transacción REAL a Anvil...');
        
        // Convertir valor de ETH a wei usando BigInt para manejar números grandes
        const valueInWei = BigInt(Math.floor(parseFloat(transaction.value) * Math.pow(10, 18)));
        
        // Obtener nonce de la cuenta
        const nonceResponse = await fetch('http://localhost:8545', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getTransactionCount',
                params: [walletData.currentAccount!.address, 'latest'],
                id: 1
            })
        });
        const nonceResult = await nonceResponse.json();
        const nonce = parseInt(nonceResult.result, 16);
        
        // Obtener gas price
        const gasPriceResponse = await fetch('http://localhost:8545', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_gasPrice',
                params: [],
                id: 1
            })
        });
        const gasPriceResult = await gasPriceResponse.json();
        const gasPrice = gasPriceResult.result;
        
        // Primero impersonar la cuenta
        const impersonateResponse = await fetch('http://localhost:8545', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'anvil_impersonateAccount',
                params: [walletData.currentAccount!.address],
                id: 1
            })
        });
        
        const impersonateResult = await impersonateResponse.json();
        console.log('Impersonate result:', impersonateResult);
        
        // Ahora enviar la transacción
        const txData = {
            jsonrpc: '2.0',
            method: 'eth_sendTransaction',
            params: [{
                from: walletData.currentAccount!.address,
                to: transaction.to,
                value: '0x' + valueInWei.toString(16),
                gas: transaction.gas || '0x5208',
                gasPrice: gasPrice,
                data: transaction.data || '0x'
            }],
            id: 1
        };
        
        console.log('Enviando transacción con impersonate:', txData);
        
        // Enviar a Anvil
        const response = await fetch('http://localhost:8545', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(txData)
        });
        
        const result = await response.json();
        console.log('Respuesta de Anvil:', result);
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        // Agregar log de transacción
        addTransactionLog(transaction, result.result);
        
        // Actualizar balance después de la transacción
        await updateAccountBalances();
        
        return {
            success: true,
            hash: result.result,
            message: 'Transacción enviada a Anvil con impersonate'
        };
        
    } catch (error: any) {
        console.error('Error al enviar transacción real:', error);
        return {
            success: false,
            error: error.message
        };
    }
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
            
        case 'eth_requestAccounts':
            console.log('Solicitando acceso a cuentas (eth_requestAccounts)');
            try {
                // Si no hay cuentas, generar cuentas de prueba
                if (walletData.accounts.length === 0) {
                    walletData.accounts = generateTestAccounts();
                    walletData.currentAccount = walletData.accounts[0];
                    addLog('operation', 'Cuentas generadas automáticamente para eth_requestAccounts', { 
                        accountCount: walletData.accounts.length 
                    });
                }
                
                // Devolver las direcciones de todas las cuentas
                const accountAddresses = walletData.accounts.map(acc => acc.address);
                sendResponse({ 
                    success: true, 
                    accounts: accountAddresses
                });
            } catch (error) {
                console.error('Error al procesar eth_requestAccounts:', error);
                sendResponse({ 
                    success: false, 
                    error: 'Error al obtener cuentas' 
                });
            }
            break;
            
        case 'personal_sign':
        case 'eth_sign':
            console.log('Solicitando confirmación de firma (personal_sign)');
            handleSignatureRequest(message, sendResponse);
            return true; // Mantener canal abierto
            
        case 'eth_signTypedData_v4':
            console.log('Solicitando confirmación de firma (eth_signTypedData_v4)');
            handleSignatureRequest(message, sendResponse);
            return true; // Mantener canal abierto
            
        case 'CONFIRM_SIGNATURE':
            console.log('Procesando confirmación de firma');
            handleSignatureConfirmation(message, sendResponse);
            break;
            
        case 'GENERATE_WALLET':
            console.log('Generando wallet');
            walletData.accounts = generateTestAccounts();
            walletData.currentAccount = walletData.accounts[0];
            walletData.mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            addLog('operation', 'Wallet generado', { accountCount: walletData.accounts.length });
            sendResponse({ success: true, mnemonic: walletData.mnemonic });
            break;
            
        case 'IMPORT_WALLET':
            console.log('Importando wallet');
            try {
                const { mnemonic } = message.data;
                if (!mnemonic || mnemonic.trim() === '') {
                    addLog('error', 'Error al importar wallet: Mnemonic requerido');
                    sendResponse({ success: false, error: 'Mnemonic requerido' });
                    return;
                }
                
                // Simular importación exitosa
                walletData.accounts = generateTestAccounts();
                walletData.currentAccount = walletData.accounts[0];
                walletData.mnemonic = mnemonic;
                addLog('operation', 'Wallet importado', { accountCount: walletData.accounts.length });
                
                sendResponse({ success: true, message: 'Wallet importado correctamente' });
            } catch (error) {
                console.error('Error al importar wallet:', error);
                addLog('error', 'Error al importar wallet', { error: error });
                sendResponse({ success: false, error: 'Error al importar wallet' });
            }
            break;
            
        case 'IMPORT_ACCOUNT':
            console.log('Importando cuenta con clave privada');
            try {
                const { privateKey, accountName } = message.data;
                if (!privateKey || privateKey.trim() === '') {
                    addLog('error', 'Error al importar cuenta: Clave privada requerida');
                    sendResponse({ success: false, error: 'Clave privada requerida' });
                    return;
                }
                
                // Validar formato de clave privada
                if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
                    addLog('error', 'Error al importar cuenta: Formato de clave privada inválido');
                    sendResponse({ success: false, error: 'Formato de clave privada inválido' });
                    return;
                }
                
                // Generar dirección a partir de la clave privada (simplificado)
                const address = '0x' + Math.random().toString(16).substr(2, 40);
                
                // Crear nueva cuenta
                const newAccount = {
                    address: address,
                    balance: '0x0', // Se actualizará después
                    index: walletData.accounts.length,
                    name: accountName || `Account ${walletData.accounts.length + 1}`,
                    privateKey: privateKey,
                    publicKey: address
                };
                
                // Agregar cuenta a la lista
                walletData.accounts.push(newAccount);
                
                // Si es la primera cuenta, establecerla como actual
                if (walletData.accounts.length === 1) {
                    walletData.currentAccount = newAccount;
                    walletData.currentAccountIndex = 0;
                }
                
                addLog('operation', 'Cuenta importada', { 
                    address: address, 
                    name: newAccount.name,
                    accountCount: walletData.accounts.length 
                });
                
                console.log('Cuenta importada:', newAccount);
                sendResponse({ 
                    success: true, 
                    message: 'Cuenta importada correctamente',
                    account: newAccount
                });
            } catch (error) {
                console.error('Error al importar cuenta:', error);
                addLog('error', 'Error al importar cuenta', { error: error });
                sendResponse({ success: false, error: 'Error al importar cuenta' });
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
            console.log('Enviando transacción REAL a Anvil');
            try {
                const { transaction } = message.data;
                if (!transaction.to || !transaction.value) {
                    sendResponse({ success: false, error: 'Datos de transacción incompletos' });
                    return;
                }
                
                // Agregar clave privada de la cuenta actual
                const currentAccount = walletData.currentAccount;
                if (!currentAccount) {
                    sendResponse({ success: false, error: 'No hay cuenta seleccionada' });
                    return;
                }
                
                const transactionWithPrivateKey = {
                    ...transaction,
                    fromPrivateKey: currentAccount!.privateKey
                };
                
                // Enviar transacción real a Anvil
                sendRealTransaction(transactionWithPrivateKey).then(result => {
                    sendResponse(result);
                }).catch(error => {
                    console.error('Error en transacción real:', error);
                    sendResponse({ success: false, error: error.message });
                });
                
                return true; // Mantener canal abierto para respuesta asíncrona
                
            } catch (error) {
                console.error('Error al enviar transacción:', error);
                sendResponse({ success: false, error: 'Error al enviar transacción' });
            }
            break;
            
        case 'GET_LOGS':
            console.log('Obteniendo logs');
            sendResponse({ 
                success: true, 
                logs: walletData.logs || [],
                message: 'Logs obtenidos correctamente'
            });
            break;
            
        case 'CLEAR_LOGS':
            console.log('Limpiando logs');
            walletData.logs = [];
            chrome.storage.local.set({ 'codecrypto_logs': [] });
            addLog('operation', 'Logs limpiados');
            sendResponse({ success: true, message: 'Logs limpiados correctamente' });
            break;
            
        case 'UPDATE_BALANCES':
            console.log('Actualizando balances manualmente');
            updateAccountBalances().then(() => {
                sendResponse({ 
                    success: true, 
                    message: 'Balances actualizados correctamente',
                    walletData: walletData
                });
            }).catch((error) => {
                console.error('Error al actualizar balances:', error);
                sendResponse({ success: false, error: 'Error al actualizar balances' });
            });
            return true; // Mantener canal abierto para respuesta asíncrona
        
        // RPC: Obtener balance
        case 'eth_getBalance':
            (async () => {
                try {
                    const address = message.data?.address || walletData.currentAccount?.address;
                    const blockTag = message.data?.blockTag || 'latest';
                    if (!address) {
                        sendResponse({ success: false, error: 'Dirección no proporcionada' });
                        return;
                    }
                    const response = await fetch('http://localhost:8545', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getBalance',
                            params: [address, blockTag],
                            id: 1
                        })
                    });
                    const result = await response.json();
                    if (result.error) {
                        sendResponse({ success: false, error: result.error.message || 'Error RPC eth_getBalance' });
                        return;
                    }
                    sendResponse({ success: true, balance: result.result });
                } catch (error: any) {
                    console.error('Error en eth_getBalance:', error);
                    sendResponse({ success: false, error: error.message || 'Error en eth_getBalance' });
                }
            })();
            return true;

        // RPC: Obtener nonce/transaccion count
        case 'eth_getTransactionCount':
            (async () => {
                try {
                    const address = message.data?.address || walletData.currentAccount?.address;
                    const blockTag = message.data?.blockTag || 'latest';
                    if (!address) {
                        sendResponse({ success: false, error: 'Dirección no proporcionada' });
                        return;
                    }
                    const response = await fetch('http://localhost:8545', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_getTransactionCount',
                            params: [address, blockTag],
                            id: 1
                        })
                    });
                    const result = await response.json();
                    if (result.error) {
                        sendResponse({ success: false, error: result.error.message || 'Error RPC eth_getTransactionCount' });
                        return;
                    }
                    sendResponse({ success: true, nonce: result.result });
                } catch (error: any) {
                    console.error('Error en eth_getTransactionCount:', error);
                    sendResponse({ success: false, error: error.message || 'Error en eth_getTransactionCount' });
                }
            })();
            return true;

        // RPC: Estimar gas
        case 'eth_estimateGas':
            (async () => {
                try {
                    const transaction = message.data?.transaction;
                    if (!transaction) {
                        sendResponse({ success: false, error: 'Transacción no proporcionada' });
                        return;
                    }
                    const response = await fetch('http://localhost:8545', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_estimateGas',
                            params: [transaction],
                            id: 1
                        })
                    });
                    const result = await response.json();
                    if (result.error) {
                        sendResponse({ success: false, error: result.error.message || 'Error RPC eth_estimateGas' });
                        return;
                    }
                    sendResponse({ success: true, gas: result.result });
                } catch (error: any) {
                    console.error('Error en eth_estimateGas:', error);
                    sendResponse({ success: false, error: error.message || 'Error en eth_estimateGas' });
                }
            })();
            return true;
            
        default:
            console.log('Método no soportado:', message.type);
            sendResponse({ success: false, error: 'Método no soportado' });
    }
    
    return true; // Mantener el canal abierto para respuesta asíncrona
});

// Inicializar refresh automático de balances cada 5 segundos
setInterval(async () => {
    if (walletData.accounts.length > 0) {
        await updateAccountBalances();
    }
}, 5000);

// Cargar logs al inicio
loadLogsFromStorage().then(() => {
    addLog('event', 'Background script iniciado');
    console.log('Background script configurado correctamente');
});

// Export para que TypeScript lo reconozca como módulo
export {};