# Arquitectura de CodeCrypto Wallet

## Resumen General

CodeCrypto Wallet es una extensión de Chrome que implementa un wallet Ethereum completo con soporte para EIP-1193, EIP-712, EIP-1559 y EIP-6963. La aplicación está construida con TypeScript, React y Webpack, y se conecta a una red local de Anvil para pruebas.

## Estructura de Archivos

### Archivos de Configuración
- `manifest.json` - Configuración de la extensión Chrome (líneas 1-42)
- `webpack.config.js` - Configuración de compilación (líneas 1-98)
- `tsconfig.json` - Configuración de TypeScript
- `package.json` - Dependencias y scripts

### Archivos de Entrada (Entry Points)
- `src/background/background.ts` - Service Worker principal
- `src/content/content.ts` - Content Script para comunicación
- `src/inpage/inpage.ts` - Provider EIP-1193 inyectado en páginas web
- `src/popup/popup.tsx` - Interfaz principal del wallet
- `src/connect/connect.tsx` - Página de conexión dApp
- `src/notification/notification.tsx` - Centro de notificaciones
- `src/test/test.tsx` - Página de pruebas
- `src/confirm/confirm.ts` - Página de confirmación de firmas

### Componentes React
- `src/components/WalletProvider.tsx` - Context Provider principal
- `src/components/Header.tsx` - Cabecera de la interfaz
- `src/components/WalletSetup.tsx` - Configuración inicial del wallet
- `src/components/AccountSelector.tsx` - Selector de cuentas
- `src/components/NetworkSelector.tsx` - Selector de redes
- `src/components/TransactionForm.tsx` - Formulario de transacciones
- `src/components/TransactionConfirmation.tsx` - Confirmación de transacciones
- `src/components/LogsViewer.tsx` - Visor de logs

### Utilidades
- `src/types/index.ts` - Definiciones de tipos TypeScript
- `src/utils/crypto.ts` - Funciones criptográficas
- `src/utils/storage.ts` - Gestión de almacenamiento
- `src/utils/logger.ts` - Sistema de logging
- `src/utils/validation.ts` - Validaciones
- `src/utils/ens.ts` - Soporte ENS
- `src/utils/erc20.ts` - Tokens ERC-20
- `src/utils/i18n.ts` - Internacionalización
- `src/utils/theme.ts` - Gestión de temas

## Arquitectura de la Aplicación

### 1. Service Worker (Background Script)
**Archivo**: `src/background/background.ts` (líneas 1-626)

**Responsabilidades**:
- Gestión del estado global del wallet
- Comunicación con la red Anvil (localhost:8545)
- Manejo de transacciones reales usando `anvil_impersonateAccount`
- Gestión de logs y almacenamiento
- Procesamiento de solicitudes RPC

**Flujo Principal**:
1. Inicialización con cuentas de prueba de Anvil (líneas 66-85)
2. Listener de mensajes `chrome.runtime.onMessage` (líneas 371-710)
3. Actualización automática de balances cada 5 segundos (líneas 711-715)
4. Carga de logs desde storage al inicio (líneas 718-721)

**Métodos RPC Soportados**:
- `eth_requestAccounts` (líneas 385-410)
- `eth_getBalance` (líneas 605-635)
- `eth_getTransactionCount` (líneas 638-668)
- `eth_estimateGas` (líneas 671-701)
- `personal_sign`, `eth_sign`, `eth_signTypedData_v4` (líneas 412-426)
- `SEND_TRANSACTION` (líneas 536-570)

### 2. Content Script
**Archivo**: `src/content/content.ts` (líneas 1-63)

**Responsabilidades**:
- Inyección del script inpage en páginas web
- Puente de comunicación entre inpage script y background script
- Conversión de `window.postMessage` a `chrome.runtime.sendMessage`

**Flujo de Comunicación**:
1. Inyecta `inpage.js` en el contexto de la página (líneas 6-20)
2. Escucha mensajes `CODECRYPTO_REQUEST` del inpage script (líneas 23-53)
3. Reenvía al background script via `chrome.runtime.sendMessage` (líneas 30-34)
4. Envía respuesta de vuelta via `window.postMessage` (líneas 37-51)

### 3. Inpage Script (Provider EIP-1193)
**Archivo**: `src/inpage/inpage.ts` (líneas 1-465)

