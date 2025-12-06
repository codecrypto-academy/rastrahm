#!/bin/bash

# Script para listar las cuentas de Anvil y sus balances

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Verificar que Anvil esté corriendo
if ! curl -s "$RPC_URL" > /dev/null 2>&1; then
  echo "[ERROR] No se puede conectar a Anvil en $RPC_URL"
  echo "Asegúrate de que Anvil esté corriendo: anvil"
  exit 1
fi

# Claves privadas de las 10 cuentas predefinidas de Anvil
PRIVATE_KEYS=(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f873d9b39c62298f08e04"
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
)

echo "=== Cuentas de Anvil ==="
echo "RPC: $RPC_URL"
echo ""

for i in "${!PRIVATE_KEYS[@]}"; do
  PRIVATE_KEY="${PRIVATE_KEYS[$i]}"
  ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null)
  
  if [ -n "$ADDRESS" ]; then
    BALANCE=$(cast balance "$ADDRESS" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
    BALANCE_ETH=$(cast --to-unit "$BALANCE" ether 2>/dev/null || echo "0")
    
    printf "Cuenta %d:\n" $((i+1))
    printf "  Dirección: %s\n" "$ADDRESS"
    printf "  Balance:   %s ETH\n" "$BALANCE_ETH"
    printf "  Clave:     %s\n" "$PRIVATE_KEY"
    echo ""
  fi
done

echo "=== Uso en MetaMask ==="
echo "1. Abre MetaMask"
echo "2. Ve a Configuración > Redes > Agregar red"
echo "3. Agrega una red personalizada:"
echo "   - Nombre: Anvil Local"
echo "   - RPC URL: $RPC_URL"
echo "   - Chain ID: 31337"
echo "   - Símbolo: ETH"
echo "4. Importa una cuenta usando una de las claves privadas de arriba"
echo ""

