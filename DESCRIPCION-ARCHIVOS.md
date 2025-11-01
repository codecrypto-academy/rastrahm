## Descripción funcional de archivos, clases y métodos

### src/background/background.ts
- Funcionalidad: Script de background de la extensión. Mantiene el estado del wallet en memoria, gestiona logs, maneja solicitudes de firma/transacciones y puentes RPC hacia Anvil (localhost:8545). Abre ventanas de confirmación para firmas.
- Estructuras internas:
  - `interface Account` y `interface WalletData`: Tipos locales para cuentas y estado del wallet en memoria.
  - `let walletData: WalletData`: Estado global en background (cuentas, red, mnemonic, idioma, tema, logs).
  - `const pendingSignatures: { [requestId: string]: (response: any) => void }`: Mapa de callbacks para solicitudes de firma pendientes.
- Funciones:
  - `generateTestAccounts(): Account[]`: Devuelve cuentas de prueba (Anvil).
  - `updateAccountBalances(): Promise<void>`: Actualiza balances consultando `eth_getBalance` al nodo local.
  - `addTransactionLog(transaction, hash): void`: Agrega un log de tipo transacción y persiste en `chrome.storage.local`.
  - `addLog(type, message, data?, level?): void`: Agrega logs genéricos y persiste en `chrome.storage.local`.
  - `loadLogsFromStorage(): Promise<void>`: Carga logs desde `chrome.storage.local`.
  - `handleSignatureRequest(message, sendResponse): Promise<void>`: Crea ventana `confirm.html` para solicitar aprobación de firma (personal_sign/eth_sign/eth_signTypedData_v4).
  - `handleSignatureConfirmation(message, sendResponse): void`: Resuelve la aprobación/rechazo y responde al solicitante.
  - `sendRealTransaction(transaction): Promise<any>`: Construye y envía `eth_sendTransaction` usando `anvil_impersonateAccount`. Actualiza balances y registra log.
  - Listener principal `chrome.runtime.onMessage.addListener(...)`: Maneja tipos: `PING`, `GET_WALLET_STATE`, `eth_requestAccounts`, `personal_sign`/`eth_sign`, `eth_signTypedData_v4`, `CONFIRM_SIGNATURE`, `GENERATE_WALLET`, `IMPORT_WALLET`, `IMPORT_ACCOUNT`, `SWITCH_ACCOUNT`, `SEND_TRANSACTION`, `GET_LOGS`, `CLEAR_LOGS`, `UPDATE_BALANCES`, y RPC utilitarios (`eth_getBalance`, `eth_getTransactionCount`, `eth_estimateGas`).
  - Intervalo `setInterval(...)`: Actualiza balances cada 5s si hay cuentas.
  - `loadLogsFromStorage().then(...)`: Inicialización de logs y mensaje de arranque.

### src/types/index.ts
- Funcionalidad: Tipos e interfaces compartidas del dominio del wallet.
- Tipos principales:
  - `WalletStorage`, `Account`, `Network`, `TransactionRequest`, `TypedDataDomain`, `TypedDataField`, `TypedData`, `ProviderRpcError`, `ProviderMessage`, `ProviderConnectInfo`, `WalletEvent`, `LogEntry`, `TokenInfo`, `ENSInfo`, `NotificationData`, `WalletState`, `Message`, `EIP6963ProviderInfo`, `EIP6963ProviderDetail`, `GasFees`, `InternalTransfer`, `ValidationResult`, `WalletConfig`.