**Responsabilidades**:
- Implementación del provider EIP-1193
- Inyección como `window.codecrypto` y `window.ethereum`
- Comunicación con background script via content script
- Soporte para EIP-6963 (Provider Discovery)

**Clase Principal**: `CodeCryptoProvider` (líneas 15-443)

**Métodos Principales**:
- `request()` - Interfaz EIP-1193 principal (líneas 103-183)
- `eth_requestAccounts()` - Solicitar acceso a cuentas (líneas 188-196)
- `eth_getBalance()` - Obtener balance (líneas 237-240)
- `eth_sendTransaction()` - Enviar transacciones (líneas 201-208)
- `personal_sign()` - Firmar mensajes (líneas 213-220)
- `eth_signTypedData_v4()` - Firmar datos tipados EIP-712 (líneas 225-232)

**Inyección en Window**:
- `window.codecrypto` - Provider específico del wallet (línea 450)
- `window.ethereum` - Solo si no existe otro provider (líneas 453-455)

### 4. Interfaz Principal (Popup)
**Archivo**: `src/popup/popup.tsx` (líneas 1-593)

**Componentes**:
- `PopupContent` - Componente principal (líneas 12-543)
- Pestañas: wallet, send, logs, settings
- Integración con `WalletProvider` para estado global

**Funcionalidades**:
- Configuración inicial del wallet
- Selección de cuentas y redes
- Envío de transacciones
- Visualización de logs
- Configuración de tema e idioma

### 5. Wallet Provider (Context)
**Archivo**: `src/components/WalletProvider.tsx` (líneas 1-352)

**Responsabilidades**:
- Gestión del estado global del wallet
- Comunicación con background script
- Proporcionar contexto a todos los componentes React

**Estado Principal**:
- `WalletState` - Estado del wallet (líneas 43-49)
- `accounts` - Lista de cuentas
- `currentAccount` - Cuenta actual
- `networks` - Redes disponibles
- `logs` - Sistema de logs

## Flujo de Solicitudes

### 1. Solicitud de Cuentas (eth_requestAccounts)

```
Página Web → window.codecrypto.request({method: 'eth_requestAccounts'})
    ↓
Inpage Script (inpage.ts:103-183)
    ↓
window.postMessage({type: 'CODECRYPTO_REQUEST', method: 'eth_requestAccounts'})
    ↓
Content Script (content.ts:23-53)
    ↓
chrome.runtime.sendMessage({type: 'eth_requestAccounts'})
    ↓
Background Script (background.ts:385-410)
    ↓
Genera cuentas de prueba si no existen
    ↓
Respuesta: {success: true, accounts: [...]}
    ↓
Content Script → window.postMessage({type: 'CODECRYPTO_RESPONSE'})
    ↓
Inpage Script → Resuelve Promise con cuentas
    ↓
Página Web recibe cuentas
```

### 2. Solicitud de Balance (eth_getBalance)

```
Página Web → window.codecrypto.request({method: 'eth_getBalance', params: [address]})
    ↓
Inpage Script (inpage.ts:237-240)
    ↓
window.postMessage({type: 'CODECRYPTO_REQUEST', method: 'eth_getBalance'})
    ↓
Content Script (content.ts:30-34)
    ↓
chrome.runtime.sendMessage({type: 'eth_getBalance'})
    ↓
Background Script (background.ts:605-635)
    ↓
Fetch a http://localhost:8545 con eth_getBalance
    ↓
Respuesta: {success: true, balance: '0x...'}
    ↓
Content Script → window.postMessage({type: 'CODECRYPTO_RESPONSE'})
    ↓
Inpage Script → Resuelve Promise con balance
    ↓
Página Web recibe balance
```

### 3. Solicitud de Firma (personal_sign)

```
Página Web → window.codecrypto.request({method: 'personal_sign', params: [message, address]})
    ↓
Inpage Script (inpage.ts:121-123)
    ↓
window.postMessage({type: 'CODECRYPTO_REQUEST', method: 'personal_sign'})
    ↓
Content Script (content.ts:30-34)
    ↓
chrome.runtime.sendMessage({type: 'personal_sign'})
    ↓
Background Script (background.ts:412-426)
    ↓
Abre ventana de confirmación (confirm.html)
    ↓
Usuario aprueba/rechaza
    ↓
Background Script genera firma simulada
    ↓
Respuesta: {success: true, signature: '0x...'}
    ↓
Content Script → window.postMessage({type: 'CODECRYPTO_RESPONSE'})
    ↓
Inpage Script → Resuelve Promise con firma
    ↓
Página Web recibe firma
```

