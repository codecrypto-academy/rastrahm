# 🔐 Sistema de Escrow para Intercambios de ETH

Sistema descentralizado de escrow (depósito en garantía) para intercambios seguros de ETH entre dos partes. Este proyecto implementa un contrato inteligente que actúa como intermediario confiable, asegurando que ambas partes cumplan con sus obligaciones antes de completar un intercambio.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Desarrollo](#-desarrollo)

## ✨ Características

- **Intercambios Seguros**: Sistema de escrow que garantiza la seguridad de ambas partes
- **Solo ETH Nativo**: Soporte exclusivo para intercambios de ETH nativo (no ERC20)
- **Interfaz Web Moderna**: DApp construida con Next.js y Tailwind CSS
- **Modo Oscuro**: Soporte completo para tema claro/oscuro
- **Integración con MetaMask**: Conexión directa con wallets mediante MetaMask
- **Desarrollo Local**: Configuración completa para desarrollo con Anvil (Foundry)

## 🏗️ Arquitectura

El proyecto está dividido en dos partes principales:

### Smart Contracts (`sc/`)
- **Escrow.sol**: Contrato principal que gestiona las operaciones de intercambio
- **MockERC20.sol**: Token ERC20 de prueba para desarrollo
- **SimpleSwap.sol**: Contrato auxiliar para swaps (actualmente no utilizado en producción)

### Frontend (`web/`)
- **Next.js 16**: Framework React con App Router
- **Ethers.js v6**: Biblioteca para interactuar con la blockchain
- **TypeScript**: Tipado estático para mayor seguridad
- **Tailwind CSS**: Estilos modernos y responsivos

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v18 o superior)
- **Foundry** (para compilar y desplegar contratos)
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```
- **MetaMask** (extensión del navegador)

## 🚀 Instalación

1. **Clonar el repositorio** (o navegar al directorio del proyecto):
   ```bash
   cd escrow
   ```

2. **Instalar dependencias del frontend**:
   ```bash
   cd web
   npm install
   cd ..
   ```

3. **Instalar dependencias de Foundry**:
   ```bash
   cd sc
   forge install
   cd ..
   ```

## 💻 Uso

### Inicio Rápido

El proyecto incluye un script de inicialización que automatiza todo el proceso:

```bash
bash init.sh
```

Este script:
- ✅ Verifica que Anvil esté corriendo (o lo inicia automáticamente)
- ✅ Compila los contratos inteligentes
- ✅ Despliega los contratos en Anvil
- ✅ Configura las variables de entorno
- ✅ Inicia el servidor de desarrollo de Next.js

### Configuración Manual

Si prefieres hacerlo paso a paso:

1. **Iniciar Anvil** (en una terminal separada):
   ```bash
   anvil
   ```

2. **Desplegar contratos**:
   ```bash
   cd sc
   forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

3. **Configurar variables de entorno**:
   ```bash
   # Copiar las direcciones de los contratos desplegados a web/.env.local
   # Formato:
   NEXT_PUBLIC_ESCROW_ADDRESS=0x...
   NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
   ```

4. **Iniciar el frontend**:
   ```bash
   cd web
   npm run dev
   ```

5. **Abrir en el navegador**:
   ```
   http://localhost:3000
   ```

### Configurar MetaMask

1. Abre MetaMask y agrega una red personalizada:
   - **Nombre**: Anvil Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Símbolo**: ETH

