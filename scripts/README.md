# Scripts de Despliegue y Gestión

Este directorio contiene scripts para facilitar el despliegue y gestión del proyecto E-commerce con Blockchain.

## Scripts Disponibles

### 1. `init.sh` - Inicialización Completa del Proyecto

Despliega todos los contratos inteligentes y genera el archivo `.env` con todas las direcciones.

**Uso:**
```bash
./scripts/init.sh
```

**Requisitos:**
- Anvil corriendo en `localhost:8545`
- Variable de entorno `PRIVATE_KEY` (opcional, usa clave por defecto de Anvil si no está configurada)

**Qué hace:**
1. Verifica que Anvil esté corriendo
2. Despliega EuroToken
3. Despliega StablecoinPurchase
4. Despliega PaymentGateway
5. Despliega Ecommerce
6. Genera archivo `.env` con todas las direcciones

**Salida:**
- Archivo `.env` en la raíz del proyecto con todas las direcciones de contratos
- Logs de despliegue en consola

---

### 2. `deploy.sh` - Desplegar Contratos Individuales

Despliega contratos específicos de forma individual.

**Uso:**
```bash
./scripts/deploy.sh [CONTRATO]
```

**Contratos disponibles:**
- `eurotoken` - Desplegar EuroToken
- `purchase` - Desplegar StablecoinPurchase (requiere EURO_TOKEN_ADDRESS)
- `gateway` - Desplegar PaymentGateway (requiere EURO_TOKEN_ADDRESS)
- `ecommerce` - Desplegar Ecommerce (requiere EURO_TOKEN_ADDRESS y PAYMENT_GATEWAY_ADDRESS)
- `all` - Desplegar todos los contratos en orden

**Ejemplos:**
```bash
# Desplegar solo EuroToken
./scripts/deploy.sh eurotoken

# Desplegar todos los contratos
./scripts/deploy.sh all
```

**Requisitos:**
- Anvil corriendo en `localhost:8545`
- Para contratos dependientes, las direcciones deben estar en `.env`

---

### 3. `restart-all.sh` - Reiniciar Todos los Servicios

Inicia Anvil y todas las aplicaciones Next.js del proyecto.

**Uso:**
```bash
./scripts/restart-all.sh
```

**Qué hace:**
1. Detiene servicios existentes (si están corriendo)
2. Inicia Anvil en puerto 8545
3. Verifica/ejecuta `init.sh` si no existe `.env`
4. Inicia Pasarela de Pago (puerto 6000)
5. Inicia Compra de EuroToken (puerto 6001)
6. Inicia ABM E-commerce (puerto 6002)
7. Inicia Tienda Online (puerto 6003)

**Requisitos:**
- Node.js v22 instalado
- Dependencias de cada aplicación instaladas (se instalan automáticamente si faltan)

**Salida:**
- Logs de cada servicio en `logs/`:
  - `logs/anvil.log`
  - `logs/Pasarela de Pago.log`
  - `logs/Compra de EuroToken.log`
  - `logs/ABM E-commerce.log`
  - `logs/Tienda Online.log`

**URLs de acceso:**
- Anvil: http://localhost:8545
- Pasarela de Pago: http://localhost:6000
- Compra EuroToken: http://localhost:6001
- ABM E-commerce: http://localhost:6002
- Tienda Online: http://localhost:6003

---

### 4. `stop-all.sh` - Detener Todos los Servicios

Detiene todos los servicios (Anvil y aplicaciones Next.js).

**Uso:**
```bash
./scripts/stop-all.sh
```

**Qué hace:**
- Detiene procesos en puertos: 8545, 6000, 6001, 6002, 6003

---

## Flujo de Trabajo Recomendado

### Primera vez (Inicialización)

1. **Iniciar Anvil:**
   ```bash
   anvil
   ```

2. **Inicializar proyecto (desplegar contratos y generar .env):**
   ```bash
   ./scripts/init.sh
   ```

3. **Configurar Stripe en `.env`:**
   ```bash
   # Editar .env y agregar tus claves de Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Iniciar todos los servicios:**
   ```bash
   ./scripts/restart-all.sh
   ```

### Desarrollo Diario

1. **Iniciar Anvil (si no está corriendo):**
   ```bash
   anvil
   ```

2. **Reiniciar todos los servicios:**
   ```bash
   ./scripts/restart-all.sh
   ```

3. **Detener todos los servicios:**
   ```bash
   ./scripts/stop-all.sh
   ```

### Desplegar Contratos Individuales

Si necesitas redesplegar un contrato específico:

```bash
# Desplegar solo EuroToken
./scripts/deploy.sh eurotoken

# Desplegar todos los contratos en orden
./scripts/deploy.sh all
```

---

## Estructura del Archivo .env

El script `init.sh` genera un archivo `.env` con la siguiente estructura:

```env
# Direcciones de Contratos
EURO_TOKEN_ADDRESS=0x...
STABLECOIN_PURCHASE_ADDRESS=0x...
PAYMENT_GATEWAY_ADDRESS=0x...
ECOMMERCE_ADDRESS=0x...

# Configuración de Red
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Variables para aplicaciones Next.js
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_PURCHASE_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=0x...
NEXT_PUBLIC_ECOMMERCE_ADDRESS=0x...

# Configuración de Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Configuración de Roles
PURCHASER_ADDRESS=0x...
PAYMENT_PROCESSOR_ADDRESS=0x...
```

---

## Solución de Problemas

### Error: "Anvil no está corriendo"
```bash
# Iniciar Anvil en otra terminal
anvil
```

### Error: "PRIVATE_KEY no está configurada"
El script usa la clave por defecto de Anvil. Si necesitas usar otra clave:
```bash
export PRIVATE_KEY=0x...
./scripts/init.sh
```

### Error: "Puerto ya en uso"
```bash
# Detener todos los servicios
./scripts/stop-all.sh

# Luego reiniciar
./scripts/restart-all.sh
```

### Error: "EURO_TOKEN_ADDRESS no está configurada"
Asegúrate de desplegar los contratos en orden:
1. EuroToken primero
2. Luego StablecoinPurchase y PaymentGateway
3. Finalmente Ecommerce

O usa `./scripts/deploy.sh all` para desplegar todos en orden.

---

## Notas Importantes

1. **Anvil debe estar corriendo** antes de ejecutar scripts de despliegue
2. **El archivo `.env`** se genera automáticamente con `init.sh`
3. **Las aplicaciones Next.js** crean su propio `.env.local` basado en `.env` del proyecto
4. **Los logs** se guardan en `logs/` para debugging
5. **Los scripts son idempotentes**: puedes ejecutarlos múltiples veces sin problemas

---

## Próximos Pasos

Después de ejecutar `init.sh` y `restart-all.sh`:

1. Verifica que todos los servicios estén corriendo
2. Accede a las aplicaciones en sus URLs
3. Conecta tu wallet MetaMask a la red Anvil (Chain ID: 31337)
4. Configura las claves de Stripe en `.env` para habilitar pagos con tarjeta

