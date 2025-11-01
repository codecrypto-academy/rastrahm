# CodeCrypto Wallet

Un wallet completo para Chrome Extension v3 con soporte para Ethereum, implementando los estándares EIP-1193, EIP-712, EIP-1559 y EIP-6963.

## 🚀 Características

### Funcionalidades Principales
- ✅ **Generación y recuperación de wallet** con mnemonic BIP-39 (12 palabras)
- ✅ **Derivación de claves** BIP-44 para múltiples cuentas
- ✅ **5 cuentas HD** derivadas automáticamente
- ✅ **Almacenamiento seguro** con chrome.storage.local
- ✅ **Inyección de provider** window.codecrypto en todas las páginas
- ✅ **Soporte completo EIP-1193** para dApps
- ✅ **Firma de transacciones** eth_sendTransaction
- ✅ **Firma de mensajes EIP-712** eth_signTypedData_v4
- ✅ **Eventos accountsChanged y chainChanged**
- ✅ **Actualización de balances** cada 5 segundos
- ✅ **Sistema de logs** completo
- ✅ **Soporte EIP-1559** para gas dinámico
- ✅ **Anuncio EIP-6963** para multi-wallet
- ✅ **Transferencias internas**
- ✅ **Validación de formularios**
- ✅ **Auto-carga y restauración** de estado

### Estándares Implementados
- **EIP-1193**: Provider Ethereum estándar
- **EIP-712**: Firma de datos tipados
- **EIP-1559**: Gas dinámico (maxFeePerGas, maxPriorityFeePerGas)
- **EIP-6963**: Descubrimiento de providers
- **BIP-39**: Mnemonic de 12 palabras
- **BIP-44**: Derivación de claves HD

### Interfaz de Usuario
- **Popup principal** (`popup.html`) - Gestión del wallet
- **Ventana de conexión** (`connect.html`) - Conexión con dApps
- **Ventana de notificaciones** (`notification.html`) - Logs y eventos
- **Páginas de pruebas** (`test.html` y `test-provider.html`) - Testing
- **Tema claro/oscuro** (preparado)
- **Soporte multiidioma** Español/Inglés (preparado)

## 🛠️ Tecnologías

- **React 18** - Interfaz de usuario
- **TypeScript** - Tipado estático
- **Ethers.js v6** - Interacción con Ethereum
- **Chrome Extension v3** - API de Chrome
- **Webpack** - Bundling
- **BIP-39/HDKey** - Criptografía

## 📦 Instalación

### Prerrequisitos
- Node.js 16+
- npm o yarn
- Chrome/Chromium
- Anvil (Foundry) ejecutándose en localhost:8545

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd rs-chrome-wallet
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Compilar el proyecto**
```bash
npm run build
```

4. **Cargar la extensión en Chrome**
   - Abrir Chrome y ir a `chrome://extensions/`
   - Activar "Modo de desarrollador"
   - Hacer clic en "Cargar extensión sin empaquetar"
   - Seleccionar la carpeta `dist/`

5. **Configurar Anvil**
```bash
# Instalar Foundry si no lo tienes
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Ejecutar Anvil
anvil
```

6. **(Opcional) Servir páginas de prueba por HTTP**
```bash
./serve-test.sh
# Abrir en el navegador:
# http://localhost:8000/test-provider.html (pruebas básicas del provider)
# http://localhost:8000/test.html (suite completa)
```

## 🎯 Uso

### Configuración Inicial

1. **Abrir el popup** del wallet haciendo clic en el icono de la extensión
2. **Crear nuevo wallet** o **importar wallet existente**
3. **Guardar la frase mnemónica** de forma segura
4. **Seleccionar cuenta** de las 5 disponibles
5. **Verificar conexión** a Anvil (localhost:8545)

### Funcionalidades Principales

#### Gestión de Cuentas
- Cambiar entre las 5 cuentas derivadas
- Ver balance en tiempo real
- Copiar dirección de cuenta

#### Envío de Transacciones
- Enviar ETH a cualquier dirección
- Configurar gas manualmente o usar EIP-1559
- Validación automática de formularios

#### Conexión con dApps
- El provider se inyecta automáticamente
- Ventana de conexión para aprobar solicitudes
- Soporte completo para MetaMask-compatible dApps

#### Firma de Mensajes
- Firma de mensajes simples
- Firma de datos tipados EIP-712
- Validación de permisos

### Páginas Disponibles

#### Popup Principal (`popup.html`)
- Gestión del wallet
- Envío de transacciones
- Configuración
- Logs del sistema

#### Ventana de Conexión (`connect.html`)
- Estado de conexión
- Solicitudes pendientes
- Cambio de cuenta/red

#### Notificaciones (`notification.html`)
- Logs de llamadas
- Logs de eventos
- Logs de errores
- Logs de operaciones

#### Páginas de Pruebas
- `test-provider.html`: pruebas básicas del provider (recomendado para verificar inyección y cuentas)
- `test.html`: suite completa (conexión, balances, firmas, eventos, red)
- Nota: sirve estas páginas por HTTP (no `file://`) para que funcione el content script

## 🔧 Desarrollo

### Estructura del Proyecto