2. Importa una cuenta de prueba usando una de las claves privadas de Anvil (ver [Scripts Disponibles](#-scripts-disponibles))

## 📜 Scripts Disponibles

### `init.sh`

Script principal de inicialización que automatiza todo el proceso de despliegue:

```bash
bash init.sh
```

**Funcionalidades**:
- Verifica e inicia Anvil si no está corriendo
- Compila los contratos inteligentes
- Despliega Escrow, MockERC20 y SimpleSwap
- Transfiere tokens de prueba a las cuentas
- Genera `deployment-info.txt` con todas las direcciones
- Crea `web/.env.local` con las variables de entorno
- Inicia el servidor de desarrollo de Next.js

**Variables de entorno opcionales**:
- `RPC_URL`: URL del RPC (por defecto: `http://127.0.0.1:8545`)
- `PRIVATE_KEY`: Clave privada para desplegar (por defecto: cuenta 0 de Anvil)

**Ejemplo de uso con variables personalizadas**:
```bash
export RPC_URL=http://127.0.0.1:8545
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
bash init.sh
```

### `list-anvil-accounts.sh`

Script para listar todas las cuentas de Anvil con sus balances y claves privadas:

```bash
bash list-anvil-accounts.sh
```

**Salida**:
- Dirección de cada cuenta
- Balance en ETH
- Clave privada (para importar en MetaMask)

**Uso**:
Útil para obtener las claves privadas de las cuentas de prueba y configurarlas en MetaMask para desarrollo.

## 📁 Estructura del Proyecto

```
escrow/
├── sc/                          # Smart Contracts (Foundry)
│   ├── src/
│   │   ├── Escrow.sol          # Contrato principal de escrow
│   │   ├── MockERC20.sol        # Token ERC20 de prueba
│   │   └── SimpleSwap.sol       # Contrato auxiliar de swap
│   ├── script/
│   │   └── Deploy.s.sol         # Script de despliegue
│   ├── test/
│   │   └── Escrow.t.sol         # Tests del contrato
│   └── foundry.toml             # Configuración de Foundry
│
├── web/                         # Frontend (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Página principal
│   │   │   └── layout.tsx       # Layout de la aplicación
│   │   ├── components/
│   │   │   ├── CreateOperation.tsx    # Formulario para crear operaciones
│   │   │   ├── OperationsList.tsx     # Lista de operaciones
│   │   │   ├── BalanceDebug.tsx       # Debug de balances
│   │   │   ├── ConnectButton.tsx      # Botón de conexión MetaMask
│   │   │   └── ThemeToggle.tsx        # Toggle de tema claro/oscuro
│   │   └── lib/
│   │       ├── contracts.ts     # ABIs y direcciones de contratos
│   │       └── ethereum.tsx      # Hook para conexión Ethereum
│   └── package.json
│
├── init.sh                      # Script de inicialización
├── list-anvil-accounts.sh       # Script para listar cuentas de Anvil
├── deployment-info.txt          # Información de despliegue (generado)
└── README.md                    # Este archivo
```

## 🎯 Funcionalidades

### Crear Operación
- Un usuario (user1) puede crear una operación de intercambio
- Especifica la cantidad de ETH que ofrece (Token A)
- Especifica la cantidad de ETH que solicita (Token B)
- Define el segundo usuario (user2) que podrá completar la operación
- El ETH se deposita automáticamente en el contrato de escrow

### Completar Operación
- Solo el usuario designado como user2 puede completar la operación
- user2 envía el ETH solicitado (Token B) al contrato
- El contrato transfiere automáticamente:
  - Token B de user2 → user1
  - Token A del contrato → user2
- La operación se marca como completada

### Cancelar Operación
- Solo user1 (creador) puede cancelar una operación activa
- El ETH depositado (Token A) se devuelve a user1
- La operación se marca como cancelada

### Visualización
- Lista de todas las operaciones activas y completadas
- Información detallada de cada operación
- Balances de ETH en tiempo real
- Interfaz adaptativa con modo oscuro

## 🛠️ Tecnologías Utilizadas

### Smart Contracts
- **Solidity** ^0.8.13
- **Foundry** (Forge, Cast, Anvil)
- **OpenZeppelin Contracts** (Ownable, ReentrancyGuard, SafeERC20)

### Frontend
- **Next.js** 16.0.6
- **React** 19.2.0
- **TypeScript** 5.x
- **Ethers.js** 6.15.0
- **Tailwind CSS** 4.x
- **next-themes** (soporte de temas)

## 🔧 Desarrollo

### Compilar Contratos

```bash
cd sc
forge build
```

### Ejecutar Tests

```bash
cd sc
forge test
```

### Ejecutar Tests con Verbosidad

```bash
cd sc
forge test -vvv
```

### Verificar Contratos

```bash
cd sc
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> --chain-id <CHAIN_ID>
```

### Linter del Frontend

```bash
cd web
npm run lint
```

### Build de Producción

```bash
cd web
npm run build
npm start
```

## 🔒 Seguridad

El contrato Escrow implementa varias medidas de seguridad:

- **ReentrancyGuard**: Previene ataques de reentrancy
- **Ownable**: Control de acceso para funciones administrativas
- **SafeERC20**: Manejo seguro de transferencias de tokens
- **Validaciones**: Verificación exhaustiva de parámetros de entrada
- **Modifiers**: Restricción de acceso a funciones sensibles

## 📝 Notas Importantes

- **Solo ETH Nativo**: El sistema actualmente solo soporta intercambios de ETH nativo. Aunque el contrato tiene soporte para tokens ERC20, la interfaz y la lógica están configuradas exclusivamente para ETH.
- **Desarrollo Local**: Este proyecto está configurado para desarrollo local con Anvil. Para producción, necesitarás:
  - Desplegar en una red real (Ethereum, Sepolia, etc.)
  - Configurar las variables de entorno apropiadas
  - Asegurar que MetaMask esté conectado a la red correcta

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👤 Autor

Desarrollado como parte del Módulo 2 del curso de CodeCrypto.

---

**⚠️ Advertencia**: Este proyecto es para fines educativos y de desarrollo. No usar en producción sin una auditoría de seguridad completa.