### src/utils/crypto.ts (class CryptoUtils)
- Funcionalidad: Utilidades criptográficas y derivación HD (BIP-39/BIP-44) con `ethers`.
- Métodos estáticos:
  - `generateMnemonic(): string`
  - `validateMnemonic(mnemonic): boolean`
  - `deriveAccount(mnemonic, accountIndex): Account`
  - `deriveAnvilAccounts(mnemonic): Account[]`
  - `getAddressFromPrivateKey(privateKey): string`
  - `signMessage(message, privateKey): Promise<string>`
  - `signTypedData(domain, types, value, privateKey): Promise<string>`
  - `encrypt(data, password): Promise<string>` (desarrollo: base64)
  - `decrypt(encryptedData, password): Promise<string>` (desarrollo: base64)
  - `hash(data): string`
  - `isValidAddress(address): boolean`
  - `toChecksumAddress(address): string`
  - `formatAddress(address, startChars?, endChars?): string`
  - `weiToEther(wei): string`
  - `etherToWei(ether): string`
  - `generateNonce(): string`

### src/utils/logger.ts (class Logger)
- Funcionalidad: Sistema de logging con singleton en memoria + persistencia en `StorageUtils`.
- Propiedades:
  - `private static instance: Logger`
  - `private logs: LogEntry[]`
