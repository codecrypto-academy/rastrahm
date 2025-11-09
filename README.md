# DAO Voting – Plataforma con Meta-Transacciones

Sistema completo para gestionar un DAO con votaciones “una persona, un voto”, soporte de meta-transacciones (EIP‑2771) y automatización de ejecución de propuestas.

## 🧱 Estructura del repositorio

```
.
├── sc/                    # Contratos inteligentes y scripts Foundry
│   ├── src/               # MinimalForwarder y DAOVoting
│   ├── test/              # Pruebas unitarias y de seguridad
│   └── script/            # DeployForwarderAndDAO.s.sol
├── web/                   # Frontend Next.js 15 + API del relayer + daemon
│   ├── app/               # App Router (UI y endpoint /api/relay)
│   ├── components/        # UI de propuestas, fondos y conexión
│   ├── contexts/          # Web3Context (MetaMask)
│   ├── hooks/             # useGaslessVote y helpers
│   └── scripts/           # execution-daemon.ts
├── scripts/start-dev.sh   # Script integral: anvil + despliegue + frontend
├── SECURITY_AUDIT.md      # Reporte de hallazgos y mitigaciones
└── README.md              # (este documento)
```

## 🏗️ Arquitectura

| Capa | Componentes | Descripción |
|------|-------------|-------------|
| **On-chain** | `MinimalForwarder.sol`, `DAOVoting.sol` | El forwarder verifica firmas EIP‑712, controla deadlines, gas y targets confiables. `DAOVoting` implementa voto no ponderado, periodo de seguridad y ejecución protegida. |
| **Frontend** | Next.js 15 (App Router), Tailwind CSS | UI para conectar MetaMask, fondear el DAO, crear propuestas y visualizar estados de votación. |
| **Meta-transacciones** | `useGaslessVote`, `lib/contracts/forwarder.ts`, API `POST /api/relay` | Construyen y firman el `ForwardRequest` (EIP‑712), delegan la ejecución al relayer y esperan confirmación en el provider del usuario. |
| **Automatización** | `scripts/execution-daemon.ts` | Servicio en Node que monitorea propuestas aprobadas y ejecuta `executeProposal` usando la cuenta del relayer. |
| **Orquestación local** | `scripts/start-dev.sh` | Levanta Anvil, despliega contratos con Foundry, sincroniza `.env.local` y arranca el frontend (opcionalmente el daemon). |

## 🔁 Flujos principales

1. **Depositar fondos (`fundDAO`)**  
   - MetaMask firma y envía un depósito directo.  
   - El contrato actualiza `userBalances` y `totalBalance`.

2. **Crear propuesta (`createProposal`)**  
   - Requiere poseer ≥10% del balance total.  
   - Se valida deadline, monto y fondos del contrato.  
   - Se emite `ProposalCreated`.

3. **Voto gasless (`vote`)**  
   - El usuario firma off-chain un `ForwardRequest`.  
   - El relayer ejecuta `MinimalForwarder.execute`, que verifica firma, gas y trusted forwarder antes de llamar a `DAOVoting.vote`.  
   - El frontend espera `provider.waitForTransaction` para mostrar el nuevo estado.

4. **Ejecución automática (`executeProposal`)**  
   - Tras el deadline + periodo de seguridad, el daemon identifica propuestas aprobadas, firma la transacción con la cuenta relayer y transfiere fondos al beneficiario.

## 🚀 Puesta en marcha

### Opción recomendada (todo en uno)

```bash
./scripts/start-dev.sh --with-daemon   # Levanta Anvil, despliega, configura .env y arranca front + daemon
```

Argumentos útiles:
- `--with-daemon`: inicia también el proceso de ejecución automática.
- `--keep-anvil`: reutiliza un nodo Anvil ya en ejecución.

### Pasos manuales

1. `anvil --host 127.0.0.1 --port 8545`
2. `cd sc && forge script script/DeployForwarderAndDAO.s.sol:DeployScript --rpc-url ... --broadcast`
3. Configurar `web/.env.local` con las direcciones generadas.
4. `cd web && npm install && npm run dev`

Consulta `web/TESTING.md` para el paso a paso completo (depositar, crear, votar y ejecutar).

## 🔒 Seguridad y pruebas

- `forge test` cubre escenarios de doble voto, deadlines, gas griefing y validación del forwarder.
- `SECURITY_AUDIT.md` documenta los hallazgos resueltos (por ejemplo, validaciones de gas, trusted forwarder, patrones CEI).
- El relayer y el daemon utilizan la cuenta definida en `RELAYER_PRIVATE_KEY`; mantén esa clave fuera del frontend (solo se expone el address público).

## 📚 Documentación complementaria

- `sc/README.md`: guía específica de despliegue y pruebas en Foundry.
- `web/README.md`: detalles del frontend, variables de entorno y estructura.
- `web/TESTING.md`: protocolo de pruebas end-to-end con MetaMask y Anvil.

Con esto tienes una visión de alto nivel y las rutas de referencia para profundizar en cada componente. ¡Feliz hacking! 💻🛠️


