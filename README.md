# E-commerce con Blockchain - Proyecto Completo

Sistema completo de e-commerce descentralizado que utiliza blockchain y stablecoins para procesar pagos. El proyecto incluye smart contracts en Solidity, aplicaciones Next.js para diferentes funcionalidades, y una integración completa con Stripe para pagos en fiat.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Aplicaciones](#aplicaciones)
- [Smart Contracts](#smart-contracts)
- [Testing](#testing)
- [Despliegue](#despliegue)
- [Documentación Adicional](#documentación-adicional)

## 🚀 Características

### Smart Contracts
- ✅ **EuroToken (EURT)**: Stablecoin ERC20 con 6 decimales (1 EURT = 1 EUR)
- ✅ **StablecoinPurchase**: Contrato para comprar EURT usando pagos fiat (Stripe)
- ✅ **PaymentGateway**: Pasarela de pago para procesar transacciones con EURT
- ✅ **Ecommerce**: Contrato principal para gestionar empresas, productos, clientes, carrito y facturas

### Aplicaciones Next.js
- ✅ **Pasarela de Pago** (Puerto 3000): Procesar pagos con EURT o Stripe
- ✅ **Compra de EuroToken** (Puerto 3001): Comprar EURT usando Stripe
- ✅ **ABM E-commerce** (Puerto 3002): Administración de empresas, productos y facturas
- ✅ **Tienda Online** (Puerto 3003): Tienda para clientes con carrito de compras

### Funcionalidades
- ✅ Integración completa con MetaMask
- ✅ Integración con Stripe para pagos en fiat
- ✅ Webhooks para procesamiento automático on-chain
- ✅ Dark mode en todas las aplicaciones
- ✅ Diseño responsive
- ✅ Tests TDD completos
- ✅ Optimizaciones de rendimiento
- ✅ Mejoras de UX/UI

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Aplicaciones Next.js                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Pasarela     │ Compra       │ ABM          │ Tienda        │
│ Pago (3000)  │ EURT (3001)  │ (3002)       │ Online (3003) │
└──────┬───────┴──────┬────────┴──────┬───────┴──────┬────────┘
       │              │               │              │
       └──────────────┴───────────────┴──────────────┘
                      │
       ┌──────────────┴──────────────┐
       │     Smart Contracts          │
       ├──────────────────────────────┤
       │  EuroToken                   │
       │  StablecoinPurchase          │
       │  PaymentGateway              │
       │  Ecommerce                   │
       └──────────────┬───────────────┘
                      │
       ┌──────────────┴──────────────┐
       │      Anvil (Local Chain)     │
       │      localhost:8545          │
       └──────────────────────────────┘
```

## 📦 Requisitos

- **Node.js**: v22 o superior
- **Foundry**: Para compilar y desplegar smart contracts
- **MetaMask**: Extensión del navegador para conectar wallets
- **Stripe Account**: Para procesar pagos (opcional, para desarrollo)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd ecommerce-rs
```

### 2. Instalar dependencias de Smart Contracts

```bash
# EuroToken
cd stablecoin/sc
forge install

# StablecoinPurchase
cd ../compra-stablecoin/sc
forge install

# PaymentGateway
cd ../pasarela-de-pago/sc
forge install

# Ecommerce
cd ../../../sc-ecommerce
forge install
```

### 3. Instalar dependencias de aplicaciones Next.js

```bash
# Pasarela de Pago
cd stablecoin/pasarela-de-pago/app
npm install

# Compra de EuroToken
cd ../compra-stablecoin/app
npm install

# ABM E-commerce
cd ../../../abm-ecommerce/app
npm install

# Tienda Online
cd ../../tienda-online/app
npm install
```

## ⚙️ Configuración

### 1. Inicializar el proyecto

```bash
# Iniciar Anvil en una terminal
anvil

# En otra terminal, inicializar el proyecto
./scripts/init.sh
```

Este script:
- Despliega todos los contratos
- Genera el archivo `.env` con todas las direcciones
- Configura roles y permisos

### 2. Configurar Stripe

Edita el archivo `.env` y agrega tus claves de Stripe:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Copiar variables de entorno a aplicaciones

El script `restart-all.sh` crea automáticamente `.env.local` para cada aplicación, pero puedes hacerlo manualmente:

```bash
# Cada aplicación necesita las variables NEXT_PUBLIC_* del .env principal
```

## 🚀 Uso

### Iniciar todos los servicios

```bash
./scripts/restart-all.sh
```

Este script:
- Inicia Anvil (si no está corriendo)
- Inicia todas las aplicaciones Next.js
- Crea `.env.local` para cada app si no existe

### Detener todos los servicios

```bash
./scripts/stop-all.sh
```

### Desplegar contratos individuales

```bash
# Desplegar solo EuroToken
./scripts/deploy.sh eurotoken

# Desplegar todos los contratos
./scripts/deploy.sh all
```

### URLs de acceso

- **Anvil**: http://localhost:8545
- **Pasarela de Pago**: http://localhost:3000
- **Compra EuroToken**: http://localhost:3001
- **ABM E-commerce**: http://localhost:3002
- **Tienda Online**: http://localhost:3003

## 📁 Estructura del Proyecto

```
ecommerce-rs/
├── scripts/                    # Scripts de despliegue y gestión
│   ├── init.sh                # Inicialización completa
│   ├── deploy.sh              # Desplegar contratos
│   ├── restart-all.sh         # Reiniciar todos los servicios
│   └── stop-all.sh            # Detener todos los servicios
│
├── stablecoin/
│   ├── sc/                     # Smart Contract EuroToken
│   │   ├── src/
│   │   ├── test/
│   │   └── script/
│   │
│   ├── compra-stablecoin/      # Aplicación compra EURT
│   │   ├── sc/                 # Smart Contract StablecoinPurchase
│   │   └── app/                # Next.js app (puerto 3001)
│   │
│   └── pasarela-de-pago/       # Aplicación pasarela de pago
│       ├── sc/                 # Smart Contract PaymentGateway
│       └── app/                # Next.js app (puerto 3000)
│
├── sc-ecommerce/               # Smart Contract Ecommerce
│   ├── src/
│   ├── test/
│   └── script/
│
├── abm-ecommerce/              # Aplicación ABM
│   └── app/                    # Next.js app (puerto 3002)
│
├── tienda-online/              # Aplicación tienda online
│   └── app/                    # Next.js app (puerto 3003)
│
└── .env                        # Variables de entorno (generado por init.sh)
```

## 🎯 Aplicaciones

### 1. Pasarela de Pago (Puerto 3000)

**Funcionalidades:**
- Procesar pagos directos con EURT
- Procesar pagos con Stripe (conversión automática a EURT)
- Historial de pagos (enviados y recibidos)
- Validación de direcciones y montos

**Componentes principales:**
- `ProcessPaymentForm`: Formulario de pago directo
- `StripePaymentForm`: Formulario de pago con Stripe
- `WalletButton`: Conexión de wallet

### 2. Compra de EuroToken (Puerto 3001)

**Funcionalidades:**
- Comprar EURT usando Stripe
- Ver balance de EURT
- Historial de compras
- Polling de estado de compras

**Componentes principales:**
- `PurchaseWithStripe`: Compra con Stripe
- `TokenBalance`: Visualización de balance
- `WalletButton`: Conexión de wallet

### 3. ABM E-commerce (Puerto 3002)

**Funcionalidades:**
- Registrar y gestionar empresas
- Registrar y gestionar productos
- Ver facturas
- Ver balance de tokens
- Control de Anvil (reset, redeploy)

**Componentes principales:**
- `CompanyForm` / `CompanyList`: Gestión de empresas
- `ProductForm` / `ProductList`: Gestión de productos
- `InvoiceList`: Lista de facturas
- `TokenBalance`: Balance de EURT
- `AnvilControls`: Control de Anvil

### 4. Tienda Online (Puerto 3003)

**Funcionalidades:**
- Registro y modificación de clientes
- Visualización de productos
- Carrito de compras
- Creación de facturas
- Pago de facturas con Stripe
- Historial de facturas

**Componentes principales:**
- `CustomerForm`: Registro de clientes
- `ProductList`: Lista de productos
- `ShoppingCart`: Carrito de compras
- `CreateInvoice`: Crear facturas
- `InvoiceList`: Lista de facturas del cliente
- `PayInvoice`: Pagar facturas con Stripe

## 🔐 Smart Contracts

### EuroToken (EURT)

Token ERC20 que representa euros digitales.

**Características:**
- 6 decimales de precisión
- Mint controlado por owner
- Burn controlado por owner
- Transferencias estándar ERC20

**Funciones principales:**
- `mint(address to, uint256 amount)`: Crear tokens (solo owner)
- `burn(uint256 amount)`: Quemar tokens propios
- `burnFrom(address from, uint256 amount)`: Quemar tokens de otro (requiere allowance)

### StablecoinPurchase

Contrato para comprar EURT usando pagos fiat.

**Características:**
- Integración con Stripe
- Prevención de duplicados
- Registro de compras

**Funciones principales:**
- `purchaseTokens(string purchaseId, address buyer, uint256 amountEur)`: Comprar tokens (solo PURCHASER_ROLE)

### PaymentGateway

Pasarela de pago para procesar transacciones con EURT.

**Características:**
- Transferencias entre direcciones
- Integración con Ecommerce
- Registro de pagos

**Funciones principales:**
- `processPayment(string paymentId, address payer, address payee, uint256 amount, string invoiceId)`: Procesar pago (solo PAYMENT_PROCESSOR_ROLE)

### Ecommerce

Contrato principal del sistema de e-commerce.

**Características:**
- Gestión de empresas
- Gestión de productos
- Gestión de clientes
- Carrito de compras
- Facturas y ventas
- Integración con PaymentGateway

**Funciones principales:**
- `registerCompany(...)`: Registrar empresa
- `registerProduct(...)`: Registrar producto
- `registerCustomer(...)`: Registrar cliente
- `addToCart(...)`: Agregar al carrito
- `createInvoice(...)`: Crear factura
- `processPayment(...)`: Procesar pago de factura

## 🧪 Testing

### Smart Contracts

```bash
# EuroToken
cd stablecoin/sc
forge test

# StablecoinPurchase
cd ../compra-stablecoin/sc
forge test

# PaymentGateway
cd ../pasarela-de-pago/sc
forge test

# Ecommerce
cd ../../../sc-ecommerce
forge test
```

### Aplicaciones Next.js

```bash
# Pasarela de Pago
cd stablecoin/pasarela-de-pago/app
npm test

# Compra de EuroToken
cd ../compra-stablecoin/app
npm test

# ABM E-commerce
cd ../../../abm-ecommerce/app
npm test

# Tienda Online
cd ../../tienda-online/app
npm test
```

### Cobertura de Tests

- **Smart Contracts**: ~95% de cobertura
- **Aplicaciones Next.js**: ~85% de cobertura
- **Total de tests**: 200+ tests

## 📚 Documentación Adicional

- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md): Auditoría de seguridad de contratos
- [TODO_STATUS.md](./TODO_STATUS.md): Estado de TODOs del proyecto
- [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md): Resumen de mejoras implementadas
- [scripts/README.md](./scripts/README.md): Documentación de scripts

## 🔒 Seguridad

El proyecto ha sido auditado y corregido para prevenir:
- ✅ Reentrancy attacks
- ✅ Race conditions
- ✅ Integer overflow/underflow
- ✅ Access control issues
- ✅ Front-running vulnerabilities

Ver [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) para más detalles.

## 🛠️ Desarrollo

### Flujo de trabajo recomendado

1. **Iniciar Anvil**:
   ```bash
   anvil
   ```

2. **Inicializar proyecto** (primera vez):
   ```bash
   ./scripts/init.sh
   ```

3. **Iniciar desarrollo**:
   ```bash
   ./scripts/restart-all.sh
   ```

4. **Ejecutar tests**:
   ```bash
   # En cada aplicación
   npm test
   ```

### Convenciones

- **TDD**: Test-Driven Development para nuevas funcionalidades
- **Commits**: Mensajes descriptivos en español
- **Código**: TypeScript estricto, ESLint configurado
- **Estilos**: Tailwind CSS con dark mode

## 📊 Estadísticas del Proyecto

- **Smart Contracts**: 4 contratos principales
- **Aplicaciones Next.js**: 4 aplicaciones
- **Tests**: 200+ tests
- **Componentes React**: 30+ componentes
- **Cobertura de tests**: ~85-95%
- **Estado**: ~95% completado

## 🤝 Contribución

Este es un proyecto educativo. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Sigue TDD para nuevas funcionalidades
4. Asegúrate de que todos los tests pasen
5. Crea un Pull Request

## 📝 Licencia

Este proyecto es para fines educativos.

## 👥 Autor

Proyecto desarrollado como parte del curso de CodeCrypto.

## 🙏 Agradecimientos

- OpenZeppelin por los contratos base seguros
- Foundry por el framework de desarrollo
- Next.js por el framework de React
- Stripe por la API de pagos

---

**Última actualización**: $(date)

Para más información, consulta la documentación en cada aplicación o los archivos README específicos.
