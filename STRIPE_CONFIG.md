# 🔑 Configuración Completa de Stripe

Guía completa para configurar Stripe en el proyecto E-commerce con Blockchain en entorno Linux.

---

## 📋 Índice

1. [Instalación de Stripe CLI](#instalación-de-stripe-cli)
2. [Obtención de Claves de Stripe](#obtención-de-claves-de-stripe)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Configuración de Webhooks con Stripe CLI](#configuración-de-webhooks-con-stripe-cli)
5. [Verificación y Testing](#verificación-y-testing)
6. [Troubleshooting](#troubleshooting)

---

## 1. Instalación de Stripe CLI

### Opción 1: Instalación Directa (Recomendada)

```bash
# Descargar la última versión
curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg

# Agregar el repositorio
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.com/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list

# Actualizar e instalar
sudo apt update
sudo apt install stripe
```

### Opción 2: Descarga Manual

```bash
# Descargar desde GitHub
cd /tmp
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz

# Extraer
tar -xzf stripe_linux_x86_64.tar.gz

# Mover a /usr/local/bin
sudo mv stripe /usr/local/bin/

# Verificar instalación
stripe --version
```

### Verificar Instalación

```bash
stripe --version
# Debería mostrar: stripe version 1.x.x
```

---

## 2. Obtención de Claves de Stripe

### Paso 1: Crear Cuenta en Stripe

1. Ve a [https://stripe.com](https://stripe.com)
2. Crea una cuenta (gratis para desarrollo)
3. Accede al [Dashboard](https://dashboard.stripe.com)

### Paso 2: Obtener API Keys

1. Ve a **Developers** → **API keys**
2. Asegúrate de estar en modo **Test** (toggle en la parte superior)
3. Copia las siguientes claves:

**Clave Secreta (Secret Key):**
```
sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```
- Esta es tu `STRIPE_SECRET_KEY`
- ⚠️ **NUNCA** uses el prefijo `NEXT_PUBLIC_` para esta clave

**Clave Pública (Publishable Key):**
```
pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```
- Esta es tu `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ **SÍ** debe tener el prefijo `NEXT_PUBLIC_`

### Paso 3: Autenticar Stripe CLI

```bash
stripe login
```

Esto abrirá tu navegador para autenticarte. Una vez autenticado, Stripe CLI estará listo para usar.

---

## 3. Configuración de Variables de Entorno

### Archivos que Requieren Stripe

Tres aplicaciones necesitan configuración de Stripe:

1. **Compra de EuroToken** (Puerto 3001)
   - Archivo: `stablecoin/compra-stablecoin/app/.env.local`

2. **Pasarela de Pago** (Puerto 3000)
   - Archivo: `stablecoin/pasarela-de-pago/app/.env.local`

3. **Tienda Online** (Puerto 3003)
   - Archivo: `tienda-online/app/.env.local`

### Configuración Manual

Para cada aplicación, crea o edita el archivo `.env.local`:

#### Compra de EuroToken (3001)

```bash
cd stablecoin/compra-stablecoin/app
cp .env.local.example .env.local
nano .env.local
```

Agrega:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=  # Se obtiene de Stripe CLI (ver sección siguiente)
```

#### Pasarela de Pago (3000)

```bash
cd stablecoin/pasarela-de-pago/app
cp .env.local.example .env.local
nano .env.local
```

Agrega:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=  # Se obtiene de Stripe CLI (ver sección siguiente)
```

#### Tienda Online (3003)

```bash
cd tienda-online/app
cp .env.local.example .env.local
nano .env.local
```

Agrega:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=  # Se obtiene de Stripe CLI (ver sección siguiente)
```

### Configuración Automática con Scripts

El script `restart-all.sh` puede generar los archivos `.env.local` automáticamente:

```bash
# Primero configura el .env principal
nano .env

# Agrega:
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Luego ejecuta
./scripts/restart-all.sh
```

El script creará los `.env.local` con las variables de contratos, pero **deberás agregar manualmente** el `STRIPE_WEBHOOK_SECRET` después de configurar Stripe CLI.

---

## 4. Configuración de Webhooks con Stripe CLI

### ⚠️ IMPORTANTE: NO uses Stripe Dashboard para desarrollo local

Stripe Dashboard **NO acepta URLs de localhost**. Para desarrollo local, **SIEMPRE usa Stripe CLI**.

### Configuración por Aplicación

#### Compra de EuroToken (Puerto 3001)

1. **Inicia tu aplicación:**
```bash
cd stablecoin/compra-stablecoin/app
npm run dev
```

2. **En otra terminal, ejecuta Stripe CLI:**
```bash
stripe listen --forward-to localhost:3001/api/webhook
```

3. **Copia el Webhook Secret:**
Stripe CLI mostrará algo como:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
```

4. **Agrega al .env.local:**
```bash
nano stablecoin/compra-stablecoin/app/.env.local
```

Agrega:
```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

5. **Reinicia la aplicación:**
```bash
# Detén con Ctrl+C y vuelve a iniciar
npm run dev
```

#### Pasarela de Pago (Puerto 3000)

```bash
# Terminal 1: Inicia la aplicación
cd stablecoin/pasarela-de-pago/app
npm run dev

# Terminal 2: Stripe CLI
stripe listen --forward-to localhost:3000/api/webhook

# Copia el whsec_... y agrégalo a .env.local
```

#### Tienda Online (Puerto 3003)

```bash
# Terminal 1: Inicia la aplicación
cd tienda-online/app
npm run dev

# Terminal 2: Stripe CLI
stripe listen --forward-to localhost:3003/api/webhook

# Copia el whsec_... y agrégalo a .env.local
```

### Múltiples Aplicaciones Simultáneamente

Si necesitas que múltiples aplicaciones reciban webhooks al mismo tiempo, usa **terminales separadas** para cada `stripe listen`:

```bash
# Terminal 1: Compra EURT
stripe listen --forward-to localhost:3001/api/webhook

# Terminal 2: Pasarela
stripe listen --forward-to localhost:3000/api/webhook

# Terminal 3: Tienda
stripe listen --forward-to localhost:3003/api/webhook
```

Cada una mostrará su propio `whsec_...` único.

---

## 5. Verificación y Testing

### Verificar que Stripe CLI está funcionando

1. **Verifica que Stripe CLI está corriendo:**
```bash
# Deberías ver algo como:
> Ready! Your webhook signing secret is whsec_...
```

2. **Envía un evento de prueba:**
```bash
# En otra terminal (mientras Stripe CLI está corriendo)
stripe trigger payment_intent.succeeded
```

3. **Verifica en la terminal de Stripe CLI:**
Deberías ver:
```
2024-11-17 10:30:45  --> payment_intent.succeeded [evt_1234567890]
2024-11-17 10:30:45  <-- [200] POST http://localhost:3001/api/webhook [evt_1234567890]
```

4. **Verifica en los logs de tu aplicación:**
Deberías ver logs del webhook procesándose.

### Probar con un Pago Real

1. **Abre tu aplicación en el navegador:**
```
http://localhost:3001  # Compra EURT
http://localhost:3000  # Pasarela
http://localhost:3003  # Tienda
```

2. **Conecta tu wallet MetaMask**

3. **Intenta hacer un pago:**
   - Usa tarjeta de prueba: `4242 4242 4242 4242`
   - Fecha: cualquier fecha futura (ej: 12/25)
   - CVC: cualquier 3 dígitos (ej: 123)

4. **Verifica que el webhook se procesa:**
   - Revisa la terminal de Stripe CLI
   - Revisa los logs de tu aplicación
   - Verifica que los tokens se acuñaron/transfirieron

---

## 6. Troubleshooting

### Error: "stripe: command not found"

**Solución:**
```bash
# Verifica la instalación
which stripe

# Si no está instalado, reinstala:
sudo apt update
sudo apt install stripe

# O descarga manualmente desde GitHub
```

### Error: "STRIPE_SECRET_KEY is not configured"

**Solución:**
1. Verifica que el archivo `.env.local` existe
2. Verifica que `STRIPE_SECRET_KEY` está escrito correctamente (sin espacios)
3. Reinicia la aplicación: `npm run dev`

### Error: "STRIPE_WEBHOOK_SECRET is not configured"

**Solución:**
1. Asegúrate de que Stripe CLI está corriendo
2. Copia el `whsec_...` que muestra Stripe CLI
3. Agrégalo a `.env.local` como `STRIPE_WEBHOOK_SECRET=whsec_...`
4. Reinicia la aplicación

### Error: "Webhook signature verification failed"

**Causa:** El `STRIPE_WEBHOOK_SECRET` no coincide

**Solución:**
1. Asegúrate de usar el secret de Stripe CLI (no del Dashboard)
2. Verifica que Stripe CLI está corriendo cuando haces el pago
3. Verifica que el secret está correctamente copiado (sin espacios extra)

### Error: "Invalid URL: An HTTP or HTTPS URL must be provided"

**Causa:** Intentaste configurar webhook en Stripe Dashboard con `localhost`

**Solución:**
- **NO uses Stripe Dashboard para desarrollo local**
- Usa Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhook`

### Stripe CLI no recibe eventos

**Solución:**
1. Verifica que Stripe CLI está corriendo
2. Verifica que la aplicación está corriendo en el puerto correcto
3. Verifica que el comando `stripe listen` apunta al puerto correcto
4. Prueba enviando un evento: `stripe trigger payment_intent.succeeded`

### La aplicación no recibe webhooks

**Solución:**
1. Verifica que Stripe CLI está corriendo
2. Verifica que la aplicación está corriendo
3. Verifica que `STRIPE_WEBHOOK_SECRET` está configurado
4. Revisa los logs de la aplicación para errores
5. Revisa la terminal de Stripe CLI para ver si los eventos se están enviando

### Webhook secret diferente cada vez

**Nota:** Esto es normal. Cada vez que ejecutas `stripe listen`, Stripe CLI genera un nuevo secret. Si cambias el secret, debes actualizar `.env.local` y reiniciar la aplicación.

**Solución:**
- Usa el mismo secret durante toda tu sesión de desarrollo
- O actualiza `.env.local` cada vez que reinicies Stripe CLI

---

## 📋 Resumen Rápido

### Configuración Inicial (Una vez)

1. Instalar Stripe CLI
2. Autenticar: `stripe login`
3. Obtener claves de Stripe Dashboard
4. Configurar `.env.local` en cada aplicación con:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Cada Sesión de Desarrollo

1. Iniciar aplicación: `npm run dev`
2. En otra terminal: `stripe listen --forward-to localhost:PUERTO/api/webhook`
3. Copiar `whsec_...` y agregar a `.env.local`
4. Reiniciar aplicación

### Para Probar

1. Usar tarjeta de prueba: `4242 4242 4242 4242`
2. Verificar logs en Stripe CLI y aplicación
3. Verificar que los tokens se procesaron on-chain

---

## 🔒 Seguridad

### ⚠️ IMPORTANTE

1. **Nunca commitees `.env.local`** - Están en `.gitignore`
2. **Usa claves de TEST para desarrollo** - `sk_test_...` y `pk_test_...`
3. **Nunca expongas `STRIPE_SECRET_KEY`** - Solo en servidor (sin `NEXT_PUBLIC_`)
4. **Usa `NEXT_PUBLIC_` solo para claves públicas** - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Variables Públicas vs Privadas

| Variable | Tipo | Dónde va | Ejemplo |
|----------|------|----------|---------|
| `STRIPE_SECRET_KEY` | Privada | Solo servidor | `sk_test_51...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Pública | Cliente | `pk_test_51...` |
| `STRIPE_WEBHOOK_SECRET` | Privada | Solo servidor | `whsec_...` |

---

## 📚 Referencias

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

**Última actualización**: $(date)

