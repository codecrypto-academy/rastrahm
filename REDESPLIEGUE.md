# Guía de Redespliegue Completo

## Proceso de Redespliegue

### 1. Redesplegar todos los contratos

```bash
./scripts/init.sh
```

Este script:
- ✅ Verifica/inicia Anvil
- ✅ Despliega EuroToken
- ✅ Hace mint de 10000 EURT automáticamente
- ✅ Despliega StablecoinPurchase
- ✅ Despliega PaymentGateway
- ✅ Aprueba tokens al PaymentGateway automáticamente
- ✅ Despliega Ecommerce
- ✅ Genera archivos .env y .env.local
- ✅ Inicia todas las aplicaciones Next.js

### 2. Verificar el despliegue

```bash
./scripts/verify-deployment.sh
```

Este script verifica:
- ✅ Anvil está corriendo
- ✅ Todos los contratos están desplegados
- ✅ Balance de tokens
- ✅ Allowance configurado
- ✅ Roles configurados
- ✅ Archivos .env.local

### 3. Probar el PaymentGateway

```bash
./scripts/test-payment.sh
```

Este script:
- ✅ Verifica balance y allowance
- ✅ Procesa un pago de prueba (10 EURT)
- ✅ Verifica que el pago se registró correctamente
- ✅ Verifica balances después del pago

## Verificación Manual

### Verificar contratos

```bash
# EuroToken
cast code 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 --rpc-url http://localhost:8545

# PaymentGateway
cast code 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 --rpc-url http://localhost:8545
```

### Verificar balance

```bash
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 \
  "balanceOf(address)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url http://localhost:8545
```

### Verificar pagos

```bash
cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 \
  "getTotalPayments()" \
  --rpc-url http://localhost:8545
```

## Solución de Problemas

### Si falta balance de tokens

```bash
./scripts/mint-tokens.sh
```

### Si falta allowance

```bash
./scripts/approve-tokens.sh
```

### Si falta rol PAYMENT_PROCESSOR_ROLE

El script de despliegue debería otorgarlo automáticamente. Si no:

```bash
# Obtener el rol
PROCESSOR_ROLE=$(cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 \
  "PAYMENT_PROCESSOR_ROLE()" \
  --rpc-url http://localhost:8545)

# Otorgar el rol (usando la cuenta admin)
cast send 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 \
  "grantRole(bytes32,address)" \
  "$PROCESSOR_ROLE" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545
```

## Estado Actual

✅ PaymentGateway: **FUNCIONANDO**
✅ EuroToken: **FUNCIONANDO**
✅ Mint automático: **IMPLEMENTADO**
✅ Aprobación automática: **IMPLEMENTADO**
✅ Scripts de verificación: **CREADOS**
✅ Scripts de prueba: **CREADOS**

## Próximos Pasos

1. Ejecutar redespliegue completo: `./scripts/init.sh`
2. Verificar despliegue: `./scripts/verify-deployment.sh`
3. Probar PaymentGateway: `./scripts/test-payment.sh`
4. Probar en la aplicación web
