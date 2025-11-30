# Estado TDD del Proyecto

Este documento rastrea el progreso de TDD (Test-Driven Development) en el proyecto.

## ✅ Completado con TDD

### 1. Infraestructura de Testing
- ✅ Jest configurado
- ✅ React Testing Library instalado
- ✅ Configuración de jest.config.js
- ✅ jest.setup.js con mocks necesarios
- ✅ Scripts de test en package.json

### 2. Tests de Utilidades (lib/utils.ts)
- ✅ **31 tests pasando** (100% de cobertura de funciones)
- ✅ Tests para:
  - `formatTokenAmount` - 5 tests
  - `parseEurToToken` - 4 tests
  - `centsToEur` - 4 tests
  - `eurToCents` - 5 tests
  - `tokenToCents` - 2 tests
  - `centsToToken` - 2 tests
  - `formatAddress` - 4 tests
  - `isValidAddress` - 5 tests
  - `formatError` - 6 tests

### 3. Tests de Hooks
- ✅ **5 tests pasando** para `useEuroToken`
- ✅ Tests para:
  - Wallet no conectado
  - Carga de información de token
  - Carga de balance
  - Manejo de errores
  - Formato correcto de balance

## 📋 Pendiente

### Tests de Componentes
- [ ] `WalletButton` component
- [ ] `TokenBalance` component
- [ ] `PurchaseWithStripe` component
- [ ] `DirectPurchase` component
- [ ] `Alert` component
- [ ] `DarkModeToggle` component

### Tests de Contextos
- [ ] `WalletContext` - Tests completos

### Tests de API Routes
- [ ] `/api/create-payment-intent`
- [ ] `/api/purchase-status/[paymentIntentId]`
- [ ] `/api/webhook`

## 📊 Estadísticas

```
Total de Tests: 36
Tests Pasando: 36 ✅
Tests Fallando: 0 ❌
Cobertura: ~40% (estimado)
```

## 🔄 Próximos Pasos con TDD

Para las siguientes funcionalidades, seguiremos estrictamente TDD:

### 1. Nuevas Funcionalidades
1. **RED**: Escribir tests que fallen
2. **GREEN**: Implementar código mínimo para pasar
3. **REFACTOR**: Mejorar código manteniendo tests pasando

### 2. Tests de Componentes
- Empezar con componentes más simples (Alert, DarkModeToggle)
- Luego componentes más complejos (WalletButton, TokenBalance)
- Finalmente componentes con integraciones (PurchaseWithStripe)

### 3. Tests de Integración
- Tests E2E con Playwright (opcional)
- Tests de flujos completos (compra con Stripe)

## 📝 Notas

- Todos los tests deben pasar antes de hacer commit
- Cobertura objetivo: 80% mínimo
- Tests deben ser independientes y rápidos
- Usar mocks para dependencias externas (MetaMask, Stripe, contratos)

## 🚀 Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests en modo watch
npm test:watch

# Tests con cobertura
npm test:coverage

# Test específico
npm test -- path/to/test.test.ts
```

