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

# Clave privada de la cuenta 0 de Anvil (por defecto)
# Puedes sobrescribirla con: export PRIVATE_KEY=<tu_clave_privada>
# Clave privada por defecto de Anvil para la cuenta 0 (64 caracteres hex)
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

# Limpiar espacios en blanco y validar formato de la clave privada
PRIVATE_KEY_CLEAN=$(echo "$PRIVATE_KEY" | tr -d '[:space:]' | tr -d '\n' | tr -d '\r')

# Validar que la clave privada tenga el formato correcto (0x seguido de 64 caracteres hex = 32 bytes)
if [[ ! "$PRIVATE_KEY_CLEAN" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  echo "[ERROR] Formato de clave privada inválido: $PRIVATE_KEY_CLEAN" >&2
  echo "[ERROR] Debe ser: 0x seguido de exactamente 64 caracteres hexadecimales (32 bytes)" >&2
  exit 1
fi

echo "[INFO] Usando clave privada de la cuenta 0 de Anvil (por defecto)"
echo "[INFO] Para usar otra cuenta, exporta PRIVATE_KEY antes de ejecutar el script"

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

# Verificar si Anvil está corriendo en el puerto 8545
if ! lsof -i :8545 &>/dev/null; then
  echo "[INFO] Anvil no está corriendo en el puerto 8545. Iniciando Anvil..."
  if ! command -v anvil &>/dev/null; then
    echo "[ERROR] anvil no está instalado (Foundry)" >&2
    exit 1
  fi
  
  # Iniciar Anvil en segundo plano
  anvil > /tmp/anvil.log 2>&1 &
  ANVIL_PID=$!
  echo "[INFO] Anvil iniciado con PID: $ANVIL_PID"
  
  # Esperar a que Anvil esté listo (máximo 10 segundos)
  echo "[INFO] Esperando a que Anvil esté listo..."
  for i in {1..20}; do
    if cast block-number --rpc-url "$RPC_URL" &>/dev/null; then
      echo "[INFO] Anvil está listo"
      break
    fi
    if [ $i -eq 20 ]; then
      echo "[ERROR] Anvil no respondió después de 10 segundos" >&2
      kill $ANVIL_PID 2>/dev/null || true
      exit 1
    fi
    sleep 0.5
  done
else
  echo "[INFO] Anvil ya está corriendo en el puerto 8545"
fi

# Verificar que podemos conectar a Anvil
if ! cast block-number --rpc-url "$RPC_URL" &>/dev/null; then
  echo "[ERROR] No se puede conectar a Anvil en $RPC_URL" >&2
  exit 1
fi

echo "[INFO] Compilando contratos..."
cd "$SC_DIR"
forge build
cd "$ROOT_DIR"

echo "[INFO] Desplegando contratos (Escrow + MockERC20) con forge script..."
DEPLOY_OUTPUT=$(cd "$SC_DIR" && forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY_CLEAN" \
  -vvv 2>&1)

ESCROW_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "ESCROW_ADDRESS" | awk '{print $2}' | tail -1)
TOKEN_A_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "TOKEN_A_ADDRESS" | awk '{print $2}' | tail -1)
TOKEN_B_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "TOKEN_B_ADDRESS" | awk '{print $2}' | tail -1)
SWAP_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "SIMPLE_SWAP_ADDRESS" | awk '{print $2}' | tail -1)

if [[ -z "$ESCROW_ADDR" || -z "$TOKEN_A_ADDR" || -z "$TOKEN_B_ADDR" || -z "$SWAP_ADDR" ]]; then
  echo "[ERROR] No se pudieron extraer las direcciones de los contratos desplegados" >&2
  echo "[DEBUG] Salida del despliegue con forge script:" >&2
  echo "$DEPLOY_OUTPUT" | grep -E "(ESCROW_ADDRESS|TOKEN_A_ADDRESS|TOKEN_B_ADDRESS|SIMPLE_SWAP_ADDRESS|Error|failed)" | tail -20 >&2
  exit 1
fi

