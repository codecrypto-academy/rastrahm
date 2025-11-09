#!/usr/bin/env bash

set -euo pipefail

# --- Configuración básica ----------------------------------------------------

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
SC_DIR="$PROJECT_ROOT/sc"
WEB_DIR="$PROJECT_ROOT/web"
LOG_DIR="$PROJECT_ROOT/.logs"
ANVIL_LOG="$LOG_DIR/anvil.log"
NEXT_LOG="$LOG_DIR/next.log"
DAEMON_LOG="$LOG_DIR/daemon.log"

RPC_URL="http://127.0.0.1:8545"
CHAIN_ID="31337"
FORWARDER_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
FORWARDER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

WITH_DAEMON=false
KEEP_ANVIL=false
DAEMON_INTERVAL_MS_DEFAULT="1500"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-daemon)
      WITH_DAEMON=true
      shift
      ;;
    --keep-anvil)
      KEEP_ANVIL=true
      shift
      ;;
    -h|--help)
      cat <<EOF
Uso: $(basename "$0") [opciones]

Opciones:
  --with-daemon   Arranca también el daemon de ejecución automática.
  --keep-anvil    No detiene anvil al salir (útil si ya estaba corriendo).
  -h, --help      Muestra esta ayuda.
EOF
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      exit 1
      ;;
  esac
done

DAEMON_INTERVAL_MS="${DAEMON_INTERVAL_MS:-$DAEMON_INTERVAL_MS_DEFAULT}"

mkdir -p "$LOG_DIR"

ANVIL_PID=""
NEXT_PID=""
DAEMON_PID=""

cleanup() {
  local exit_code=$?

  if [[ -n "$NEXT_PID" ]] && kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "[setup] Deteniendo Next.js (PID $NEXT_PID)..."
    kill "$NEXT_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$DAEMON_PID" ]] && kill -0 "$DAEMON_PID" 2>/dev/null; then
    echo "[setup] Deteniendo daemon (PID $DAEMON_PID)..."
    kill "$DAEMON_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$ANVIL_PID" ]] && kill -0 "$ANVIL_PID" 2>/dev/null && [[ $KEEP_ANVIL == false ]]; then
    echo "[setup] Deteniendo anvil (PID $ANVIL_PID)..."
    kill "$ANVIL_PID" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 1' INT TERM

ensure_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[error] Comando requerido no encontrado: $1" >&2
    exit 1
  fi
}

# --- Dependencias ------------------------------------------------------------

ensure_command curl
ensure_command jq
ensure_command forge
ensure_command anvil
ensure_command npm

NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
  nvm use v22 >/dev/null
else
  echo "[error] NVM no encontrado. Instálalo o define la versión de Node manualmente." >&2
  exit 1
fi

# --- Funciones ---------------------------------------------------------------

start_anvil() {
  if pgrep -f "anvil --host" >/dev/null 2>&1; then
    echo "[setup] Anvil ya se encuentra en ejecución. Usando instancia existente."
    KEEP_ANVIL=true
    return
  fi

  echo "[setup] Iniciando anvil..."
  (cd "$SC_DIR" && anvil --host 127.0.0.1 --port 8545 >"$ANVIL_LOG" 2>&1) &
  ANVIL_PID=$!

  echo "[setup] Esperando a que anvil responda..."
  until curl -s -o /dev/null -X POST "$RPC_URL" \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'; do
    sleep 1
  done

  echo "[setup] Anvil listo (PID $ANVIL_PID). Logs en $ANVIL_LOG"
}

deploy_contracts() {
  echo "[setup] Desplegando contratos con Foundry..."
  (cd "$SC_DIR" && PRIVATE_KEY="$FORWARDER_KEY" \
    forge script script/DeployForwarderAndDAO.s.sol:DeployForwarderAndDAO \
      --rpc-url "$RPC_URL" \
      --broadcast \
      --private-key "$FORWARDER_KEY" \
      --slow \
      >"$LOG_DIR/deploy.log" 2>&1)

  echo "[setup] Contratos desplegados. Logs en $LOG_DIR/deploy.log"
}

extract_addresses() {
  local broadcast_dir="$SC_DIR/broadcast/DeployForwarderAndDAO.s.sol/$CHAIN_ID"
  local run_file="$broadcast_dir/run-latest.json"

  if [[ ! -f "$run_file" ]]; then
    echo "[error] No se encontró run-latest.json en $broadcast_dir" >&2
    exit 1
  fi

  FORWARDER_ADDR=$(jq -r '.transactions[] | select(.contractName == "MinimalForwarder") | .contractAddress' "$run_file" | tail -n 1)
  DAO_ADDR=$(jq -r '.transactions[] | select(.contractName == "DAOVoting") | .contractAddress' "$run_file" | tail -n 1)

  if [[ -z "$FORWARDER_ADDR" || -z "$DAO_ADDR" || "$FORWARDER_ADDR" == "null" || "$DAO_ADDR" == "null" ]]; then
    echo "[error] No se pudieron extraer las direcciones de los contratos." >&2
    exit 1
  fi

  echo "[setup] MinimalForwarder: $FORWARDER_ADDR"
  echo "[setup] DAOVoting:        $DAO_ADDR"
}

write_env_file() {
  local env_file="$WEB_DIR/.env.local"

  cat >"$env_file" <<EOF
NEXT_PUBLIC_DAO_ADDRESS=$DAO_ADDR
NEXT_PUBLIC_FORWARDER_ADDRESS=$FORWARDER_ADDR
NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID
RPC_URL=$RPC_URL
RELAYER_PRIVATE_KEY=$FORWARDER_KEY
RELAYER_ADDRESS=$FORWARDER_ADDRESS
DAEMON_INTERVAL_MS=$DAEMON_INTERVAL_MS
EOF

  echo "[setup] Archivo .env.local actualizado en $env_file"
}

install_front_dependencies() {
  echo "[setup] Instalando dependencias del frontend..."
  (cd "$WEB_DIR" && npm install >/dev/null)
  echo "[setup] Dependencias instaladas."
}

start_next() {
  echo "[setup] Iniciando Next.js (npm run dev)..."
  (cd "$WEB_DIR" && npm run dev >"$NEXT_LOG" 2>&1) &
  NEXT_PID=$!
  echo "[setup] Next.js ejecutándose (PID $NEXT_PID). Logs en $NEXT_LOG"
}

start_daemon() {
  echo "[setup] Iniciando daemon de ejecución (npm run daemon)..."
  (cd "$WEB_DIR" && npm run daemon >"$DAEMON_LOG" 2>&1) &
  DAEMON_PID=$!
  echo "[setup] Daemon ejecutándose (PID $DAEMON_PID). Logs en $DAEMON_LOG"
}

print_summary() {
  cat <<EOF

==========================================================
✅ Todo listo
----------------------------------------------------------
- Anvil RPC:                $RPC_URL
- MinimalForwarder:         $FORWARDER_ADDR
- DAOVoting:                $DAO_ADDR
- .env.local:               $WEB_DIR/.env.local
- Logs anvil:               $ANVIL_LOG
- Logs Next.js:             $NEXT_LOG
- Logs daemon:              ${WITH_DAEMON:+$DAEMON_LOG}
==========================================================

Presiona Ctrl+C para detener los procesos (salvo que uses --keep-anvil).
EOF
}

# --- Ejecución ---------------------------------------------------------------

start_anvil
deploy_contracts
extract_addresses
write_env_file
install_front_dependencies
start_next

if [[ $WITH_DAEMON == true ]]; then
  start_daemon
fi

print_summary

wait "$NEXT_PID"


