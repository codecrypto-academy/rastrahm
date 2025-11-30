# Configuración de MetaMask para Anvil

## Agregar la Red Local de Anvil

1. Abre MetaMask
2. Haz clic en el menú de redes (arriba a la izquierda)
3. Selecciona "Add Network" → "Add a network manually"
4. Completa los siguientes datos:

```
Network Name: Anvil Local
RPC URL: http://localhost:8545
Chain ID: 31337
Currency Symbol: ETH
Block Explorer URL: (dejar vacío)
```

5. Guarda la red

## Agregar el Token EURT

1. En MetaMask, asegúrate de estar conectado a la red "Anvil Local"
2. Haz clic en "Import tokens" (en la parte inferior de la pantalla de activos)
3. Selecciona "Custom Token"
4. Pega la dirección del contrato EuroToken:

```
0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

5. El símbolo y decimales se detectarán automáticamente:
   - Symbol: EURT
   - Decimals: 6

6. Haz clic en "Add Custom Token"
7. Confirma la importación

## Usar Cuenta de Anvil

### Opción 1: Si la cuenta ya está en MetaMask

Si recibes el error "The account you are trying to import is a duplicate", significa que la cuenta ya está importada en MetaMask.

1. En MetaMask, verifica tus cuentas (haz clic en el icono de cuenta)
2. Busca la cuenta con dirección: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
3. Si la encuentras, simplemente selecciónala y úsala
4. Asegúrate de estar en la red "Anvil Local"

### Opción 2: Importar una cuenta nueva (si no está duplicada)

Si necesitas importar la cuenta de Anvil:

1. En MetaMask, haz clic en el icono de cuenta (arriba a la derecha)
2. Selecciona "Import Account"
3. Selecciona "Private Key"
4. Pega esta clave privada:

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

⚠️ **ADVERTENCIA**: Esta es la primera cuenta de Anvil con fondos. Solo úsala para desarrollo local.

5. Confirma la importación
6. Ahora deberías ver:
   - Balance de ETH (10000 ETH)
   - Balance de EURT (si hiciste mint de tokens)

### Verificar que estás usando la cuenta correcta

La cuenta de Anvil que tiene tokens tiene esta dirección:
```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

Si no ves esta dirección en MetaMask, significa que estás usando una cuenta diferente. En ese caso:
1. Crea una nueva cuenta en MetaMask, O
2. Importa la cuenta de Anvil (si no está duplicada), O
3. Usa la cuenta que ya tienes y haz mint de tokens a esa dirección

## Verificar Balance

Después de hacer mint de tokens, deberías ver el balance en MetaMask. Si no aparece:

1. Asegúrate de estar en la red "Anvil Local"
2. Asegúrate de tener la cuenta correcta seleccionada
3. Refresca la página o recarga MetaMask
4. Si aún no aparece, verifica el balance con:

```bash
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "balanceOf(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545
```

## Solución de Problemas

### MetaMask no muestra el balance

1. Verifica que estés en la red correcta (Chain ID: 31337)
2. Verifica que la dirección del token sea correcta
3. Intenta eliminar y volver a agregar el token
4. Refresca MetaMask (cierra y vuelve a abrir)

### No puedo hacer transacciones

1. Verifica que Anvil esté corriendo: `curl http://localhost:8545`
2. Verifica que tengas ETH en la cuenta (Anvil da 10000 ETH por defecto)
3. Verifica que la red esté configurada correctamente