- Métodos:
  - `static getInstance(): Logger`
  - `private generateId(): string`
  - `private createLogEntry(type, message, data?, level?): LogEntry`
  - `logCall(method, params?): Promise<void>`
  - `logEvent(eventType, data?): Promise<void>`
  - `logError(error, context?): Promise<void>`
  - `logOperation(operation, data?): Promise<void>`
  - `logWarning(message, data?): Promise<void
  - `getLogs(): Promise<LogEntry[]>`
  - `getLogsByType(type): Promise<LogEntry[]>`
  - `getLogsByLevel(level): Promise<LogEntry[]>`
  - `clearLogs(): Promise<void>`
  - `exportLogs(): Promise<string>`
  - `formatLog(log): string`
  - `getLogStats(): Promise<{ total; byType; byLevel; errors; warnings; }>`

### src/utils/storage.ts (class StorageUtils)
- Funcionalidad: Capa de acceso a `chrome.storage.local` para estado del wallet, logs y notificaciones.
- Constantes: `STORAGE_KEY = 'codecrypto_wallet'`.
- Métodos principales:
  - Wallet: `getWalletData()`, `setWalletData(data)`, `getMnemonic()`, `setMnemonic(mnemonic)`, `getAccounts()`, `setAccounts(accounts)`, `getCurrentAccount()`, `setCurrentAccount(index)`, `getChainId()`, `setChainId(chainId)`, `getNetworks()`, `setNetworks(networks)`, `getTheme()`, `setTheme(theme)`, `getLanguage()`, `setLanguage(language)`.
  - Logs: `getLogs()`, `addLog(log)`, `clearLogs()`.
  - Notificaciones: `getNotifications()`, `addNotification(notification)`, `clearNotifications()`.
  - Mantenimiento: `resetWallet()`.
  - Internos por defecto: `getDefaultWalletData()`, `getDefaultNetworks()`.
  - Eventos: `onStorageChanged(callback)`, `removeStorageListener(callback)`.

### src/utils/validation.ts (class ValidationUtils)
- Funcionalidad: Validaciones para direcciones, montos, transacciones, EIP-712, mnemonic, nombres/URLs/redes, etc.
- Métodos estáticos:
  - `validateAddress(address): ValidationResult`
  - `validateAmount(amount, balance?): ValidationResult`
  - `validateTransaction(tx: TransactionRequest): ValidationResult`
  - `validateTypedData(typedData: TypedData): ValidationResult`
  - `validateMnemonic(mnemonic): ValidationResult`
  - `validateAccountName(name): ValidationResult`
  - `validateRpcUrl(url): ValidationResult`
  - `validateChainId(chainId): ValidationResult`
  - `validateNetworkName(name): ValidationResult`
  - `validateCurrencySymbol(symbol): ValidationResult`
  - `validateDecimals(decimals): ValidationResult`
  - `validateEnsName(name): ValidationResult`

### src/utils/ens.ts (class ENSUtils)
- Funcionalidad: Resolución ENS (dirección<->nombre), lectura de textos, verificación de soporte por red.
- Constantes: `ENS_ADDRESSES`, `ENS_REGISTRY_ABI`, `ENS_RESOLVER_ABI`.
- Métodos:
  - `resolveName(name, provider): Promise<string|null>`
  - `resolveAddress(address, provider): Promise<string|null>`
  - `getENSInfo(name, provider): Promise<{...}>`
  - `getENSText(name, key, provider): Promise<string|null>`
  - `isValidENSName(name): boolean`
  - `normalizeENSName(name): string`
  - `getNameHash(name): string`
  - `isENSSupported(chainId): boolean`
  - `getENSAddress(chainId): string|null`
  - `resolveMultipleNames(names, provider): Promise<Record<string,string|null>>`
  - `getENSAvatar(name, provider): Promise<string|null>`
  - `getENSDescription(name, provider): Promise<string|null>`
  - `getENSURL(name, provider): Promise<string|null>`

### src/utils/erc20.ts (class ERC20Utils)
- Funcionalidad: Interacción con contratos ERC-20: metadatos, balances, transferencias, allowance y utilidades.
- Constantes: `ERC20_ABI`, `POPULAR_TOKENS`.
- Métodos:
  - `getTokenInfo(tokenAddress, provider): Promise<TokenInfo>`
  - `getTokenBalance(tokenAddress, ownerAddress, provider): Promise<string>`
  - `getTokenInfoWithBalance(tokenAddress, ownerAddress, provider): Promise<TokenInfo>`
  - `transferTokens(tokenAddress, to, amount, privateKey, provider): Promise<string>`
  - `approveTokens(tokenAddress, spender, amount, privateKey, provider): Promise<string>`
  - `getAllowance(tokenAddress, owner, spender, provider): Promise<string>`
  - `formatTokenBalance(balance, decimals): string`
  - `parseTokenAmount(amount, decimals): string`
  - `isValidERC20Token(tokenAddress, provider): Promise<boolean>`
  - `getMultipleTokenBalances(tokenAddresses, ownerAddress, provider): Promise<TokenInfo[]>`
  - `getPopularTokens(chainId): TokenInfo[]`
  - `searchTokens(tokens, query): TokenInfo[]`
  - `calculateTotalValue(tokens, prices): number`

### src/utils/i18n.ts (class I18nUtils)
- Funcionalidad: Internacionalización basada en JSON (`es.json`, `en.json`), idioma actual, utilidades de formato.
- Constantes: `LANGUAGE_KEY`, `DEFAULT_LANGUAGE`, `translations`.
- Métodos:
  - Idioma: `getCurrentLanguage()`, `setLanguage(language)`, `applyLanguage(language)`, `initializeLanguage()`, `toggleLanguage()`, `getBrowserLanguage()`, `setBrowserLanguage()`.
  - Traducción: `t(key, params?)`, `getTranslations(language)`, `getTranslationKeys()`, `hasTranslation(key, language?)`.
  - Info y formato: `getLanguageInfo()`, `formatNumber(number, options?)`, `formatDate(date, options?)`, `formatCurrency(amount, currency?, options?)`.

### src/utils/theme.ts (class ThemeUtils)
- Funcionalidad: Gestión de tema claro/oscuro, aplicación de variables CSS, preferencias del sistema y por hora.
- Constantes: `THEME_KEY`, `DEFAULT_THEME`.
- Métodos:
  - Tema: `getCurrentTheme()`, `setTheme(theme)`, `applyTheme(theme)`, `toggleTheme()`, `initializeTheme()`.
  - Variables CSS: `getThemeVariables(theme)`, `applyThemeVariables(theme)`.
  - Sistema/hora: `getSystemTheme()`, `setSystemTheme()`, `watchSystemTheme(callback)`, `getContrast(color)`, `getComplementaryColor(color)`, `getTimeBasedTheme()`, `setTimeBasedTheme()`, `getThemeInfo()`.

### src/inpage/inpage.ts (class CodeCryptoProvider)
- Funcionalidad: Provider EIP-1193 inyectado en páginas; puentea mensajes al background via `window.postMessage` y recibe respuestas; también implementa EIP-6963 (descubrimiento de providers).
- Propiedades privadas: `isConnected`, `_chainId`, `_accounts`, `listeners`, `pendingRequests`.
- Métodos privados:
  - `setupMessageListener()`: Escucha `CODECRYPTO_RESPONSE` desde el content script.
  - `handleResponse(data)`: Resuelve o rechaza promesas de `pendingRequests`.
  - `sendMessage(type, data?)`: Envía solicitud vía `window.postMessage` y timeout.
  - `emit(event, ...args)`: Emite eventos a listeners registrados.
  - Descubrimiento EIP-6963: `announceProvider()`.
- API pública EIP-1193 (`request({ method, params })`) con soporte para métodos: `eth_requestAccounts`, `eth_accounts`, `eth_chainId`, `eth_sendTransaction`, `eth_sign`, `personal_sign`, `eth_signTypedData_v4`, `eth_getBalance`, `eth_getTransactionCount`, `eth_estimateGas`, `eth_gasPrice`, `eth_feeHistory`, `eth_blockNumber`, `eth_getBlockByNumber`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_call`, `eth_getCode`, `eth_getStorageAt`, `wallet_switchEthereumChain`, `wallet_addEthereumChain`, `wallet_getPermissions`, `wallet_requestPermissions`.
- Listeners: `on(event, listener)`, `removeListener(event, listener)`, `once(event, listener)`.
- Inyección en `window`: siempre como `window.codecrypto` y como `window.ethereum` solo si no existe otro.

