#!/bin/bash

echo "🔍 Diagnóstico completo de la extensión..."

# Verificar archivos críticos
echo ""
echo "📁 Verificando archivos críticos:"

if [ -f "dist/manifest.json" ]; then
    echo "✅ manifest.json existe"
else
    echo "❌ manifest.json NO existe"
fi

if [ -f "dist/background.js" ]; then
    echo "✅ background.js existe"
    echo "   Tamaño: $(wc -c < dist/background.js) bytes"
else
    echo "❌ background.js NO existe"
fi

if [ -f "dist/popup.html" ]; then
    echo "✅ popup.html existe"
else
    echo "❌ popup.html NO existe"
fi

if [ -f "dist/popup.js" ]; then
    echo "✅ popup.js existe"
    echo "   Tamaño: $(wc -c < dist/popup.js) bytes"
else
    echo "❌ popup.js NO existe"
fi

# Verificar contenido del background.js
echo ""
echo "🔍 Verificando contenido del background.js:"

if grep -q "Background script iniciado" dist/background.js; then
    echo "✅ Mensaje de inicio encontrado"
else
    echo "❌ Mensaje de inicio NO encontrado"
fi

if grep -q "chrome.runtime.onMessage.addListener" dist/background.js; then
    echo "✅ Listener de mensajes encontrado"
else
    echo "❌ Listener de mensajes NO encontrado"
fi

if grep -q "IMPORT_ACCOUNT" dist/background.js; then
    echo "✅ IMPORT_ACCOUNT encontrado"
else
    echo "❌ IMPORT_ACCOUNT NO encontrado"
fi

# Verificar permisos del manifest
echo ""
echo "🔍 Verificando permisos del manifest:"

if grep -q "service_worker" dist/manifest.json; then
    echo "✅ service_worker configurado"
else
    echo "❌ service_worker NO configurado"
fi

if grep -q "storage" dist/manifest.json; then
    echo "✅ permiso storage encontrado"
else
    echo "❌ permiso storage NO encontrado"
fi

# Verificar estructura de directorios
echo ""
echo "📂 Verificando estructura de directorios:"

if [ -d "dist/icons" ]; then
    echo "✅ directorio icons existe"
    echo "   Archivos: $(ls dist/icons/ | wc -l)"
else
    echo "❌ directorio icons NO existe"
fi

# Crear un test simple del background script
echo ""
echo "🧪 Creando test del background script..."

cat > test-background.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test Background Script</title>
</head>
<body>
    <h1>Test Background Script</h1>
    <button id="testPing">Test PING</button>
    <button id="testGenerate">Test GENERATE_WALLET</button>
    <div id="results"></div>

    <script>
        const results = document.getElementById('results');
        
        function addResult(message, isError = false) {
            const div = document.createElement('div');
            div.style.color = isError ? 'red' : 'green';
            div.textContent = new Date().toLocaleTimeString() + ': ' + message;
            results.appendChild(div);
        }

        document.getElementById('testPing').addEventListener('click', async () => {
            try {
                addResult('Enviando PING...');
                const response = await chrome.runtime.sendMessage({ type: 'PING' });
                addResult('PING respuesta: ' + JSON.stringify(response));
            } catch (error) {
                addResult('Error PING: ' + error.message, true);
            }
        });

        document.getElementById('testGenerate').addEventListener('click', async () => {
            try {
                addResult('Enviando GENERATE_WALLET...');
                const response = await chrome.runtime.sendMessage({ type: 'GENERATE_WALLET' });
                addResult('GENERATE_WALLET respuesta: ' + JSON.stringify(response));
            } catch (error) {
                addResult('Error GENERATE_WALLET: ' + error.message, true);
            }
        });
    </script>
</body>
</html>
EOF

echo "✅ Test HTML creado: test-background.html"

echo ""
echo "📋 Instrucciones para diagnosticar:"
echo "1. Recarga la extensión en Chrome"
echo "2. Abre chrome://extensions/"
echo "3. Busca 'CodeCrypto Wallet'"
echo "4. Haz clic en 'Inspect views: service worker'"
echo "5. Deberías ver la consola del background script"
echo "6. Deberías ver: 'Background script iniciado'"
echo "7. Si no aparece, hay un error en el background script"
echo ""
echo "8. También puedes abrir test-background.html en Chrome"
echo "9. Y probar los botones para ver si la comunicación funciona"