echo "[INFO] Escrow desplegado en: $ESCROW_ADDR"
echo "[INFO] Token A desplegado en: $TOKEN_A_ADDR"
echo "[INFO] Token B desplegado en: $TOKEN_B_ADDR"
echo "[INFO] SimpleSwap desplegado en: $SWAP_ADDR"

# Mintear tokens a las cuentas de prueba para que tengan saldo
echo "[INFO] Transfiriendo tokens a las cuentas de prueba..."

# Cantidad de tokens a transferir (1,000,000 tokens con 18 decimales)
AMOUNT="1000000000000000000000000"  # 1,000,000 * 10^18

# Transferir Token A a Account 1 y Account 2
echo "[INFO] Transfiriendo Token A a Account 1 ($ACCOUNT1)..."
cast send "$TOKEN_A_ADDR" "mint(address,uint256)" "$ACCOUNT1" "$AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY_CLEAN" \
  --legacy > /dev/null 2>&1 || echo "[WARN] Error al transferir Token A a Account 1"

echo "[INFO] Transfiriendo Token A a Account 2 ($ACCOUNT2)..."
cast send "$TOKEN_A_ADDR" "mint(address,uint256)" "$ACCOUNT2" "$AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY_CLEAN" \
  --legacy > /dev/null 2>&1 || echo "[WARN] Error al transferir Token A a Account 2"

# Transferir Token B a Account 1 y Account 2
echo "[INFO] Transfiriendo Token B a Account 1 ($ACCOUNT1)..."
cast send "$TOKEN_B_ADDR" "mint(address,uint256)" "$ACCOUNT1" "$AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY_CLEAN" \
  --legacy > /dev/null 2>&1 || echo "[WARN] Error al transferir Token B a Account 1"

echo "[INFO] Transfiriendo Token B a Account 2 ($ACCOUNT2)..."
cast send "$TOKEN_B_ADDR" "mint(address,uint256)" "$ACCOUNT2" "$AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY_CLEAN" \
  --legacy > /dev/null 2>&1 || echo "[WARN] Error al transferir Token B a Account 2"

echo "[OK] Tokens transferidos a las cuentas de prueba"

cat > "$ROOT_DIR/deployment-info.txt" << INFO
RPC_URL=$RPC_URL
ESCROW_ADDRESS=$ESCROW_ADDR
TOKEN_A_ADDRESS=$TOKEN_A_ADDR
TOKEN_B_ADDRESS=$TOKEN_B_ADDR
SIMPLE_SWAP_ADDRESS=$SWAP_ADDR
ACCOUNT0=$ACCOUNT0
ACCOUNT1=$ACCOUNT1
ACCOUNT2=$ACCOUNT2
INFO

WEB_DIR="$ROOT_DIR/web"

# Generar .env.local dentro de web/ para que Next.js pueda leer las direcciones
mkdir -p "$WEB_DIR"
cat > "$WEB_DIR/.env.local" << ENVVARS
NEXT_PUBLIC_ESCROW_ADDRESS=$ESCROW_ADDR
NEXT_PUBLIC_TOKEN_A_ADDRESS=$TOKEN_A_ADDR
NEXT_PUBLIC_TOKEN_B_ADDRESS=$TOKEN_B_ADDR
NEXT_PUBLIC_SIMPLE_SWAP_ADDRESS=$SWAP_ADDR
NEXT_PUBLIC_RPC_URL=$RPC_URL
ENVVARS

echo "[OK] Despliegue completado"
echo "Escrow:    $ESCROW_ADDR"
echo "Token A:   $TOKEN_A_ADDR"
echo "Token B:   $TOKEN_B_ADDR"
echo "Info guardada en deployment-info.txt y web/.env.local"
echo ""

# Limpiar y ejecutar Next.js
echo "[INFO] Limpiando cache y compilación de Next.js..."
cd "$WEB_DIR"
rm -rf .next
rm -rf node_modules/.cache

echo "[INFO] Iniciando servidor de desarrollo de Next.js..."
echo "[INFO] La aplicación estará disponible en http://localhost:3000"
echo "[INFO] Presiona Ctrl+C para detener el servidor"
echo ""

npm run dev

