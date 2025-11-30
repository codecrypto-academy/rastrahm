# 📝 Guía de Configuración de Variables de Entorno

Esta guía explica cómo configurar las variables de entorno para todas las aplicaciones del proyecto.

---

## 📂 Archivos de Plantilla

Se han creado archivos `.env.local.example` en cada aplicación como plantilla:

1. ✅ `stablecoin/compra-stablecoin/app/.env.local.example`
2. ✅ `stablecoin/pasarela-de-pago/app/.env.local.example`
3. ✅ `tienda-online/app/.env.local.example`
4. ✅ `abm-ecommerce/app/.env.local.example`

---

## 🚀 Configuración Rápida

### Paso 1: Copiar las plantillas

Para cada aplicación, copia el archivo de ejemplo:

```bash
# Compra de EuroToken (Puerto 6001)
cd stablecoin/compra-stablecoin/app
cp .env.local.example .env.local

# Pasarela de Pago (Puerto 6000)
cd ../../pasarela-de-pago/app
cp .env.local.example .env.local

# Tienda Online (Puerto 6003)
cd ../../../tienda-online/app
cp .env.local.example .env.local

# ABM E-commerce (Puerto 6002)
cd ../../abm-ecommerce/app
cp .env.local.example .env.local
```

### Paso 2: Ejecutar script de inicialización

El script `init.sh` genera automáticamente las direcciones de contratos:

```bash
# Desde la raíz del proyecto
./scripts/init.sh
```

Este script:
- Despliega todos los contratos
- Actualiza los archivos `.env.local` con las direcciones
- Configura roles y permisos

### Paso 3: Agregar claves de Stripe

Edita manualmente los archivos `.env.local` de las aplicaciones que usan Stripe y agrega tus claves:

**Aplicaciones que requieren Stripe:**
- `stablecoin/compra-stablecoin/app/.env.local`
- `stablecoin/pasarela-de-pago/app/.env.local`
- `tienda-online/app/.env.local`

**Variables a agregar:**
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Ver [CONFIGURACION_STRIPE.md](./CONFIGURACION_STRIPE.md) para más detalles.

---

## 📋 Variables por Aplicación

### 1. Compra de EuroToken (Puerto 6001)

**Archivo**: `stablecoin/compra-stablecoin/app/.env.local`

```env
# Blockchain
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Contratos
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=0x...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# API
NEXT_PUBLIC_API_URL=http://localhost:6001/api
```

### 2. Pasarela de Pago (Puerto 6000)

**Archivo**: `stablecoin/pasarela-de-pago/app/.env.local`

```env
# Blockchain
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Contratos
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=0x...
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_ECOMMERCE_ADDRESS=0x...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Tienda Online (Puerto 6003)

**Archivo**: `tienda-online/app/.env.local`

```env
# Blockchain
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Contratos
NEXT_PUBLIC_ECOMMERCE_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=0x...
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=0x...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. ABM E-commerce (Puerto 6002)

**Archivo**: `abm-ecommerce/app/.env.local`

```env
# Blockchain
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Contratos
NEXT_PUBLIC_ECOMMERCE_ADDRESS=0x...
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=0x...
```

**Nota**: Esta aplicación NO requiere configuración de Stripe.

---

## ✅ Verificación

### Verificar que los archivos existen

```bash
# Desde la raíz del proyecto
ls -la stablecoin/compra-stablecoin/app/.env.local
ls -la stablecoin/pasarela-de-pago/app/.env.local
ls -la tienda-online/app/.env.local
ls -la abm-ecommerce/app/.env.local
```

### Verificar que las variables están configuradas

```bash
# Ver contenido (sin exponer valores sensibles)
grep -E "^[A-Z]" stablecoin/compra-stablecoin/app/.env.local | cut -d'=' -f1
```

---

## 🔒 Seguridad

### ⚠️ IMPORTANTE

1. **Nunca commitees `.env.local`** - Están en `.gitignore`
2. **Usa claves de TEST para desarrollo** - `sk_test_...` y `pk_test_...`
3. **No compartas tus claves** - Especialmente `STRIPE_SECRET_KEY`
4. **Revisa `.gitignore`** - Asegúrate de que `.env.local` está incluido

### Variables Públicas vs Privadas

- **`NEXT_PUBLIC_*`**: Se exponen al cliente (frontend)
  - ✅ Seguro para claves públicas (Stripe publishable key)
  - ❌ NUNCA para claves secretas

- **Sin `NEXT_PUBLIC_`**: Solo en servidor (backend)
  - ✅ Para claves secretas (Stripe secret key, webhook secret)
  - ✅ Para direcciones de contratos (si no se necesitan en frontend)

---

## 🔧 Troubleshooting

### Error: "Variable is not configured"

**Solución**:
1. Verifica que el archivo `.env.local` existe
2. Verifica que la variable está escrita correctamente
3. Reinicia el servidor: `npm run dev`

### Las direcciones de contratos están como "0x..."

**Solución**:
1. Ejecuta `./scripts/init.sh` para desplegar contratos
2. O despliega manualmente y copia las direcciones

### Stripe no funciona

**Solución**:
1. Verifica que las claves están en `.env.local`
2. Verifica que usas claves de TEST para desarrollo
3. Ver [CONFIGURACION_STRIPE.md](./CONFIGURACION_STRIPE.md)

---

## 📚 Referencias

- [CONFIGURACION_STRIPE.md](./CONFIGURACION_STRIPE.md) - Configuración detallada de Stripe
- [README.md](./README.md) - Documentación principal del proyecto
- [scripts/README.md](./scripts/README.md) - Documentación de scripts

---

**Última actualización**: $(date)

