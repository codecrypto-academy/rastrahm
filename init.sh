#!/usr/bin/env bash
set -euo pipefail

# Script de inicialización en Anvil para el proyecto Escrow
# - Despliega Escrow.sol
# - Despliega dos MockERC20 (Token A y Token B)
# - Agrega los tokens al contrato Escrow
# - Guarda las direcciones en deployment-info.txt

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SC_DIR="$ROOT_DIR/sc"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
# Clave privada de la cuenta 0 de Anvil: debe venir por variable de entorno PRIVATE_KEY
if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "[ERROR] PRIVATE_KEY no está definido. Exporta la clave privada de una cuenta de Anvil:" >&2
  echo "  export PRIVATE_KEY=<clave_privada_de_anvil>" >&2
  exit 1
fi

# Direcciones de las primeras cuentas de Anvil (por si luego las usamos para mint)
ACCOUNT0="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ACCOUNT1="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
ACCOUNT2="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

cd "$SC_DIR"

if ! command -v forge &>/dev/null; then
  echo "[ERROR] forge no está instalado (Foundry)" >&2
  exit 1
fi

if ! command -v cast &>/dev/null; then
  echo "[ERROR] cast no está instalado (Foundry)" >&2
  exit 1
fi

# Comprobar que Anvil está arriba
if ! cast block-number --rpc-url "$RPC_URL" &>/dev/null; then
  echo "[ERROR] No se puede conectar a Anvil en $RPC_URL" >&2
  echo "Asegúrate de ejecutar: anvil" >&2
  exit 1
fi

echo "[INFO] Compilando contratos..."
forge build

echo "[INFO] Desplegando Escrow..."
ESCROW_ADDR=$(forge create src/Escrow.sol:Escrow \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  | awk '/Deployed to:/ {print $3}')

echo "[INFO] Desplegando MockERC20 Token A..."
TOKEN_A_ADDR=$(forge create src/MockERC20.sol:MockERC20 \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args "Token A" "TKA" \
  | awk '/Deployed to:/ {print $3}')

echo "[INFO] Desplegando MockERC20 Token B..."
TOKEN_B_ADDR=$(forge create src/MockERC20.sol:MockERC20 \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args "Token B" "TKB" \
  | awk '/Deployed to:/ {print $3}')

echo "[INFO] Agregando tokens al Escrow..."
cast send "$ESCROW_ADDR" "addToken(address)" "$TOKEN_A_ADDR" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"

cast send "$ESCROW_ADDR" "addToken(address)" "$TOKEN_B_ADDR" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"

# (Opcional) Aquí podríamos mintear tokens adicionales a las cuentas de Anvil
# usando la función mint de MockERC20 si hace falta para la app web.

cat > "$ROOT_DIR/deployment-info.txt" << INFO
RPC_URL=$RPC_URL
ESCROW_ADDRESS=$ESCROW_ADDR
TOKEN_A_ADDRESS=$TOKEN_A_ADDR
TOKEN_B_ADDRESS=$TOKEN_B_ADDR
ACCOUNT0=$ACCOUNT0
ACCOUNT1=$ACCOUNT1
ACCOUNT2=$ACCOUNT2
INFO

echo "[OK] Despliegue completado"
echo "Escrow:    $ESCROW_ADDR"
echo "Token A:   $TOKEN_A_ADDR"
echo "Token B:   $TOKEN_B_ADDR"
echo "Info guardada en deployment-info.txt"

