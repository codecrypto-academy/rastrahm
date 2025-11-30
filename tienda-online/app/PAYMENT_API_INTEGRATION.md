# Integración de APIs de Pago - Tienda Online

## ✅ Completado con TDD (RED → GREEN → REFACTOR)

### APIs Implementadas

#### 1. `/api/create-payment-intent`
- ✅ **8 tests pasando**
- Funcionalidad:
  - Crear payment intents de Stripe
  - Validar campos requeridos (amount, payerAddress, payeeAddress)
  - Validar monto mayor que cero
  - Validar direcciones Ethereum
  - Incluir invoiceId en metadata (opcional)
  - Manejar errores de Stripe API

#### 2. `/api/webhook`
- ✅ **7 tests pasando**
- Funcionalidad:
  - Procesar eventos `payment_intent.succeeded` de Stripe
  - Verificar firma de webhook
  - Procesar pago on-chain a través de PaymentGateway
  - Marcar factura como pagada en contrato Ecommerce
  - Manejar errores y eventos no manejados

### Módulos Creados

1. **`lib/paymentGateway.ts`**
   - `getPaymentGatewayContract()` - Obtener instancia del contrato
   - `processPayment()` - Procesar pagos on-chain

2. **`lib/payment.ts`**
   - `parsePaymentAmount()` - Convertir EUR a tokens
   - `generatePaymentId()` - Generar IDs únicos de pago

3. **`lib/ecommerce.ts`** (actualizado)
   - `processInvoicePayment()` - Procesar pago de factura

### Flujo de Pago Completo

1. **Cliente** crea factura desde carrito → `createInvoice()` en contrato Ecommerce
2. **Cliente** inicia pago → `/api/create-payment-intent`
3. **Stripe** crea payment intent con metadata:
   - `payerAddress`: Dirección del cliente
   - `payeeAddress`: Dirección de la empresa
   - `invoiceId`: ID de la factura (ej: "INV-123")
4. **Cliente** completa pago con tarjeta en Stripe
5. **Webhook** recibe evento `payment_intent.succeeded`
6. **Webhook** procesa pago on-chain:
   - Paso 1: Transfiere tokens a través de PaymentGateway
   - Paso 2: Marca factura como pagada en contrato Ecommerce
7. **Factura** queda marcada como pagada

### Variables de Entorno Necesarias

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Blockchain
PRIVATE_KEY=0x... (para firmar transacciones en webhook)
RPC_URL=http://localhost:8545
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=0x...
NEXT_PUBLIC_ECOMMERCE_ADDRESS=0x...
```

### Estadísticas de Tests

```
API Tests: 15 pasando ✅
- create-payment-intent: 8 tests ✅
- webhook: 7 tests ✅
```

### Archivos Creados

1. `app/api/create-payment-intent/route.ts` - Crear payment intents
2. `app/api/webhook/route.ts` - Procesar webhooks de Stripe
3. `app/api/__tests__/create-payment-intent.test.ts` - Tests para payment intent
4. `app/api/__tests__/webhook.test.ts` - Tests para webhook
5. `lib/paymentGateway.ts` - Utilidades de PaymentGateway
6. `lib/payment.ts` - Utilidades de pago

### Notas de Implementación

#### Payment Intent
- Amount en centavos (EUR)
- Metadata incluye: payerAddress, payeeAddress, invoiceId
- Currency: EUR

#### Webhook
- Verifica firma con `STRIPE_WEBHOOK_SECRET`
- Solo procesa eventos `payment_intent.succeeded`
- Procesa pago en dos pasos:
  1. PaymentGateway: Transfiere tokens
  2. Ecommerce: Marca factura como pagada
- Si el paso 2 falla, el pago ya fue procesado pero se loguea el error

### Próximos Pasos

1. Crear componente frontend para procesar pagos de facturas
2. Integrar Stripe Elements en la tienda online
3. Agregar visualización de estado de pago en facturas

