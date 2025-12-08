# Superfluid EUR Streaming Application

Aplicacion de streaming de dinero en tiempo real usando el protocolo Superfluid. Permite enviar flujos continuos de tokens EUR a multiples destinatarios a una tasa de 2000 EUR/mes.

## 📋 Cambios Recientes

### Mejoras de Estabilidad
- ✅ **Corrección de errores de chainId**: El sistema ahora detecta automáticamente el chainId real de Anvil (especialmente cuando hace fork de mainnet) y ajusta las transacciones en consecuencia
- ✅ **Manejo robusto de errores de red**: Los errores "underlying network changed" ahora se manejan automáticamente sin interrumpir la conexión
- ✅ **Mejora en logs**: Los mensajes de conexión y upgrade ahora se muestran en consola en lugar de alerts intrusivos

### Testing
- ✅ **Tests de integración**: Suite completa de tests con Foundry que valida todas las interacciones con Superfluid
- ✅ **Tests E2E**: Suite completa de tests end-to-end con Playwright que verifica todas las funcionalidades desde la perspectiva del usuario

### Funcionalidades
- ✅ **Edición de flow rate**: Ahora puedes editar el flow rate de streams existentes sin necesidad de eliminarlos y recrearlos
- ✅ **Estadísticas detalladas**: Panel de estadísticas que muestra información completa sobre tus streams
- ✅ **Modo oscuro/claro**: Toggle para cambiar entre tema oscuro y claro

### Validaciones y Seguridad
- ✅ **Validaciones mejoradas**: Validación de flow rate (min/max), depósitos suficientes, y prevención de auto-streaming
- ✅ **Validación de variables de entorno**: El sistema valida las variables de entorno al inicio y muestra errores claros si falta algo

### Automatización
- ✅ **Script de inicio automatizado**: El script `start.sh` ahora maneja todo el proceso de configuración, despliegue e inicio de la aplicación

## 🚀 Inicio Rápido (Recomendado)

### Script Automatizado (`start.sh`)

El script `start.sh` automatiza todo el proceso de configuración e inicio de la aplicación. Es la forma más rápida y sencilla de comenzar.

#### Uso Básico

```bash
# Ejecuta el script de inicio (Anvil se iniciará automáticamente)
./start.sh
```

#### Uso con Fork de Mainnet (Recomendado)

Para usar fork de mainnet (necesario para desplegar EURx):

```bash
# Configurar API Key de Alchemy
export ALCHEMY_API_KEY=tu_api_key

# Ejecutar el script
./start.sh
```

**Nota**: Si no configuras `ALCHEMY_API_KEY`, el script iniciará Anvil sin fork. En este caso, solo se desplegará el contrato Euro, pero no EURx (que requiere los contratos de Superfluid de mainnet).

#### ¿Qué hace el script?

El script `start.sh` realiza automáticamente los siguientes pasos:

1. **Verifica o inicia Anvil**
   - Si Anvil no está corriendo, lo inicia automáticamente
   - Si `ALCHEMY_API_KEY` está configurada, inicia Anvil con fork de mainnet
   - Si no hay API key, inicia Anvil sin fork (con advertencia)

2. **Crea/actualiza `.env.local`**
   - Crea el archivo `web/.env.local` si no existe
   - Configura `NEXT_PUBLIC_ANVIL_RPC_URL` y `NEXT_PUBLIC_CHAIN_ID`
   - Incluye valores por defecto para límites de flow rate

3. **Despliega los contratos**
   - Ejecuta el script de despliegue de Foundry
   - Despliega el contrato Euro (ERC20)
   - Crea el Super Token EURx (si hay fork de mainnet)
   - Mintea 10,000,000 EUR a la cuenta principal

4. **Extrae direcciones de contratos**
   - Parsea el output del despliegue (JSON y texto)
   - Extrae las direcciones de Euro y EURx
   - Maneja errores si el despliegue falla

5. **Actualiza `.env.local`**
   - Actualiza `NEXT_PUBLIC_EURO_ADDRESS` con la dirección desplegada
   - Actualiza `NEXT_PUBLIC_EUROX_ADDRESS` (si se desplegó correctamente)
   - Muestra advertencias si alguna dirección no se pudo obtener

