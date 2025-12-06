## Escrow DApp ERC20 – Flujo de pruebas

Frontend en `Next.js` para interactuar con el contrato `Escrow` desplegado en una red local de `Anvil` usando `ethers.js` y MetaMask.

### Requisitos previos

- **Node.js** v22 (usar `nvm use v22`)
- **Foundry** (`anvil`, `forge`, `cast`) instalado y en el `PATH`
- **MetaMask** u otra wallet compatible con EIP-6963 en el navegador

### 1. Iniciar Anvil

No es necesario arrancar `anvil` manualmente: el script `init.sh` comprueba si el puerto `8545` está libre y, si es necesario, lanza `anvil` en segundo plano.

Si quieres iniciarlo manualmente:

```bash
cd "/home/rolando/Documentos/Cursos/codecrypto/Modulo 2/Proyectos/escrow"
anvil
```

### 2. Ejecutar `init.sh` (despliegue y frontend)

Desde la raíz del proyecto:

```bash
cd "/home/rolando/Documentos/Cursos/codecrypto/Modulo 2/Proyectos/escrow"
chmod +x init.sh
./init.sh
```

Este script:

- Arranca `anvil` si no está corriendo.
- Usa la cuenta `#0` de `anvil` como `PRIVATE_KEY` por defecto.
- Ejecuta el script de Foundry que despliega:
  - `Escrow`
  - `MockERC20` Token A
  - `MockERC20` Token B
- Crea/actualiza `web/.env.local` con:
  - `NEXT_PUBLIC_ESCROW_ADDRESS`
  - `NEXT_PUBLIC_TOKEN_A_ADDRESS`
  - `NEXT_PUBLIC_TOKEN_B_ADDRESS`
  - `NEXT_PUBLIC_RPC_URL`
- Limpia cachés de Next.js y arranca el dev server en `http://localhost:3000`.

### 3. Importar cuentas de test en MetaMask

En `anvil`, la cuenta `#0` y las siguientes tienen fondos y claves conocidas. Algunos ejemplos:

- Account #0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Account #1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Account #2: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

Importa al menos **dos cuentas** (por ejemplo, `#0` y `#1`) en MetaMask usando las private keys que expone `anvil`.

### 4. Agregar tokens permitidos

1. Abre `http://localhost:3000` en el navegador.
2. Conecta tu wallet (`ConnectButton` en el header).
3. Con la **cuenta owner** (por defecto la cuenta que desplegó el contrato, normalmente `Account #0`):
   - En el panel `Tokens permitidos`:
     - Verás la dirección del contrato `Escrow`.
     - Si `Token A` y `Token B` no están agregados, el componente intentará agregarlos automáticamente.
     - También puedes usar los botones `+ Token A` y `+ Token B` para agregarlos manualmente.

Si `getAllowedTokens()` falla, la lista se mostrará vacía y se indicará el error en un mensaje en rojo.

### 5. Crear operación con cuenta 1

1. En MetaMask, selecciona la **cuenta 1** (por ejemplo `Account #0` u otra con tokens A).
2. En el panel **"Crear operación de swap"**:
   - Selecciona `Token A` (el token que ofreces).
   - Selecciona `Token B` (el token que quieres recibir).
   - Introduce la cantidad de `Token A` y `Token B`.
   - En `Dirección del segundo usuario (user2)` escribe la dirección de la **cuenta 2** (por ejemplo `Account #1`).
3. Envía el formulario:
   - El componente:
     - Comprueba balance y `allowance`.
     - Si es necesario, llama a `approve()` para `Token A`.
     - Llama a `createOperation()` en el contrato `Escrow`.
   - Si la transacción es rechazada en MetaMask, se mostrará un mensaje claro en rojo.

La nueva operación aparecerá en **"Operaciones de swap"** y se auto-refresca cada 5 segundos.

### 6. Cambiar a cuenta 2 en MetaMask

1. En MetaMask, cambia a la **cuenta 2** (por ejemplo `Account #1`).
2. Recarga la página si es necesario o usa el botón **"Actualizar"** en el listado de operaciones.

### 7. Completar operación con cuenta 2

1. En **"Operaciones de swap"**, localiza la operación que creaste:
   - `user1` será la cuenta que creó la operación.
   - `user2` será la cuenta actual (si coincide, verás la etiqueta `(Tú)`).
2. Para la cuenta `user2`:
   - Aparecerá el botón **"Completar operación"** si:
     - Eres `user2`.
     - La operación está activa.
3. Al pulsar **"Completar operación"**:
   - El componente:
     - Comprueba balance y `allowance` de `Token B`.
     - Llama a `approve()` si hace falta.
     - Llama a `completeOperation()` en el contrato `Escrow`.
   - Si el usuario rechaza la transacción en MetaMask, se mostrará un mensaje de error específico.

Tras confirmarse la transacción, la operación cambiará a estado **Closed**.

### 8. Verificar balances actualizados

Usa el panel **"Debug de balances"** (columna derecha) para revisar:

- Balances de **ETH** para:
  - Contrato `Escrow`
  - Account #0
  - Account #1
  - Account #2
- Balances de **Token A** y **Token B** para las mismas direcciones.

Puedes pulsar el botón **"Refresh"** para recargar manualmente los balances después de cada operación.

### 9. Probar cancelación de operación

1. Vuelve a la cuenta **creadora** (`user1`) en MetaMask.
2. Crea una nueva operación de swap sin completarla.
3. En la lista **"Operaciones de swap"**, para esa operación:
   - Si eres `user1` y la operación está activa, verás el botón **"Cancelar operación"**.
4. Pulsa **"Cancelar operación"**:
   - El frontend llama a `cancelOperation()` en el contrato `Escrow`.
   - Si la transacción es rechazada en MetaMask, se mostrará un mensaje de error específico.
5. Tras confirmarse la transacción:
   - El estado pasará a **Closed**.
   - Puedes usar **"Debug de balances"** para verificar que los tokens regresan correctamente al creador.

Con este flujo tienes cubierto el ciclo completo de prueba: despliegue, configuración de tokens, creación, completado y cancelación de operaciones, además de la verificación de balances en todas las cuentas relevantes.
