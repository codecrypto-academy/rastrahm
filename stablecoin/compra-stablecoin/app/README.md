# EuroToken Purchase Application

Aplicación Next.js para comprar EuroToken (EURT) usando Stripe o transferencia directa.

## Características

- ✅ Conexión con MetaMask
- ✅ Compra de tokens con Stripe (tarjeta de crédito/débito)
- ✅ Visualización de balance de tokens
- ✅ Dark mode
- ✅ Diseño responsive
- ✅ Manejo de errores y estados de carga
- ✅ Validación de red (local Anvil)
- ✅ Integración con Smart Contracts

## Requisitos

- Node.js v22
- MetaMask instalado en el navegador
- Anvil ejecutándose en `http://localhost:8545`
- Contratos desplegados:
  - EuroToken
  - StablecoinPurchase

## Configuración

1. Copia `.env.local.example` a `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Configura las variables de entorno:
```env
# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Contract Addresses (obtener después de deploy)
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=0x...

# Stripe Configuration (obtener de Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# API Routes
NEXT_PUBLIC_API_URL=http://localhost:6001/api
```

3. Instala las dependencias:
```bash
npm install
```

4. Ejecuta la aplicación:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:6001`

## Uso

### Compra con Stripe

1. Conecta tu wallet MetaMask
2. Selecciona la cantidad de EURT que deseas comprar
3. Ingresa los datos de tu tarjeta
4. Completa el pago
5. Los tokens se acuñarán automáticamente a tu wallet

### Compra Directa

La compra directa está pendiente de implementación. Por ahora, usa Stripe.

## Configuración de Stripe

1. Crea una cuenta en [Stripe](https://stripe.com)
2. Obtén tus API keys del [Dashboard](https://dashboard.stripe.com/apikeys)
3. Configura un webhook:
   - URL: `http://localhost:6001/api/webhook`
   - Eventos: `payment_intent.succeeded`
   - Copia el webhook secret

## Estructura del Proyecto

```
app/
├── app/
│   ├── api/              # API routes (Stripe webhooks, payment intents)
│   ├── layout.tsx        # Layout principal
│   └── page.tsx          # Página principal
├── components/           # Componentes React
│   ├── Alert.tsx
│   ├── DarkModeToggle.tsx
│   ├── DirectPurchase.tsx
│   ├── PurchaseWithStripe.tsx
│   ├── TokenBalance.tsx
│   └── WalletButton.tsx
├── contexts/            # Contextos React
│   └── WalletContext.tsx
├── hooks/               # Custom hooks
│   └── useEuroToken.ts
├── lib/                 # Utilidades
│   ├── constants.ts
│   ├── contracts.ts
│   └── utils.ts
└── types/               # TypeScript types
    └── window.d.ts
```

## Notas

- La aplicación requiere que los contratos estén desplegados en la red local (Anvil)
- El contrato `StablecoinPurchase` debe tener permisos de `PURCHASER_ROLE` para ejecutar el webhook
- Para producción, configura un servicio de webhook de Stripe (Stripe CLI o servicio web)

## Desarrollo

```bash
# Modo desarrollo
npm run dev

# Build para producción
npm run build

# Ejecutar en producción
npm start

# Linter
npm run lint
```