### src/content/content.ts
- Funcionalidad: Content script que inyecta `inpage.js` en el contexto de la página y hace de puente entre `window` y `chrome.runtime`.
- Funciones/eventos:
  - `injectInpageScript()`: Inserta el script `inpage.js`.
  - `window.addEventListener('message', ...)`: Reenvía `CODECRYPTO_REQUEST` al background y responde a la página con `CODECRYPTO_RESPONSE`.
  - `chrome.runtime.onMessage.addListener(...)`: Reenvía respuestas desde background al `window`.

### src/confirm/confirm.ts
- Funcionalidad: Lógica de la ventana de confirmación de firmas (mensaje o EIP-712). Lee parámetros de la URL, pinta datos y envía aprobación o rechazo al background.
- Tipos: `interface ConfirmData`.
- Acciones:
  - Parseo de `confirmData` desde query `?data=...`.
  - Renderizado de campos (sitio, cuenta, mensaje/datos tipados).
  - Botones `approve` y `reject` que envían `CONFIRM_SIGNATURE` a `chrome.runtime`.

### src/components/WalletProvider.tsx (React Context)
- Funcionalidad: Provee estado y acciones del wallet a la UI. Se comunica con `background.ts` con `chrome.runtime.sendMessage`.
- Estado expuesto: `state`, `accounts`, `currentAccount`, `currentNetwork`, `networks`, `logs`, `isLoading`, `error`.
- Acciones expuestas:
  - `generateWallet()`, `importWallet(mnemonic)`, `switchAccount(accountIndex)`, `switchNetwork(chainId)`, `addNetwork(network)`, `sendTransaction(transaction)`, `signMessage(address, message)`, `signTypedData(address, typedData)`, `getBalance(address)`, `resetWallet()`, `loadWalletState()`, `loadLogs()`, `clearLogs()`.
- Implementación: maneja carga inicial (`GET_WALLET_STATE`) y sincroniza estado tras cada acción.

### src/components/TransactionForm.tsx
- Funcionalidad: Formulario para enviar transacciones, con validaciones, modo EIP-1559 opcional y modal de confirmación.
- Estado local: `formData`, `isLoading`, `useEIP1559`, `showConfirmation`, `pendingTransaction`.
- Callbacks:
  - `handleInputChange(field, value)`, `handleSubmit(e)`, `handleConfirmTransaction()`, `handleCancelTransaction()`.
  - Convierte gas units a `gwei` con `ethers.parseUnits` cuando corresponde.

