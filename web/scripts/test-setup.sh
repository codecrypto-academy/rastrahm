#!/bin/bash

# Script para configurar el entorno de prueba
# Este script ayuda a configurar las variables de entorno necesarias

echo "=== Configuración del entorno de prueba ==="
echo ""

# Verificar si Anvil está corriendo
if ! curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo "⚠️  Anvil no está corriendo en http://127.0.0.1:8545"
    echo "   Ejecuta: cd sc && anvil"
    echo ""
fi

# Verificar si los contratos están desplegados
if [ -z "$NEXT_PUBLIC_DAO_ADDRESS" ] || [ -z "$NEXT_PUBLIC_FORWARDER_ADDRESS" ]; then
    echo "⚠️  Variables de entorno no configuradas"
    echo "   Necesitas desplegar los contratos primero:"
    echo "   cd sc && forge script script/DeployForwarderAndDAO.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast"
    echo ""
fi

echo "Variables de entorno necesarias:"
echo "  NEXT_PUBLIC_DAO_ADDRESS=<dirección del contrato DAO>"
echo "  NEXT_PUBLIC_FORWARDER_ADDRESS=<dirección del contrato MinimalForwarder>"
echo "  NEXT_PUBLIC_CHAIN_ID=31337"
echo "  RPC_URL=http://127.0.0.1:8545"
echo "  RELAYER_PRIVATE_KEY=<clave privada del relayer (debe tener ETH)>"
echo "  RELAYER_ADDRESS=<dirección del relayer>"
echo ""
echo "Ejemplo de .env.local:"
echo "  NEXT_PUBLIC_DAO_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "  NEXT_PUBLIC_FORWARDER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
echo "  NEXT_PUBLIC_CHAIN_ID=31337"
echo "  RPC_URL=http://127.0.0.1:8545"
echo "  RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "  RELAYER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo ""

