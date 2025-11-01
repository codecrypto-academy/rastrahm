// Debug script para CodeCrypto Wallet
function showResult(type, message, data = null) {
    const resultDiv = document.getElementById('result');
    resultDiv.className = `debug-result ${type}`;
    
    let content = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (data) {
        content += `\n\nDatos:\n${JSON.stringify(data, null, 2)}`;
    }
    resultDiv.textContent = content;
}

function testPing() {
    showResult('info', 'Probando PING...');
    
    try {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            showResult('error', 'Chrome runtime no disponible');
            return;
        }
        
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
            if (chrome.runtime.lastError) {
                showResult('error', 'Error de comunicación', chrome.runtime.lastError.message);
            } else if (response) {
                showResult('success', 'PING exitoso', response);
            } else {
                showResult('error', 'No se recibió respuesta');
            }
        });
        
    } catch (error) {
        showResult('error', 'Error al probar PING', error.message);
    }
}

function testGetState() {
    showResult('info', 'Obteniendo estado...');
    
    try {
        chrome.runtime.sendMessage({ type: 'GET_WALLET_STATE' }, (response) => {
            if (chrome.runtime.lastError) {
                showResult('error', 'Error al obtener estado', chrome.runtime.lastError.message);
            } else if (response) {
                showResult('success', 'Estado obtenido', response);
            } else {
                showResult('error', 'No se recibió respuesta del estado');
            }
        });
    } catch (error) {
        showResult('error', 'Error al obtener estado', error.message);
    }
}

function testGenerateWallet() {
    showResult('info', 'Generando wallet...');
    
    try {
        chrome.runtime.sendMessage({ type: 'GENERATE_WALLET' }, (response) => {
            if (chrome.runtime.lastError) {
                showResult('error', 'Error al generar wallet', chrome.runtime.lastError.message);
            } else if (response && response.success) {
                showResult('success', 'Wallet generado', {
                    success: response.success,
                    mnemonic: response.mnemonic ? '*** MNEMONIC GENERADO ***' : 'No mnemonic'
                });
            } else {
                showResult('error', 'Error al generar wallet', response);
            }
        });
    } catch (error) {
        showResult('error', 'Error al generar wallet', error.message);
    }
}

function testStorage() {
    showResult('info', 'Verificando storage...');
    
    try {
        chrome.storage.local.get(null, (items) => {
            if (chrome.runtime.lastError) {
                showResult('error', 'Error al acceder al storage', chrome.runtime.lastError.message);
            } else {
                showResult('success', 'Storage accesible', items);
            }
        });
    } catch (error) {
        showResult('error', 'Error al verificar storage', error.message);
    }
}

// Configurar event listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Configurar botones
    document.getElementById('ping-btn').addEventListener('click', testPing);
    document.getElementById('state-btn').addEventListener('click', testGetState);
    document.getElementById('generate-btn').addEventListener('click', testGenerateWallet);
    document.getElementById('storage-btn').addEventListener('click', testStorage);
    
    // Auto-probar PING al cargar
    setTimeout(testPing, 500);
});