### src/components/TransactionConfirmation.tsx
- Funcionalidad: Modal de confirmación previa al envío. Muestra `from`, `to`, `value`, gas y datos.
- Props: `isOpen`, `onClose`, `onConfirm`, `transaction`, `fromAddress`, `isLoading`.
- Utilidades internas: `formatValue(value)`, `formatAddress(address)`.

### src/components/AccountSelector.tsx
- Funcionalidad: Selector desplegable de cuentas con nombre, dirección formateada y balance.
- Estado local: `isOpen`, `displayBalance`.
- Efectos: Formatea balance cuando cambia la cuenta actual.
- Acciones: `handleAccountSelect(accountIndex)`.

### src/components/NetworkSelector.tsx
- Funcionalidad: Selector de redes disponible; permite cambio de red.
- Estado local: `isOpen`.
- Acciones: `handleNetworkSelect(chainId)`.
- Utilidades: `getNetworkIcon(network)`, `getNetworkStatus(network)`.

### src/components/Header.tsx
- Funcionalidad: Cabecera con título, estado bloqueado/desbloqueado, cuenta actual y red actual (opcionales).
- Utilidades: `formatAddress(address)`, `formatBalance(balance)`.

### src/components/LogsViewer.tsx
- Funcionalidad: Visor de logs con filtros por tipo/nivel, búsqueda y acciones de refrescar/exportar/limpiar.
- Estado local: `filter`, `level`, `searchTerm`.
- Utilidades: `filteredLogs`, `formatTimestamp(timestamp)`, `getLogIcon(type, level)`, `getLogColor(level)`, `getStats()`.

### src/components/WalletSetup.tsx
- Funcionalidad: Flujo de configuración inicial del wallet: crear o importar mnemonic, mostrar advertencias, y finalizar.
- Estado local: `step`, `mnemonic`, `importMnemonic`, `isLoading`, `showMnemonic`.
- Acciones: `handleGenerateWallet()`, `handleImportWallet()`, `handleComplete()`, `copyMnemonic()`.

### src/popup/popup.tsx
- Funcionalidad: UI principal del popup con pestañas Wallet/Send/Logs/Config.
- Componentes: `Header`, `WalletSetup`, `AccountSelector`, `NetworkSelector`, `TransactionForm`, `LogsViewer`.
- Estado local UI: `activeTab`, `theme`, `language`, `showAddNetwork`, `showImportAccount`, `importAccountName`, `importPrivateKey`.
- Acciones principales: sincronizar estado (`loadWalletState`), copiar dirección, ver balance rápido, cambiar tema/idioma, importar cuenta vía background.

### src/notification/notification.tsx
- Funcionalidad: UI de notificaciones en una ventana dedicada; pestañas: Notificaciones, Logs, Errores.
- Componentes: `Header`, `LogsViewer`.
- Estado local: `activeTab`, `notifications` (simuladas en este build).
- Utilidades: `formatTimestamp`, `getNotificationIcon`, `getNotificationColor`.

### src/connect/connect.tsx
- Funcionalidad: Pantalla de estado de conexión de dApps, muestra cuenta/red actual y solicitudes simuladas.
- Componentes: `Header`, `AccountSelector`, `NetworkSelector`.
- Estado local: `pendingRequests`, `requests`.

### src/content/*.html, src/popup/*.html, src/confirm/*.html, src/notification/*.html
- Plantillas HTML que cargan los bundles correspondientes y contienen contenedores raíz para React o vistas vanilla, con atributos `data-i18n` para textos traducibles.

### Notas
- Archivos en `dist/` son artefactos compilados (no documentados aquí).
- `manifest.json` define permisos, scripts y páginas de la extensión.