6. **Verifica contratos desplegados**
   - Verifica que los contratos tengan código desplegado
   - Muestra mensajes de éxito o advertencia

7. **Inicia el servidor de desarrollo**
   - Cambia a Node.js v22 (si nvm está disponible)
   - Inicia `npm run dev` en el directorio `web/`
   - Espera a que el servidor esté listo

8. **Abre el navegador automáticamente**
   - Espera a que el servidor web responda
   - Abre `http://localhost:3000` en el navegador por defecto

9. **Limpieza automática**
   - Al presionar Ctrl+C, detiene el servidor de desarrollo
   - Si el script inició Anvil, lo detiene automáticamente
   - Si Anvil ya estaba corriendo, lo deja corriendo

#### Requisitos

- **Foundry instalado**: El script necesita `forge`, `anvil` y `cast`
- **Node.js v22**: Se recomienda usar `nvm use v22`
- **Alchemy API Key** (opcional pero recomendado): Para fork de mainnet

#### Variables de Entorno

El script usa las siguientes variables de entorno (opcionales):

- `ALCHEMY_API_KEY`: API Key de Alchemy para fork de mainnet
  ```bash
  export ALCHEMY_API_KEY=tu_api_key
  ```

#### Valores por Defecto

El script usa estos valores de Anvil por defecto:

- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337` (o `1` si hay fork de mainnet)
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` (cuenta de desarrollo de Anvil)
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (cuenta principal de Anvil)

#### Manejo de Errores

El script maneja errores de forma robusta:

- **Anvil no instalado**: Muestra instrucciones para instalar Foundry
- **Despliegue fallido**: Muestra el error pero continúa (Anvil sigue corriendo)
- **Direcciones no encontradas**: Muestra advertencias y guarda logs para debugging
- **Servidor no responde**: Muestra advertencia pero no falla

#### Logs y Debugging

El script guarda logs útiles para debugging:

- **Logs de Anvil**: `/tmp/anvil.log` (si Anvil fue iniciado por el script)
- **Output de despliegue**: `/tmp/deploy_output_*.txt` (si el despliegue falla)
- **JSON de despliegue**: `/tmp/deploy_json_*.json` (para parsing de direcciones)

#### Detener la Aplicación

Para detener la aplicación:

1. Presiona `Ctrl+C` en la terminal donde está corriendo el script
2. El script detendrá automáticamente:
   - El servidor de desarrollo de Next.js
   - Anvil (solo si fue iniciado por el script)

**Nota**: Si Anvil ya estaba corriendo antes de ejecutar el script, el script NO lo detendrá al salir.

El script automatiza todo el proceso de configuración e inicio de la aplicación.

---

## Configuración Manual

Si prefieres configurar manualmente, sigue los pasos a continuación.

## Requisitos Previos

- Node.js 18+ y npm
- Foundry (forge, anvil, cast)
- Git
- Alchemy API Key (para fork de mainnet)

## Instalacion

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/codecrypto-academy/superfluid.git
   cd superfluid
   ```

2. **Instalar dependencias de smart contracts**
   ```bash
   cd sc
   forge install
   cd ..
   ```

3. **Instalar dependencias de la web app**
   ```bash
   cd web
   npm install
   cd ..
   ```

## Configuracion

### 1. Obtener Alchemy API Key

1. Crear cuenta en [Alchemy](https://www.alchemy.com/)
2. Crear una app para Ethereum Mainnet
3. Copiar el API Key

### 2. Configurar variables de entorno (opcional)

1. Copiar el archivo de ejemplo:
```bash
cd web
cp .env.example .env.local
```

2. Editar `web/.env.local` y configurar las variables necesarias:
```bash
# Mínimo necesario para desarrollo local
NEXT_PUBLIC_ANVIL_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
```

**Nota**: El archivo `.env.example` contiene todas las variables disponibles con sus descripciones. Solo configura las que necesites cambiar de los valores por defecto.

## Ejecucion del Proyecto

### Paso 1: Levantar Anvil con Fork de Mainnet

En una terminal, ejecutar:

```bash
anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
```

**Importante**: Reemplaza `YOUR_ALCHEMY_API_KEY` con tu API key de Alchemy.

Anvil levantara un nodo local en `http://127.0.0.1:8545` con el estado de mainnet. Veras 10 cuentas con 10,000 ETH cada una.

