# DAO Voting – Frontend (Next.js 15)

Interfaz web para interactuar con el contrato `DAOVoting` mediante meta-transacciones EIP‑2771, incluyendo un relayer y un daemon de ejecución automática.

## 🚀 Inicio rápido

### Con el script integral

En el directorio raíz del repositorio:

```bash
./scripts/start-dev.sh               # despliega contratos, prepara .env.local y arranca el front
# ./scripts/start-dev.sh --with-daemon  (opcional) ejecuta el daemon en paralelo
```

El script:
1. Levanta (o reutiliza) un nodo Anvil.
2. Despliega `MinimalForwarder` y `DAOVoting`.
3. Actualiza `web/.env.local` con las direcciones generadas.
4. Instala dependencias y ejecuta `npm run dev`.

### Configuración manual

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia y personaliza las variables de entorno:

   ```bash
  cp .env.local.example .env.local
   ```

   ```env
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_DAO_ADDRESS=0x...       # Dirección del contrato DAOVoting
NEXT_PUBLIC_FORWARDER_ADDRESS=0x... # Dirección del MinimalForwarder confiado
RELAYER_PRIVATE_KEY=0x...           # Clave con fondos para pagar gas
RELAYER_ADDRESS=0x...               # Dirección pública del relayer
RPC_URL=http://127.0.0.1:8545       # RPC que usará el relayer
   ```

3. Ejecuta el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Daemon de ejecución automática

Para monitorear y ejecutar propuestas aprobadas sin intervención manual:

```bash
npm run daemon
```

- `npm run daemon -- --once` ejecuta un solo ciclo (ideal para automatizar con cron).
- Usa `DAEMON_INTERVAL_MS` en `.env.local` para modificar la periodicidad (por defecto 60000 ms).
- El daemon utiliza el `RELAYER_PRIVATE_KEY`; asegúrate de que la cuenta tenga fondos en la red seleccionada.

## 📁 Estructura relevante

```
web/
├── app/
│   ├── api/relay/route.ts      # End-point Next.js que actúa como relayer
│   ├── layout.tsx              # Root layout (provee Web3Context)
│   └── page.tsx                # Página principal
├── components/
│   ├── ui/ConnectWallet.tsx    # Botón de conexión con MetaMask
│   └── proposals/              # UI para funding, creación y votación
├── contexts/Web3Context.tsx    # Manejo de provider, signer y estado de conexión
├── hooks/useGaslessVote.ts     # Flujo completo de meta-transacciones (EIP-712)
├── lib/
│   ├── contracts/forwarder.ts  # Helpers EIP-712 + nonces del forwarder
│   └── utils/metatx.ts         # Serialización para la API del relayer
├── scripts/execution-daemon.ts # Proceso en segundo plano para ejecutar propuestas
└── TESTING.md                  # Guía detallada para pruebas end-to-end
```

## 🔄 Flujo del voto gasless

1. `useGaslessVote` obtiene el nonce vigente desde `MinimalForwarder`.
2. Se genera y firma un `ForwardRequest` con `signer.signTypedData` (EIP‑712).
3. La API `POST /api/relay` valida la firma con `forwarder.verify` y ejecuta `forwarder.execute`.
4. El frontend espera `provider.waitForTransaction(txHash)` para sincronizar la UI.

## 🧰 Herramientas

- **Next.js 15 (App Router)** para la UI.
- **TypeScript** y **Tailwind CSS**.
- **ethers.js v6** para interacción con Ethereum.
- **MetaMask / EIP‑1193** como proveedor.
- **EIP‑712** para las firmas tipadas de las meta-transacciones.

## 📚 Recursos adicionales

- `TESTING.md`: guía paso a paso para verificar depósitos, propuestas y votos gasless.
- `SECURITY_AUDIT.md`: resumen de las medidas de seguridad implementadas en los contratos.
- Scripts auxiliares: `scripts/test-setup.sh` para configuraciones puntuales y `npm run daemon` para la automatización.

