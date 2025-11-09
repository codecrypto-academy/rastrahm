# Guía de Prueba del Sistema Gasless

Esta guía te ayudará a probar el sistema de votación gasless con EIP-2771.

## Prerrequisitos

1. **Anvil corriendo** en `http://127.0.0.1:8545`
2. **Contratos desplegados** (MinimalForwarder y DAOVoting)
3. **Variables de entorno configuradas** en `.env.local`

## Paso 1: Iniciar Anvil

```bash
cd sc
anvil
```

Anvil iniciará con 10 cuentas predefinidas. La primera cuenta (índice 0) tiene la clave privada:
`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

## Paso 2: Desplegar Contratos

En una nueva terminal:

```bash
cd sc
forge script script/DeployForwarderAndDAO.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Importante:** Copia las direcciones de los contratos desplegados:
- `MinimalForwarder deployed at: 0x...`
- `DAOVoting deployed at: 0x...`

## Paso 3: Configurar Variables de Entorno

Crea un archivo `.env.local` en el directorio `web/`:

```env
# Direcciones de los contratos (reemplaza con las direcciones reales)
NEXT_PUBLIC_DAO_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_FORWARDER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Configuración de red
NEXT_PUBLIC_CHAIN_ID=31337
RPC_URL=http://127.0.0.1:8545

# Relayer (usa la primera cuenta de Anvil como relayer)
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RELAYER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Nota:** Las direcciones de ejemplo son las que Anvil usa por defecto. Si desplegaste en otras direcciones, actualiza los valores.

## Paso 4: Iniciar el Frontend

```bash
cd web
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

## Paso 5: Configurar MetaMask

1. **Agregar red local:**
   - Network Name: `Anvil Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Importar cuenta de prueba:**
   - Usa una de las cuentas privadas de Anvil (índice 1-9)
   - Importa la clave privada en MetaMask

## Paso 6: Probar el Sistema

### 6.1. Conectar Wallet
1. Abre `http://localhost:3000`
2. Haz clic en "Conectar Wallet"
3. Acepta la conexión en MetaMask

### 6.2. Depositar Fondos
1. En el panel de financiación, ingresa una cantidad (ej: 1 ETH)
2. Haz clic en "Depositar"
3. Confirma la transacción en MetaMask
4. Verifica que tu balance se actualice

### 6.3. Crear Propuesta
1. Verifica que tengas ≥10% del balance total del DAO
2. Completa el formulario:
   - Beneficiario: dirección de destino
   - Cantidad: monto en ETH
   - Deadline: fecha límite (timestamp Unix)
3. Haz clic en "Crear Propuesta"
4. Confirma la transacción en MetaMask

### 6.4. Votar (Gasless)
1. En la lista de propuestas, encuentra la propuesta que creaste
2. Haz clic en uno de los botones: "A FAVOR", "EN CONTRA", o "ABSTENCIÓN"
3. **MetaMask solicitará firmar un mensaje EIP-712 (NO una transacción)**
4. Acepta la firma
5. El voto se procesará sin gas (el relayer pagará)
6. Verifica que el voto se actualice en la UI

### 6.5. Verificar en la Blockchain
Puedes verificar que la transacción fue ejecutada por el relayer:

```bash
# Ver las últimas transacciones
cast tx <txHash> --rpc-url http://127.0.0.1:8545
```

## Paso 7: Activar el Daemon de Ejecución Automática

El daemon se encarga de monitorear las propuestas aprobadas y ejecutar automáticamente aquellas que cumplan con todas las condiciones (deadline vencido, período de seguridad completado y votos a favor mayores que en contra).

1. Asegúrate de tener configuradas las variables de entorno en `.env.local`, incluyendo `RELAYER_PRIVATE_KEY`, `RELAYER_ADDRESS`, `RPC_URL` y `NEXT_PUBLIC_DAO_ADDRESS`.
2. En una nueva terminal, inicia el daemon:

   ```bash
   cd web
   npm run daemon
   ```

3. El proceso registrará logs en consola indicando:
   - La red a la que está conectado.
   - Las propuestas pendientes de ejecución.
   - El hash de las transacciones enviadas.

4. Para ejecutar una sola pasada (útil en pruebas), usa:

   ```bash
   npm run daemon -- --once
   ```

5. Detén el daemon con `Ctrl + C` cuando termines las pruebas.

## Solución de Problemas

### Error: "RELAYER_PRIVATE_KEY no configurada"
- Verifica que el archivo `.env.local` existe
- Verifica que las variables de entorno estén correctamente escritas
- Reinicia el servidor de desarrollo (`npm run dev`)

### Error: "Firma inválida o request no válido"
- Verifica que el nonce sea correcto
- Verifica que el deadline no haya expirado
- Verifica que la firma EIP-712 sea correcta

### Error: "Transacción revertida"
- Verifica que el relayer tenga suficiente ETH
- Verifica que el contrato DAO confíe en el MinimalForwarder
- Verifica los logs del servidor para más detalles

### El voto no se actualiza en la UI
- Refresca la página
- Verifica que la transacción fue exitosa en el explorador de bloques
- Verifica la consola del navegador para errores

## Verificación Manual

Puedes verificar manualmente que el sistema funciona:

```bash
# Obtener el nonce de un usuario
cast call <FORWARDER_ADDRESS> "getNonce(address)(uint256)" <USER_ADDRESS> --rpc-url http://127.0.0.1:8545

# Verificar el balance del DAO
cast call <DAO_ADDRESS> "totalBalance()(uint256)" --rpc-url http://127.0.0.1:8545

# Ver una propuesta
cast call <DAO_ADDRESS> "getProposal(uint256)(uint256,address,uint256,uint256,uint256,uint256,uint256,bool,uint256,uint256)" <PROPOSAL_ID> --rpc-url http://127.0.0.1:8545
```

## Próximos Pasos

Una vez que el sistema básico funcione, puedes:
1. Probar cambiar votos (votar A FAVOR y luego cambiar a EN CONTRA)
2. Probar ejecutar propuestas aprobadas
3. Probar edge cases (deadline expirado, balance insuficiente, etc.)

