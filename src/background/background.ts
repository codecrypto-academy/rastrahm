// Background script con conexión real a Anvil
// IMPORTANTE: Este listener se registra INMEDIATAMENTE, antes de cualquier otra cosa

// Registrar listener CRÍTICO LO PRIMERO - esto debe funcionar incluso si hay errores después
(function() {
    'use strict';
    console.log('[INIT] ⚡ Background script iniciando...');
    
    try {
        console.log('[INIT] 🚀 Registrando listener CRÍTICO...');
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                console.log('[BG CRITICAL] Mensaje recibido:', message.type);
                // Solo responder a PING - los demás mensajes los maneja el listener principal
                if (message.type === 'PING') {
                    console.log('[BG CRITICAL] ✅ PING recibido - respondiendo');
                    sendResponse({ success: true, message: 'Pong', timestamp: Date.now() });
                    return true;
                }
                // Para otros mensajes, devolver false para que el listener principal los maneje
                return false;
            } catch (error) {
                console.error('[BG CRITICAL] ❌ Error en listener crítico:', error);
            }
            return false;
        });
        console.log('[INIT] ✅ Listener crítico registrado correctamente');
    } catch (error) {
        console.error('[INIT] ❌ ERROR CRÍTICO al registrar listener:', error);
    }
})();

// Importar ethers de forma asíncrona - NO bloquear la ejecución
let ethersModule: any = null;
console.log('[INIT] Versión:', chrome.runtime.getManifest()?.version || 'unknown');