### Paso 2: Desplegar Contratos

En otra terminal, desde la raiz del proyecto:

```bash
cd sc && forge script script/DeployAll.s.sol:DeployAllScript \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

Este script:
- Despliega el contrato Euro (ERC20)
- Mintea 10,000,000 EUR a la cuenta principal
- Crea el Super Token EURx usando la factory de Superfluid

**Output esperado**:
```
==========================
Deployment Summary
==========================
Euro Token deployed at: 0x...
EuroX SuperToken created at: 0x...
Initial holder: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Initial supply: 10000000 EUR

Next steps:
1. Update web/src/config/web3.ts with these addresses
2. Start the web app: cd web && npm run dev
```

### Paso 3: Actualizar Configuracion Web

Copiar las direcciones de los contratos desplegados y actualizarlas en `web/src/config/web3.ts`:

```typescript
export const euroAddress = '0x...'; // Euro Token address del output anterior
export const euroXAddress = '0x...'; // EuroX SuperToken address del output anterior
```

### Paso 4: Iniciar Aplicacion Web

En otra terminal:

```bash
cd web
npm run dev
```

La aplicacion estara disponible en `http://localhost:3000` (o puerto alternativo si 3000 esta ocupado).

## Uso de la Aplicacion

### 1. Conectar Wallet

No usaremos Metamask, usaremos la cuenta de Anvil directamente.

### 2. Hacer Upgrade EUR a EURx

Para poder hacer streaming, primero debes convertir EUR (ERC20 normal) a EURx (Super Token):

1. En la seccion "Upgrade EUR a EURx"
2. Ingresa cantidad (ejemplo: 5000)
3. Haz clic en "Upgrade"
4. Espera confirmacion de aprobacion
5. Espera confirmacion de upgrade

Ahora tendras 5000 EURx listos para streaming.

### 3. Agregar Destinatario y Crear Stream

1. En la seccion "Agregar Destinatario"
2. Ingresa una address de Ethereum (puedes usar otra cuenta de Anvil)
3. Haz clic en "Agregar"

**Cuentas de Anvil disponibles**:
```
0x70997970C51812dc3A010C7d01b50e0d17dc79C8
0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

Se creara automaticamente un stream de 2000 EUR/mes hacia esa address.

### 4. Ver Balance en Tiempo Real

El balance del destinatario se actualiza cada 5 segundos, mostrando como los tokens fluyen continuamente.

### 5. Ver Estadísticas

La aplicación muestra estadísticas detalladas:
- Resumen de streams (activos, pausados, total)
- Análisis de flow rates (total, promedio, mínimo, máximo)
- Balances totales en destinatarios
- Tiempo estimado de agotamiento de balance
- Conversiones temporales (hora, día, semana, año)

### 6. Pausar, Reanudar y Editar Streams

- **Pausar**: Haz clic en el botón "Pausar" para detener el flujo
- **Reanudar**: Haz clic en el botón "Reanudar" para continuar el flujo
- **Editar Flow Rate**: Haz clic en "✏️ Editar" para modificar el flow rate de un stream activo
  - Ingresa el nuevo flow rate en EUR/mes
  - Si aumentas el flow rate, necesitarás depósito adicional
  - El stream se actualiza sin perder el historial

### 7. Downgrade EURx a EUR (opcional)

Si necesitas convertir Super Tokens de vuelta a tokens normales:

1. En la seccion "Downgrade EURx a EUR"
2. Ingresa cantidad
3. Haz clic en "Downgrade"

## Estructura del Proyecto

```
superfluid/
├── sc/                          # Smart contracts (Foundry)
│   ├── src/
│   │   └── Euro.sol            # Token ERC20 EUR
│   ├── script/
│   │   ├── DeployEuro.s.sol    # Script deploy Euro
│   │   └── DeployAll.s.sol     # Script deploy completo
│   ├── test/
│   │   ├── Euro.t.sol          # Tests unitarios
│   │   └── SuperfluidIntegration.t.sol  # Tests de integración
│   └── foundry.toml            # Config Foundry
├── web/                         # Aplicacion Next.js
│   ├── src/
│   │   ├── app/                # Pages (App Router)
│   │   ├── components/
│   │   │   ├── Dashboard.tsx   # Componente principal
│   │   │   ├── Statistics.tsx  # Estadísticas
│   │   │   └── ui/             # Componentes UI reutilizables
│   │   ├── lib/
│   │   │   ├── superfluid.ts   # Integracion Superfluid
│   │   │   ├── errors.ts       # Manejo de errores
│   │   │   └── env.ts          # Validación de variables de entorno
│   │   ├── config/
│   │   │   └── web3.ts         # Config contratos
│   │   └── hooks/
│   │       └── useTheme.ts     # Hook para tema oscuro/claro
│   ├── e2e/                     # Tests E2E (Playwright)
│   │   ├── 01-wallet-connection.spec.ts
│   │   ├── 02-balances.spec.ts
│   │   ├── 03-stream-management.spec.ts
│   │   ├── 04-flow-rate-editing.spec.ts
│   │   ├── 05-statistics.spec.ts
│   │   └── 06-upgrade-downgrade.spec.ts
│   ├── .env.example            # Plantilla de variables de entorno
│   └── package.json
├── start.sh                     # Script de inicio automatizado
└── README.md                    # Este archivo
```

## Testing

El proyecto incluye una suite completa de tests para garantizar la calidad y funcionalidad del código.

### Tests de Integración (Foundry)

Los tests de integración validan el funcionamiento completo del sistema con Superfluid:

```bash
# Todos los tests (requiere fork de mainnet)
cd sc
forge test --fork-url http://127.0.0.1:8545 -vvv

