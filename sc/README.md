# DAO Voting – Contratos (Foundry)

Este paquete contiene los contratos inteligentes y scripts de despliegue asociados al sistema de votación DAO con soporte para meta-transacciones (EIP‑2771).

## 📦 Contenido

- `src/MinimalForwarder.sol`: implementación endurecida del forwarder EIP‑2771 (verificaciones de deadline, gas mínimo, target confiable, etc.).
- `src/DAOVoting.sol`: contrato principal del DAO con lógica “una persona, un voto”, periodo de seguridad y ejecución protegida.
- `test/*.t.sol`: pruebas unitarias en Foundry que cubren creación de propuestas, votación, meta-transacciones y regresiones de seguridad.
- `script/DeployForwarderAndDAO.s.sol`: script que despliega ambos contratos y los vincula.

## ✅ Prerrequisitos

- [Foundry](https://book.getfoundry.sh/) instalado (`forge`, `cast`, `anvil`).
- RPC disponible (Anvil local o red externa).
- Una clave privada con fondos en la red destino cuando se despliegue fuera de Anvil.

## 🧪 Ejecutar pruebas

```bash
cd sc
forge test
```

Las pruebas usan `vm.expectRevert` con errores personalizados y validan:

- Deadlines y nonces en el `MinimalForwarder`.
- Cambios de voto, impedimento de votos duplicados y ejecución segura en `DAOVoting`.
- Prevención de targets no confiables y ataques de gas griefing.

## 🚀 Despliegue en Anvil

```bash
# 1. Levantar Anvil (en otra terminal)
anvil --host 127.0.0.1 --port 8545

# 2. Ejecutar el script de despliegue
cd sc
forge script script/DeployForwarderAndDAO.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

El script imprime las direcciones del `MinimalForwarder` y `DAOVoting`. Estos valores se consumen automáticamente por `scripts/start-dev.sh`, pero puedes copiarlos manualmente para configurar el frontend (`NEXT_PUBLIC_FORWARDER_ADDRESS`, `NEXT_PUBLIC_DAO_ADDRESS`).

## 🌐 Despliegue en testnet (ej. Sepolia)

```bash
export PRIVATE_KEY=0x...        # clave con fondos suficientes
export RPC_URL=https://sepolia.infura.io/v3/<TU_KEY>

cd sc
forge script script/DeployForwarderAndDAO.s.sol:DeployScript \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --verify \
  --etherscan-api-key <API_KEY_OPCIONAL>
```

- Usa `--verify` para publicar el código en Etherscan (requiere API Key).
- Ajusta los parámetros de gas según la red destino.

## 🔐 Características de seguridad

- `MinimalForwarder` valida deadline, gas mínimo, gas restante (> 1/63), trusted forwarder y nonces.
- `DAOVoting` impide votos ponderados, evita doble voto, controla deadlines y usa patrón Checks-Effects-Interactions.
- Se incluye un informe en `SECURITY_AUDIT.md` con los hallazgos abordados.

## 📤 Artefactos y remappings

- `out/`: ABIs y metadatos generados por `forge build`.
- `broadcast/`: registros de despliegues anteriores por red.
- `remappings.txt`: remapeos usados por Foundry; se generan automáticamente con `forge remappings > remappings.txt` si añades librerías nuevas.

## 🔄 Integración con el frontend

- El script `../scripts/start-dev.sh` ejecuta automáticamente este despliegue, captura las direcciones generadas y actualiza `web/.env.local`.
- El frontend espera que el contrato `DAOVoting` confíe en el `MinimalForwarder` que se despliega aquí; no olvides mantenerlos sincronizados cuando despliegues en nuevas redes.

