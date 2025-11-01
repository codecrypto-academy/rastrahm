# Instrucciones para Crear Diagrama en DIA

## Método 1: Usar el archivo XML generado

1. Abrir DIA
2. File → Open → Seleccionar `ARQUITECTURA_WALLET.dia`
3. Si hay problemas con el formato, seguir el Método 2

## Método 2: Crear manualmente (Recomendado)

### Pasos:

1. **Abrir DIA** y crear un nuevo diagrama

2. **Agregar componentes principales** (usando Boxes/Cajas):
   
   ```
   Background Service Worker (centro-izquierda)
   Popup (centro)
   Content Script (abajo-centro)
   Inpage Script (abajo-derecha)
   dApp (extremo izquierdo)
   Anvil (extremo derecho-arriba)
   chrome.storage (extremo derecho-abajo)
   ```

3. **Agregar texto a cada caja**:
   
   - **Background Service Worker**:
     ```
     • Gestiona estado del wallet
     • Maneja mensajes
     • Conecta con Anvil
     • Almacena datos en chrome.storage
     ```
   
   - **Popup**:
     ```
     • WalletProvider (Context)
     • Gestión de cuentas
     • Envío de transacciones
     • Configuración (tema/idioma)
     ```
   
   - **Content Script**:
     ```
     • Inyecta inpage.js en el DOM
     • Intercepta window.ethereum
     • Comunica con background
     ```
   
   - **Inpage Script**:
     ```
     • Implementa window.ethereum
     • EIP-1193 Provider
     • EIP-6963 Discovery
     • Comunicación con background via postMessage
     ```
   
   - **dApp**:
     ```
     • Solicita conexión
     • eth_requestAccounts
     • eth_sendTransaction
     • personal_sign
     • eth_signTypedData_v4
     ```
   
   - **Anvil**:
     ```
     Anvil
     localhost:8545
     ```
   
   - **chrome.storage.local**:
     ```
     chrome.storage.local
     • walletData
     • logs
     ```

4. **Agregar flechas de comunicación** (usando Lines/Flechas):

   - **Popup → Background** (azul)
     - Texto: "chrome.runtime.sendMessage()"
   
   - **Content → Background** (verde)
     - Texto: "chrome.runtime.sendMessage()"
   
   - **Inpage → Content** (rojo)
     - Texto: "window.postMessage()"
   
   - **dApp → Inpage** (magenta)
     - Texto: "window.ethereum (EIP-1193)"
   
   - **Background → Anvil** (naranja)
     - Texto: "HTTP/JSON-RPC (eth_getBalance, eth_sendTransaction)"
   
   - **Background → chrome.storage** (verde oscuro)
     - Texto: "chrome.storage.local.set() / .get()"

5. **Agregar leyenda** (esquina inferior derecha):
   
   ```
   LEYENDA:
   Azul: Popup ↔ Background
   Verde: Content ↔ Background
   Rojo: Inpage ↔ Content
   Magenta: dApp ↔ Inpage
   Naranja: Background ↔ Anvil
   Verde Oscuro: Background ↔ Storage
   ```

6. **Agregar título**: 
   - "CodeCrypto Wallet - Arquitectura de Componentes"

## Método 3: Usar formato SVG/Draw.io

Si prefieres, puedo generar también una versión para Draw.io (XML) que es más compatible.

## Colores sugeridos:

- **Fondo de cajas**: Gris claro (#f0f0f0)
- **Bordes**: Negro (#000000)
- **Texto**: Negro (#000000)
- **Flechas**:
  - Azul (#0000ff) - Popup/Background
  - Verde (#00ff00) - Content/Background
  - Rojo (#ff0000) - Inpage/Content
  - Magenta (#ff00ff) - dApp/Inpage
  - Naranja (#ff8800) - Background/Anvil
  - Verde oscuro (#008800) - Background/Storage