# Solo tests unitarios (no requieren fork)
forge test --match-path test/Euro.t.sol -vvv

# Solo tests de integración con Superfluid
forge test --fork-url http://127.0.0.1:8545 --match-path test/SuperfluidIntegration.t.sol -vvv
```

**Tests incluidos:**
- ✅ Upgrade EUR → EURx
- ✅ Downgrade EURx → EUR
- ✅ Creación y eliminación de flows
- ✅ Balances en tiempo real
- ✅ Múltiples flows simultáneos
- ✅ Edge cases (auto-flow, flow rate cero, etc.)

**Requisitos:**
- Anvil corriendo con fork de mainnet (o variable `MAINNET_RPC_URL` configurada)
- API Key de Alchemy para fork de mainnet

### Tests E2E (Playwright)

Los tests end-to-end verifican que todas las funcionalidades funcionan correctamente desde la perspectiva del usuario:

```bash
# Asegúrate de usar Node.js v22
nvm use v22

cd web

# Instalar dependencias (si no están instaladas)
npm install
npx playwright install chromium

# Ejecutar todos los tests
npm run test:e2e

# Con UI interactiva
npm run test:e2e:ui

# En modo headed (ver navegador)
npm run test:e2e:headed

# En modo debug
npm run test:e2e:debug
```

**Tests incluidos:**
- ✅ Conexión de wallet
- ✅ Visualización de balances
- ✅ Creación de streams
- ✅ Pausar/reanudar streams
- ✅ Edición de flow rate
- ✅ Visualización de estadísticas
- ✅ Formularios de upgrade/downgrade

**Requisitos previos:**
- Node.js v22 (usando nvm)
- Anvil corriendo en `http://127.0.0.1:8545`
- Contratos desplegados

## Comandos Utiles

### Smart Contracts

```bash
# Compilar contratos
cd sc && forge build

# Ejecutar tests
cd sc && forge test

# Ejecutar tests con output detallado
cd sc && forge test -vvv

# Ejecutar tests de integración (requiere fork)
cd sc && forge test --fork-url http://127.0.0.1:8545 -vvv

# Formatear codigo
cd sc && forge fmt

# Ver gas usado
cd sc && forge snapshot
```

### Web Application

```bash
# Modo desarrollo
cd web && npm run dev

# Build produccion
cd web && npm run build

# Ejecutar produccion
cd web && npm start

# Linting
cd web && npm run lint

# Tests E2E
cd web && npm run test:e2e
```

## Características Implementadas

### Funcionalidades Principales
- ✅ Streaming de tokens EUR en tiempo real usando Superfluid
- ✅ Upgrade/Downgrade entre EUR y EURx (Super Token)
- ✅ Gestión de múltiples streams simultáneos
- ✅ Pausar y reanudar streams
- ✅ Editar flow rate de streams existentes
- ✅ Estadísticas detalladas de streaming
- ✅ Validaciones de flow rate (min/max)
- ✅ Validación de depósitos suficientes
- ✅ Prevención de auto-streaming