### 4. Envío de Transacción Real

```
Popup → sendTransaction(transaction)
    ↓
WalletProvider (WalletProvider.tsx:200-220)
    ↓
chrome.runtime.sendMessage({type: 'SEND_TRANSACTION'})
    ↓
Background Script (background.ts:536-570)
    ↓
anvil_impersonateAccount(address)
    ↓
eth_sendTransaction a http://localhost:8545
    ↓
Actualiza balances automáticamente
    ↓
Respuesta: {success: true, hash: '0x...'}
    ↓
Popup recibe confirmación
```

## Sistema de Logs

**Archivo**: `src/utils/logger.ts`

**Flujo**:
1. Background script genera logs (líneas 156-173 en background.ts)
2. Almacena en `walletData.logs` array
3. Persiste en `chrome.storage.local` con clave `codecrypto_logs`
4. Carga logs al inicio del background script (líneas 718-721)

**Tipos de Logs**:
- `operation` - Operaciones del wallet
- `transaction` - Transacciones enviadas
- `event` - Eventos del sistema
- `error` - Errores

## Gestión de Estado

### Estado Global (WalletProvider)
- **Archivo**: `src/components/WalletProvider.tsx` (líneas 43-49)
- **Persistencia**: `chrome.storage.local`
- **Sincronización**: Automática entre popup y background

### Estado Local (Background)
- **Archivo**: `src/background/background.ts` (líneas 28-63)
- **Actualización**: Cada 5 segundos para balances (líneas 711-715)
- **Inicialización**: Cuentas de prueba de Anvil (líneas 66-85)

## Comunicación Entre Scripts

### 1. Página Web ↔ Inpage Script
- **Método**: `window.codecrypto.request()`
- **Protocolo**: EIP-1193

### 2. Inpage Script ↔ Content Script
- **Método**: `window.postMessage`
- **Mensajes**: `CODECRYPTO_REQUEST`, `CODECRYPTO_RESPONSE`

### 3. Content Script ↔ Background Script
- **Método**: `chrome.runtime.sendMessage`
- **Persistencia**: `chrome.storage.local`

### 4. Popup ↔ Background Script
- **Método**: `chrome.runtime.sendMessage`
- **Contexto**: Extension popup

## Configuración de Red

### Red Principal
- **Chain ID**: 31337 (Anvil Local)
- **RPC URL**: http://localhost:8545
- **Cuentas**: Generadas automáticamente desde Anvil

### Cuentas de Prueba
- **Account 1**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Account 2**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Balance**: 10000 ETH cada una

## Compilación y Build

### Webpack Configuration
- **Archivo**: `webpack.config.js` (líneas 1-98)
- **Entry Points**: 8 archivos principales
- **Output**: `dist/` directory
- **Plugins**: HtmlWebpackPlugin, CopyWebpackPlugin

### Scripts de Build
```bash
npm run build    # Compilación de producción
npm run dev      # Compilación de desarrollo
```

## Archivos de Prueba

### Test Files
- `test.html` - Suite completa de pruebas
- `test-provider.html` - Pruebas básicas del provider
- `debug-logs.html` - Visor de logs
- `serve-test.sh` - Script para servidor HTTP local

### Pruebas Disponibles
- Detección de provider
- Conexión y cuentas
- Balances y transacciones
- Firmas de mensajes
- Comunicación con background script

## Consideraciones de Seguridad

### 1. Content Scripts
- Solo se ejecutan en contextos web (no en archivos locales)
- Requieren servidor HTTP para pruebas

### 2. Provider Injection
- `window.codecrypto` siempre disponible
- `window.ethereum` solo si no existe otro provider

### 3. Transacciones
- Usan `anvil_impersonateAccount` para pruebas
- No requieren claves privadas reales

## Dependencias Principales

### Runtime
- **ethers**: Librería Ethereum
- **React**: Interfaz de usuario
- **TypeScript**: Tipado estático

### Build
- **Webpack**: Bundler
- **ts-loader**: Compilador TypeScript
- **HtmlWebpackPlugin**: Generación de HTML

### Chrome Extension
- **Manifest V3**: Última versión
- **Service Worker**: Background script
- **Content Scripts**: Inyección en páginas