```
src/
├── background/          # Service Worker
├── content/            # Content Script
├── inpage/             # Provider inyectado
├── popup/              # Popup principal
├── connect/            # Ventana de conexión
├── notification/       # Ventana de notificaciones
├── test/               # Página de pruebas
├── components/         # Componentes React
├── utils/              # Utilidades
└── types/              # Tipos TypeScript
```

Archivos raíz relevantes:
- `manifest.json` (copiado a `dist/` en build)
- `webpack.config.js` (entry points y HTMLs)
- `serve-test.sh` (servidor HTTP simple para pruebas)
- `ARQUITECTURA-CODECRYPTO-WALLET.md` (documentación completa)

### Scripts Disponibles

```bash
# Desarrollo con watch
npm run dev

# Compilación de producción
npm run build

# Limpiar dist
npm run clean
```

### Comunicación y Arquitectura (Resumen)

- Inyección del provider:
  - `src/inpage/inpage.ts` inyecta `window.codecrypto` y (si no existe) `window.ethereum`
- Puente de mensajes:
  - Página Web ↔ Inpage Script: `window.postMessage`
  - Inpage ↔ Content Script: `CODECRYPTO_REQUEST/CODECRYPTO_RESPONSE`
  - Content ↔ Background: `chrome.runtime.sendMessage`
- Background maneja RPCs como `eth_requestAccounts`, `eth_getBalance`, `eth_getTransactionCount`, `eth_estimateGas` y firmas.

Consulta la documentación extendida en `ARQUITECTURA-CODECRYPTO-WALLET.md`.

### Configuración de Redes

El wallet viene preconfigurado con:
- **Anvil Local** (Chain ID: 31337) - Red de desarrollo
- **Ethereum Mainnet** (Chain ID: 1) - Red principal
- **Sepolia Testnet** (Chain ID: 11155111) - Red de pruebas

Puedes agregar más redes desde la configuración.

## 🔒 Seguridad

### Almacenamiento
- **Mnemonic**: Almacenado en chrome.storage.local (sin encriptación para desarrollo)
- **Claves privadas**: Derivadas del mnemonic, no almacenadas directamente
- **Configuración**: Persistida en chrome.storage.local

### Validaciones
- Validación de direcciones Ethereum
- Validación de montos y balances
- Validación de transacciones
- Validación de datos EIP-712

## 🧪 Testing

### Páginas de Pruebas
- `test-provider.html` (recomendada): detección del provider, conexión y balance.
- `test.html`: pruebas de conexión, cuentas, balances, firmas (EIP-712), estimación de gas, eventos y red.

### Pruebas Manuales
1. Ejecutar `./serve-test.sh` y abrir `http://localhost:8000/test-provider.html` o `test.html`
2. En `test.html`, usar "Ejecutar Todas las Pruebas"
3. Verificar resultados y secciones individuales

## 📋 Logs y Debugging

### Sistema de Logs
- **Logs de llamadas**: Métodos del provider
- **Logs de eventos**: accountsChanged, chainChanged
- **Logs de errores**: Errores del sistema
- **Logs de operaciones**: Transacciones, firmas

### Acceso a Logs
- Popup principal → Pestaña "Logs"
- Ventana de notificaciones
- `test.html` usando el puente a background (GET_LOGS)

### Troubleshooting
- "chrome.runtime.sendMessage() called from a webpage must specify an Extension ID":
  - Usa `test-provider.html`/`test.html` servidos por HTTP y el puente `CODECRYPTO_REQUEST`.
- No se detecta provider:
  - Asegura que la extensión esté cargada desde `dist/` y recarga la página.
- Balances fallan:
  - Verifica que Anvil esté en `http://localhost:8545`.

## 🌐 Internacionalización (i18n)

- Traducciones en JSON por idioma:
  - `src/utils/i18n/es.json`
  - `src/utils/i18n/en.json`
- Loader en `src/utils/i18n.ts` importa estos JSON. Para agregar un nuevo idioma:
  1) Crear `src/utils/i18n/<lang>.json`
  2) Importar en `i18n.ts` y añadir a `translations`
  3) Usar `I18nUtils.setLanguage('<lang>')`

## 🚀 Próximas Funcionalidades

### En Desarrollo
- [ ] Soporte para tokens ERC-20
- [ ] Resolución de nombres ENS
- [ ] Theme switcher (claro/oscuro)
- [ ] Soporte multiidioma (ES/EN)
- [ ] Encriptación del mnemonic
- [ ] Backup y restauración
- [ ] Integración con hardware wallets

### Funcionalidades Avanzadas
- [ ] Swaps DEX
- [ ] Staking
- [ ] NFT support
- [ ] Multi-chain support
- [ ] Gas optimization
- [ ] Transaction history

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa los logs en la ventana de notificaciones
2. Ejecuta las pruebas en `test.html`
3. Verifica que Anvil esté ejecutándose
4. Comprueba la consola del navegador

## 📚 Recursos

- [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) - Provider Ethereum
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712) - Firma de datos tipados
- [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) - Gas dinámico
- [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) - Descubrimiento de providers
- [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) - Mnemonic
- [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) - Derivación HD
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - Documentación oficial
- [Ethers.js](https://docs.ethers.org/) - Librería Ethereum

---

**CodeCrypto Wallet** - Un wallet completo y moderno para Ethereum 🚀