### Mejoras de UI/UX
- ✅ Modo oscuro/claro con toggle
- ✅ Componentes reutilizables (LoadingSpinner, Tooltip, AddressDisplay, StatusBadge)
- ✅ Diseño moderno con Tailwind CSS
- ✅ Responsive design
- ✅ Mensajes de error amigables

### Validaciones y Seguridad
- ✅ Validación de flow rate (mínimo y máximo)
- ✅ Validación de depósitos suficientes antes de crear streams
- ✅ Prevención de auto-streaming (no puedes hacer stream a ti mismo)
- ✅ Validación de direcciones de Ethereum
- ✅ Validación de variables de entorno

### Manejo de Errores
- ✅ Sistema centralizado de manejo de errores
- ✅ Categorización de errores (validación, blockchain, Superfluid, etc.)
- ✅ Mensajes de error amigables para el usuario
- ✅ Logs detallados en consola para debugging
- ✅ Manejo robusto de errores de conexión con Anvil

### Testing
- ✅ Tests de integración con Superfluid (Foundry)
- ✅ Tests E2E con Playwright
- ✅ Cobertura completa de funcionalidades principales

## Troubleshooting

### Problemas Comunes Rápidos

#### Anvil no está corriendo
```
Error conectando a Anvil: connect ECONNREFUSED 127.0.0.1:8545
```
**Solución**: Asegúrate de que Anvil esté corriendo en otra terminal, o usa `./start.sh` que lo inicia automáticamente.

#### Contratos no desplegados
```
El contrato EUR no existe en 0x...
```
**Solución**: Ejecuta el script de deployment (Paso 2) o usa `./start.sh` que lo hace automáticamente.

#### Error "invalid chain id for signer"
```
Error: invalid chain id for signer
```
**Solución**: Este error ocurre cuando Anvil hace fork de mainnet (reporta chainId 1 en lugar de 31337). El código ahora detecta y corrige esto automáticamente. Si persiste, recarga la página (F5).

#### Error "underlying network changed"
```
Error: underlying network changed
```
**Solución**: Este es un warning no crítico. El código ahora maneja esto automáticamente y continúa la conexión. Si persiste, recarga la página (F5).

#### Error al crear flow
```
RPC request failed: execution reverted: custom error 0x801b6863
```
**Solución**: Asegúrate de tener suficiente balance en EURx (haz upgrade primero).

#### Balance insuficiente para stream
```
Balance insuficiente para crear el stream
```
**Solución**: Necesitas suficiente EURx para el depósito (8 horas de flow rate). Para 2000 EUR/mes necesitas ~22.22 EURx.

#### Port 3000 ocupado
```
Port 3000 is in use
```
**Solución**: Next.js automáticamente usará el siguiente puerto disponible (3001, 3002, etc).

## Conceptos Clave

### Super Tokens
Tokens ERC20 envueltos que tienen capacidades de streaming. Debes hacer "upgrade" de EUR a EURx para poder hacer streaming.

### Flow Rate
Los flows se miden en wei/segundo. Para 2000 EUR/mes:
```
2000 EUR/mes = 771604938271604 wei/segundo
```

### Constant Flow Agreement (CFA)
Modulo de Superfluid que gestiona los streams. Los tokens fluyen automaticamente cada segundo sin necesidad de transacciones continuas.

## Tecnologias

- **Solidity 0.8.28** - Smart contracts
- **Foundry** - Framework de desarrollo blockchain
- **OpenZeppelin 5.1.0** - Libreria de contratos seguros
- **Next.js 15.5.4** - Framework frontend
- **React 19.1.0** - Libreria UI
- **Tailwind CSS 3.4** - Estilos
- **ethers.js 5.7.2** - Libreria Web3
- **Superfluid SDK 0.9.0** - SDK del protocolo

## Recursos

- [Documentacion Superfluid](https://docs.superfluid.finance/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Next.js Docs](https://nextjs.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## Licencia

Este proyecto es de codigo abierto y esta disponible para fines educativos.

## Autor

Desarrollado con fines educativos para **CodeCrypto Academy**