// Cargar ethers de forma completamente asíncrona para no bloquear el service worker
(async () => {
    try {
        const { ethers } = await import('ethers');
        ethersModule = ethers;
        console.log('[INIT] ✅ Ethers importado correctamente');
    } catch (error) {
        console.error('[INIT] ❌ Error al importar ethers:', error);
        console.log('[INIT] ⚠️ Continuando sin ethers - funcionalidad básica disponible');
    }
})();

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
        },
        {
            address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            balance: '0x21e19e0c9bab2400000', // 10000 ETH en wei
            index: 2,
            name: 'Account 3',
            privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
            publicKey: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
        },
        {
            address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
            balance: '0x21e19e0c9bab2400000', // 10000 ETH en wei
            index: 3,
            name: 'Account 4',
            privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
            publicKey: '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
        },
        {
            address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
            balance: '0x21e19e0c9bab2400000', // 10000 ETH en wei
            index: 4,
            name: 'Account 5',
            privateKey: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
            publicKey: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'
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
        
        // Guardar en storage después de actualizar balances (sin bloquear)
        saveWalletDataToStorage().catch(error => {
            console.error('Error al guardar balances en storage:', error);
        });
        
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

// Función para cargar walletData desde storage
async function loadWalletDataFromStorage(): Promise<void> {
    try {
        const result = await chrome.storage.local.get('codecrypto_wallet');
        if (result.codecrypto_wallet) {
            const storedData = result.codecrypto_wallet;
            
            // Restaurar datos guardados
            if (storedData.accounts && storedData.accounts.length > 0) {
                walletData.accounts = storedData.accounts;
                console.log('Cuentas cargadas desde storage:', walletData.accounts.length);
            }
            
            if (storedData.currentAccountIndex !== undefined) {
                walletData.currentAccountIndex = storedData.currentAccountIndex;
                if (walletData.accounts[walletData.currentAccountIndex]) {
                    walletData.currentAccount = walletData.accounts[walletData.currentAccountIndex];
                }
            }
            
            if (storedData.chainId) {
                walletData.chainId = storedData.chainId;
            }
            
            if (storedData.networks) {
                walletData.networks = storedData.networks;
            }
            
            if (storedData.currentNetwork) {
                walletData.currentNetwork = storedData.currentNetwork;
            }
            
            if (storedData.mnemonic) {
                walletData.mnemonic = storedData.mnemonic;
            }
            
            if (storedData.theme) {
                walletData.theme = storedData.theme;
            }
            
            if (storedData.language) {
                walletData.language = storedData.language;
            }
            
            console.log('Wallet cargado desde storage correctamente');
            
            // Actualizar balances al cargar (en segundo plano, sin bloquear)
            if (walletData.accounts.length > 0) {
                updateAccountBalances().catch(error => {
                    console.error('Error al actualizar balances al cargar:', error);
                });
            }
        }
    } catch (error) {
        console.error('Error al cargar wallet desde storage:', error);
    }
}

// Función para guardar walletData en storage
async function saveWalletDataToStorage(): Promise<void> {
    try {
        await chrome.storage.local.set({ 'codecrypto_wallet': walletData });
        console.log('Wallet guardado en storage correctamente');
    } catch (error) {
        console.error('Error al guardar wallet en storage:', error);
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

// Registrar listener completo de mensajes - se registra DESPUÉS del listener básico
// Esto maneja todos los casos completos
console.log('[INIT] 📡 Registrando listener completo de mensajes...');
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        console.log('[BG] Mensaje recibido:', message.type);
        
        switch (message.type) {
            case 'PING':
                console.log('[BG] Respondiendo PING');
                sendResponse({ success: true, message: 'Pong', timestamp: Date.now() });
                return true;
                
            case 'GET_WALLET_STATE':
                console.log('[BG] Obteniendo estado del wallet');
                sendResponse(walletData);
                return true;
                
            case 'GET_LOGS':
                console.log('[BG] Obteniendo logs');
                sendResponse({ 
                    success: true, 
                    logs: walletData.logs || [],
                    message: 'Logs obtenidos correctamente'
                });
                return true;
                
            case 'eth_requestAccounts':
                console.log('Solicitando acceso a cuentas (eth_requestAccounts)');
                try {
                    // Si no hay cuentas, generar cuentas de prueba
                    if (walletData.accounts.length === 0) {
                        walletData.accounts = generateTestAccounts();
                        walletData.currentAccount = walletData.accounts[0];
                        walletData.currentAccountIndex = 0;
                        addLog('operation', 'Cuentas generadas automáticamente para eth_requestAccounts', { 
                            accountCount: walletData.accounts.length 
                        });
                        saveWalletDataToStorage().catch(error => {
                            console.error('Error al guardar cuentas en storage:', error);
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
                walletData.currentAccountIndex = 0;
                walletData.mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
                addLog('operation', 'Wallet generado', { accountCount: walletData.accounts.length });
                saveWalletDataToStorage().catch(error => {
                    console.error('Error al guardar wallet en storage:', error);
                });
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
                    walletData.currentAccountIndex = 0;
                    walletData.mnemonic = mnemonic;
                    addLog('operation', 'Wallet importado', { accountCount: walletData.accounts.length });
                    saveWalletDataToStorage().catch(error => {
                        console.error('Error al guardar wallet en storage:', error);
                    });
                    
                    sendResponse({ success: true, message: 'Wallet importado correctamente' });
                } catch (error) {
                    console.error('Error al importar wallet:', error);
                    addLog('error', 'Error al importar wallet', { error: error });
                    sendResponse({ success: false, error: 'Error al importar wallet' });
                }
                break;
                
            case 'IMPORT_ACCOUNT':
                console.log('Importando cuenta con clave privada');
                (async () => {
                try {
                    const { privateKey, address: providedAddress, accountName } = message.data;
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
                    
                    // Usar la dirección proporcionada del popup (donde ethers funciona)
                    // o intentar calcularla aquí si no está disponible
                    let address: string;
                    if (providedAddress && providedAddress.startsWith('0x') && providedAddress.length === 42) {
                        // Usar la dirección calculada en el popup
                        address = providedAddress;
                        console.log('Usando dirección proporcionada del popup:', address);
                    } else {
                        // Intentar calcular la dirección aquí como fallback
                        console.log('Intentando calcular dirección en background...');
                        try {
                            if (!ethersModule) {
                                const { ethers } = await import('ethers');
                                ethersModule = ethers;
                            }
                            if (ethersModule) {
                                const wallet = new ethersModule.Wallet(privateKey);
                                address = wallet.address;
                                console.log('Dirección calculada en background:', address);
                            } else {
                                throw new Error('No se puede calcular la dirección - ethers no disponible');
                            }
                        } catch (error) {
                            console.error('Error al calcular dirección:', error);
                            addLog('error', 'Error al importar cuenta: No se pudo calcular la dirección');
                            sendResponse({ success: false, error: 'No se pudo calcular la dirección desde la clave privada' });
                            return;
                        }
                    }
                    
                    // Verificar si la cuenta ya existe
                    const existingAccount = walletData.accounts.find(acc => 
                        acc.address.toLowerCase() === address.toLowerCase()
                    );
                    
                    if (existingAccount) {
                        addLog('warning', 'Cuenta ya existe', { address: address });
                        sendResponse({ 
                            success: false, 
                            error: 'Esta cuenta ya está importada' 
                        });
                        return;
                    }
                    
                    // Obtener balance inicial de Anvil
                    let balance = '0x0';
                    try {
                        const balanceResponse = await fetch('http://localhost:8545', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                method: 'eth_getBalance',
                                params: [address, 'latest'],
                                id: 1
                            })
                        });
                        const balanceResult = await balanceResponse.json();
                        if (balanceResult.result) {
                            balance = balanceResult.result;
                        }
                    } catch (error) {
                        console.error('Error al obtener balance inicial:', error);
                        // Continuar con balance 0 si falla
                    }
                    
                    // Crear nueva cuenta
                    const newAccount: Account = {
                        address: address,
                        balance: balance,
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
                    
                    // Guardar en chrome.storage.local (sin bloquear respuesta)
                    saveWalletDataToStorage().catch(error => {
                        console.error('Error al guardar cuenta en storage:', error);
                    });
                    
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
                })();
                return true; // Mantener canal abierto para respuesta asíncrona
                
            case 'SWITCH_ACCOUNT':
                console.log('Cambiando cuenta');
                try {
                    const { accountIndex } = message.data;
                    if (accountIndex >= 0 && accountIndex < walletData.accounts.length) {
                        walletData.currentAccountIndex = accountIndex;
                        walletData.currentAccount = walletData.accounts[accountIndex];
                        saveWalletDataToStorage().catch(error => {
                            console.error('Error al guardar cambio de cuenta en storage:', error);
                        });
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
    } catch (error) {
        console.error('Error en listener de mensajes:', error);
        sendResponse({ success: false, error: 'Error interno del servidor' });
    }
    
    return true; // Mantener el canal abierto para respuesta asíncrona
});

// Inicializar refresh automático de balances cada 5 segundos
// Usar setTimeout para no bloquear la ejecución inicial
setTimeout(() => {
    setInterval(async () => {
        if (walletData.accounts.length > 0) {
            await updateAccountBalances();
        }
    }, 5000);
}, 1000);

// Cargar wallet y logs al inicio - NO bloquear con await
// Hacer todo de forma asíncrona sin bloquear el service worker
console.log('[INIT] Configurando inicialización asíncrona...');

// Usar setTimeout para que no bloquee la ejecución inicial
setTimeout(async () => {
    try {
        console.log('[INIT] Iniciando carga de datos del wallet...');
        await loadWalletDataFromStorage();
        await loadLogsFromStorage();
        addLog('event', 'Background script iniciado');
        console.log('[INIT] ✅ Background script configurado correctamente');
    } catch (error) {
        console.error('[INIT] ❌ Error al inicializar background script:', error);
        console.log('[INIT] ⚠️ Background script iniciado (con errores en carga)');
    }
}, 100);

// Registrar listeners de activación para Manifest V3
// Esto asegura que el service worker esté activo cuando se necesite
chrome.runtime.onStartup.addListener(() => {
    console.log('[SW] Service worker iniciado por startup');
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('[SW] Service worker instalado/actualizado:', details.reason);
});

// Mensaje de confirmación de que el listener está registrado
console.log('[INIT] ✅ Listener de mensajes registrado exitosamente');
console.log('[INIT] ✅ Background script completamente inicializado');
console.log('[INIT] 🎉 Service worker activo y listo');

// Export para que TypeScript lo reconozca como módulo
export {};