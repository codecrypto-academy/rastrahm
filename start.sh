#!/bin/bash

# Script de inicio completo para la aplicación Superfluid
# Este script:
# 1. Verifica o inicia Anvil automáticamente
# 2. Crea/actualiza .env.local con valores de Anvil
# 3. Despliega los contratos
# 4. Extrae las direcciones de los contratos
# 5. Actualiza .env.local con las direcciones
# 6. Inicia el servidor de desarrollo
# 7. Abre la aplicación web en el navegador automáticamente
# 8. Detiene Anvil automáticamente al salir (si lo inició)

# No usar set -e porque queremos manejar errores manualmente
# y no detener Anvil si hay errores durante el despliegue
set +e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SC_DIR="$SCRIPT_DIR/sc"
WEB_DIR="$SCRIPT_DIR/web"
ENV_FILE="$WEB_DIR/.env.local"

# Valores de Anvil
ANVIL_RPC_URL="http://127.0.0.1:8545"
ANVIL_CHAIN_ID="31337"
ANVIL_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ANVIL_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Variables para control de Anvil
ANVIL_PID=""
ANVIL_STARTED_BY_SCRIPT="false"

# Alchemy API Key (opcional, para fork de mainnet)
# Puedes configurarlo como variable de entorno: export ALCHEMY_API_KEY=tu_key
ALCHEMY_API_KEY="${ALCHEMY_API_KEY:-}"

# Direcciones de Superfluid (mainnet, disponibles via fork)
SUPERFLUID_RESOLVER="0xeE4cD028f5fdaAdeA99f8fc38e8bA8A57c90Be53"
SUPERFLUID_HOST="0x4E583d9390082B65Bef884b629DFA426114CED6d"
SUPERFLUID_GOVERNANCE="0xe2E14e2C4518cB06c32Cd0818B4C01f53E1Ba653"
SUPERFLUID_CFA_V1="0x2844c1BBdA121E9E43105630b9C8310e5c72744b"
SUPERFLUID_CFA_V1_FORWARDER="0xcfA132E353cB4E398080B9700609bb008eceB125"
SUPERFLUID_IDA_V1="0xbCF9cfA8Da20B591790dF27DE65C1254Bf91563d"
SUPERFLUID_GDA_V1="0xAAdBB3Eee3Bd080f5353d86DdF1916aCA3fAC842"
SUPERFLUID_SUPER_TOKEN_FACTORY="0x0422689cc4087b6B7280e0a7e7F655200ec86Ae1"

# Funciones auxiliares
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que Anvil esté corriendo
check_anvil() {
    print_info "Verificando que Anvil esté corriendo..."
    
    if curl -s "$ANVIL_RPC_URL" > /dev/null 2>&1; then
        print_success "Anvil ya está corriendo"
        return 0
    fi
    
    return 1
}

# Iniciar Anvil en background
start_anvil() {
    print_info "Anvil no está corriendo. Iniciando Anvil..."
    
    # Verificar que anvil esté instalado
    if ! command -v anvil &> /dev/null; then
        print_error "anvil no está instalado. Instala Foundry primero:"
        print_info "curl -L https://foundry.paradigm.xyz | bash"
        print_info "foundryup"
        exit 1
    fi
    
    # Iniciar Anvil en background con fork de mainnet (si hay API key)
    # Si no hay API key, inicia sin fork (pero advertir que se necesita para EURx)
    if [ ! -z "$ALCHEMY_API_KEY" ]; then
        print_info "Iniciando Anvil con fork de mainnet..."
        anvil --fork-url "https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY" > /tmp/anvil.log 2>&1 &
    else
        print_info "Iniciando Anvil (sin fork de mainnet)..."
        print_warning "⚠️  IMPORTANTE: Se necesita fork de mainnet para desplegar EURx"
        print_warning "   Sin fork, solo se puede desplegar Euro, pero no EURx (Super Token)"
        print_info "   Para usar fork de mainnet, configura: export ALCHEMY_API_KEY=tu_key"
        anvil > /tmp/anvil.log 2>&1 &
    fi
    
    ANVIL_PID=$!
    print_success "Anvil iniciado (PID: $ANVIL_PID)"
    
    # Esperar a que Anvil esté listo
    print_info "Esperando a que Anvil esté listo..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$ANVIL_RPC_URL" > /dev/null 2>&1; then
            print_success "Anvil está listo"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    print_error "Anvil no respondió después de $max_attempts segundos"
    print_info "Revisa los logs en /tmp/anvil.log"
    exit 1
}

# Detener Anvil solo cuando el servidor se detenga (Ctrl+C)
cleanup_anvil() {
    if [ ! -z "$ANVIL_PID" ] && [ "$ANVIL_STARTED_BY_SCRIPT" = "true" ]; then
        print_info "Deteniendo Anvil (PID: $ANVIL_PID)..."
        kill $ANVIL_PID 2>/dev/null || true
        print_success "Anvil detenido"
    fi
}

# NO registrar cleanup aquí - se registrará solo cuando el servidor se inicie
# Esto evita que Anvil se detenga si hay errores durante el despliegue
# El trap se registrará justo antes de iniciar el servidor

# Crear/actualizar .env.local
create_env_file() {
    print_info "Creando/actualizando .env.local..."
    
    # Si el archivo existe, preservar las direcciones existentes
    EXISTING_EURO=""
    EXISTING_EUROX=""
    if [ -f "$ENV_FILE" ]; then
        EXISTING_EURO=$(grep "^NEXT_PUBLIC_EURO_ADDRESS=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ' || echo "")
        EXISTING_EUROX=$(grep "^NEXT_PUBLIC_EUROX_ADDRESS=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ' || echo "")
    fi
    
    cat > "$ENV_FILE" << EOF
# Configuración de Anvil
NEXT_PUBLIC_ANVIL_RPC_URL=$ANVIL_RPC_URL
NEXT_PUBLIC_CHAIN_ID=$ANVIL_CHAIN_ID

# Direcciones de contratos (se actualizarán después del despliegue)
NEXT_PUBLIC_EURO_ADDRESS=${EXISTING_EURO:-}
NEXT_PUBLIC_EUROX_ADDRESS=${EXISTING_EUROX:-}

# Configuración de Superfluid (mainnet, disponible via fork)
# Estas direcciones son constantes y no necesitan ser configuradas
# pero las incluimos para referencia:
# SUPERFLUID_RESOLVER=$SUPERFLUID_RESOLVER
# SUPERFLUID_HOST=$SUPERFLUID_HOST
# SUPERFLUID_CFA_V1=$SUPERFLUID_CFA_V1

# Límites de Flow Rate (opcional)
NEXT_PUBLIC_MIN_FLOW_RATE_MONTHLY=0.01
NEXT_PUBLIC_MAX_FLOW_RATE_MONTHLY=100000
NEXT_PUBLIC_RECOMMENDED_DEPOSIT_HOURS=8
EOF

    print_success ".env.local creado/actualizado"
}

# Desplegar contratos
deploy_contracts() {
    print_info "Desplegando contratos..."
    
    cd "$SC_DIR"
    
    # Verificar que forge esté disponible
    if ! command -v forge &> /dev/null; then
        print_error "forge no está instalado. Instala Foundry primero."
        exit 1
    fi
    
    # Desplegar contratos
    print_info "Ejecutando script de despliegue..."
    
    # Ejecutar despliegue y capturar output
    # Guardar output en archivo temporal para mejor parsing
    DEPLOY_OUTPUT_FILE="/tmp/deploy_output_$$.txt"
    DEPLOY_JSON_FILE="/tmp/deploy_json_$$.json"
    print_info "Guardando output del despliegue en: $DEPLOY_OUTPUT_FILE"
    
    # Ejecutar despliegue con output JSON para mejor parsing
    forge script script/DeployAll.s.sol:DeployAllScript \
        --rpc-url "$ANVIL_RPC_URL" \
        --private-key "$ANVIL_PRIVATE_KEY" \
        --broadcast \
        --json > "$DEPLOY_JSON_FILE" 2>&1
    
    DEPLOY_EXIT_CODE=$?
    
    # También ejecutar con -vvv para obtener el output legible
    forge script script/DeployAll.s.sol:DeployAllScript \
        --rpc-url "$ANVIL_RPC_URL" \
        --private-key "$ANVIL_PRIVATE_KEY" \
        --broadcast \
        -vvv > "$DEPLOY_OUTPUT_FILE" 2>&1
    
    DEPLOY_OUTPUT=$(cat "$DEPLOY_OUTPUT_FILE")
    
    if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
        print_error "Error durante el despliegue (código: $DEPLOY_EXIT_CODE)"
        
        # Verificar si el error es por falta de fork de mainnet
        if grep -q "call to non-contract address.*4E583d9390082B65Bef884b629DFA426114CED6d" "$DEPLOY_OUTPUT_FILE"; then
            print_error "❌ ERROR: Se necesita fork de mainnet para desplegar EURx"
            print_warning "El contrato Superfluid Host no está disponible sin fork de mainnet"
            print_info ""
            print_info "SOLUCIÓN:"
            print_info "1. Detén Anvil (Ctrl+C o kill $ANVIL_PID)"
            print_info "2. Configura tu API Key de Alchemy:"
            print_info "   export ALCHEMY_API_KEY=tu_api_key"
            print_info "3. Ejecuta el script nuevamente:"
            print_info "   ./start.sh"
            print_info ""
            print_warning "Anvil seguirá corriendo. Puedes detenerlo y reiniciar con fork."
        else
            print_warning "Anvil seguirá corriendo. Puedes intentar redesplegar manualmente."
            print_info "Output del despliegue:"
            tail -30 "$DEPLOY_OUTPUT_FILE"
        fi
        # No salir aquí, continuar para intentar extraer direcciones si es posible
    fi
    
    # Extraer direcciones de los contratos del output
    # El script imprime: "Euro token deployed at: 0x..." y "EURx Super Token created at: 0x..."
    print_info "Extrayendo direcciones de los contratos..."
    
    # Intentar primero desde el JSON (más confiable)
    if [ -f "$DEPLOY_JSON_FILE" ] && command -v jq &> /dev/null; then
        print_info "Intentando extraer direcciones del JSON..."
        # El JSON de forge puede tener la información de los contratos desplegados
        # Esto es un método alternativo si el output de texto no funciona
    fi
    
    # Método 1: Buscar líneas que contengan las palabras clave y extraer direcciones
    # Buscar "Euro token deployed at:" y extraer la dirección que sigue
    EURO_LINE=$(grep -i "Euro token deployed at:" "$DEPLOY_OUTPUT_FILE" | head -1 || echo "")
    if [ ! -z "$EURO_LINE" ]; then
        # Extraer dirección de la línea (puede estar en diferentes formatos)
        EURO_ADDRESS=$(echo "$EURO_LINE" | grep -oE '0x[a-fA-F0-9]{40}' | head -1 || echo "")
        if [ ! -z "$EURO_ADDRESS" ]; then
            print_success "Dirección Euro encontrada: $EURO_ADDRESS"
        fi
    fi
    
    # Buscar "EURx Super Token created at:" y extraer la dirección
    EUROX_LINE=$(grep -i "EURx Super Token created at:" "$DEPLOY_OUTPUT_FILE" | head -1 || echo "")
    if [ ! -z "$EUROX_LINE" ]; then
        EUROX_ADDRESS=$(echo "$EUROX_LINE" | grep -oE '0x[a-fA-F0-9]{40}' | head -1 || echo "")
        if [ ! -z "$EUROX_ADDRESS" ]; then
            print_success "Dirección EURx encontrada: $EUROX_ADDRESS"
        fi
    fi
    
    # Método 2: Buscar después de las líneas clave (contexto)
    if [ -z "$EURO_ADDRESS" ]; then
        EURO_ADDRESS=$(grep -A 3 -i "Euro token deployed" "$DEPLOY_OUTPUT_FILE" | grep -oE '0x[a-fA-F0-9]{40}' | head -1 || echo "")
        if [ ! -z "$EURO_ADDRESS" ]; then
            print_success "Dirección Euro encontrada (método 2): $EURO_ADDRESS"
        fi
    fi
    
    if [ -z "$EUROX_ADDRESS" ]; then
        EUROX_ADDRESS=$(grep -A 3 -i "EURx Super Token created" "$DEPLOY_OUTPUT_FILE" | grep -oE '0x[a-fA-F0-9]{40}' | head -1 || echo "")
        if [ ! -z "$EUROX_ADDRESS" ]; then
            print_success "Dirección EURx encontrada (método 2): $EUROX_ADDRESS"
        fi
    fi
    
    # Método 3: Buscar cualquier línea con "deployed at" o "created at" seguida de dirección
    if [ -z "$EURO_ADDRESS" ]; then
        EURO_ADDRESS=$(grep -i "deployed at" "$DEPLOY_OUTPUT_FILE" | grep -oE '0x[a-fA-F0-9]{40}' | head -1 || echo "")
        if [ ! -z "$EURO_ADDRESS" ]; then
            print_success "Dirección Euro encontrada (método 3): $EURO_ADDRESS"
        fi
    fi
    
    if [ -z "$EUROX_ADDRESS" ]; then
        # Buscar después de "created at" pero asegurarse de que sea EURx
        EUROX_ADDRESS=$(grep -i "created at" "$DEPLOY_OUTPUT_FILE" | grep -i "eurx\|super token" | grep -oE '0x[a-fA-F0-9]{40}' | head -1 || echo "")
        # Si aún no se encuentra, buscar la última dirección después de "created at"
        if [ -z "$EUROX_ADDRESS" ]; then
            EUROX_ADDRESS=$(grep -i "created at" "$DEPLOY_OUTPUT_FILE" | grep -oE '0x[a-fA-F0-9]{40}' | tail -1 || echo "")
        fi
        if [ ! -z "$EUROX_ADDRESS" ]; then
            print_success "Dirección EURx encontrada (método 3): $EUROX_ADDRESS"
        fi
    fi
    
    # Mostrar advertencias si no se encontraron
    if [ -z "$EURO_ADDRESS" ]; then
        print_warning "No se pudo encontrar la dirección de Euro en el output"
        print_info "Revisando últimas líneas del output:"
        grep -i "euro\|deployed" "$DEPLOY_OUTPUT_FILE" | tail -5 || true
    fi
    
    if [ -z "$EUROX_ADDRESS" ]; then
        print_warning "No se pudo encontrar la dirección de EURx en el output"
        print_info "Revisando últimas líneas del output:"
        grep -i "eurx\|created" "$DEPLOY_OUTPUT_FILE" | tail -5 || true
    fi
    
    # No limpiar los archivos temporales todavía - pueden ser útiles para debugging
    # Se limpiarán al final si todo está bien
    if [ ! -z "$EURO_ADDRESS" ] && [ ! -z "$EUROX_ADDRESS" ]; then
        # Si encontramos las direcciones, podemos limpiar los archivos
        rm -f "$DEPLOY_OUTPUT_FILE" "$DEPLOY_JSON_FILE"
    else
        print_info "Output del despliegue guardado en: $DEPLOY_OUTPUT_FILE (para debugging)"
        print_info "JSON del despliegue guardado en: $DEPLOY_JSON_FILE (para debugging)"
    fi
    
    # Verificar que se obtuvieron las direcciones
    if [ -z "$EURO_ADDRESS" ] || [ -z "$EUROX_ADDRESS" ]; then
        print_warning "No se pudieron extraer las direcciones del output del despliegue"
        print_info "Intentando obtener direcciones de los contratos desplegados anteriormente..."
        
        # Si los contratos ya estaban desplegados, intentar leerlos del .env.local existente
        if [ -f "$ENV_FILE" ]; then
            EXISTING_EURO=$(grep "^NEXT_PUBLIC_EURO_ADDRESS=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ' || echo "")
            EXISTING_EUROX=$(grep "^NEXT_PUBLIC_EUROX_ADDRESS=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ' || echo "")
            
            if [ ! -z "$EXISTING_EURO" ] && [ ! -z "$EXISTING_EUROX" ]; then
                print_info "Usando direcciones existentes de .env.local"
                EURO_ADDRESS="$EXISTING_EURO"
                EUROX_ADDRESS="$EXISTING_EUROX"
            fi
        fi
        
        if [ -z "$EURO_ADDRESS" ] || [ -z "$EUROX_ADDRESS" ]; then
            print_error "No se pudieron obtener las direcciones de los contratos"
            print_info "Revisa el output del despliegue manualmente:"
            print_info "  Archivo de output: $DEPLOY_OUTPUT_FILE"
            print_info ""
            print_info "Busca en el output las líneas que contengan:"
            print_info "  - 'Euro token deployed at:'"
            print_info "  - 'EURx Super Token created at:'"
            print_info ""
            print_info "Luego actualiza manualmente .env.local con:"
            print_info "  NEXT_PUBLIC_EURO_ADDRESS=<dirección_euro>"
            print_info "  NEXT_PUBLIC_EUROX_ADDRESS=<dirección_eurx>"
        fi
    fi
    
    if [ ! -z "$EURO_ADDRESS" ] && [ ! -z "$EUROX_ADDRESS" ]; then
        print_success "Contratos desplegados:"
        print_success "  Euro: $EURO_ADDRESS"
        print_success "  EURx: $EUROX_ADDRESS"
    fi
    
    cd "$SCRIPT_DIR"
    
    # Actualizar .env.local con las direcciones (aunque solo tengamos Euro)
    if [ ! -z "$EURO_ADDRESS" ]; then
        print_info "Actualizando .env.local con las direcciones de los contratos..."
        
        # Verificar que el archivo existe
        if [ ! -f "$ENV_FILE" ]; then
            print_warning ".env.local no existe, creándolo..."
            create_env_file
        fi
        
        # Actualizar las direcciones en .env.local usando sed (más simple y confiable)
        # Actualizar o agregar NEXT_PUBLIC_EURO_ADDRESS
        if grep -q "^NEXT_PUBLIC_EURO_ADDRESS=" "$ENV_FILE"; then
            # La línea existe, actualizarla
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|^NEXT_PUBLIC_EURO_ADDRESS=.*|NEXT_PUBLIC_EURO_ADDRESS=$EURO_ADDRESS|" "$ENV_FILE"
            else
                sed -i "s|^NEXT_PUBLIC_EURO_ADDRESS=.*|NEXT_PUBLIC_EURO_ADDRESS=$EURO_ADDRESS|" "$ENV_FILE"
            fi
        else
            # La línea no existe, agregarla después de NEXT_PUBLIC_CHAIN_ID
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "/^NEXT_PUBLIC_CHAIN_ID=/a\\
NEXT_PUBLIC_EURO_ADDRESS=$EURO_ADDRESS
" "$ENV_FILE"
            else
                sed -i "/^NEXT_PUBLIC_CHAIN_ID=/a NEXT_PUBLIC_EURO_ADDRESS=$EURO_ADDRESS" "$ENV_FILE"
            fi
        fi
        
        # Actualizar o agregar NEXT_PUBLIC_EUROX_ADDRESS
        if [ ! -z "$EUROX_ADDRESS" ]; then
            # Tenemos dirección de EURx, actualizarla
            if grep -q "^NEXT_PUBLIC_EUROX_ADDRESS=" "$ENV_FILE"; then
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|^NEXT_PUBLIC_EUROX_ADDRESS=.*|NEXT_PUBLIC_EUROX_ADDRESS=$EUROX_ADDRESS|" "$ENV_FILE"
                else
                    sed -i "s|^NEXT_PUBLIC_EUROX_ADDRESS=.*|NEXT_PUBLIC_EUROX_ADDRESS=$EUROX_ADDRESS|" "$ENV_FILE"
                fi
            else
                # Agregar después de NEXT_PUBLIC_EURO_ADDRESS
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "/^NEXT_PUBLIC_EURO_ADDRESS=/a\\
NEXT_PUBLIC_EUROX_ADDRESS=$EUROX_ADDRESS
" "$ENV_FILE"
                else
                    sed -i "/^NEXT_PUBLIC_EURO_ADDRESS=/a NEXT_PUBLIC_EUROX_ADDRESS=$EUROX_ADDRESS" "$ENV_FILE"
                fi
            fi
        else
            # No tenemos dirección de EURx, asegurarse de que la línea esté vacía
            if grep -q "^NEXT_PUBLIC_EUROX_ADDRESS=" "$ENV_FILE"; then
                # La línea existe, dejarla vacía
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|^NEXT_PUBLIC_EUROX_ADDRESS=.*|NEXT_PUBLIC_EUROX_ADDRESS=|" "$ENV_FILE"
                else
                    sed -i "s|^NEXT_PUBLIC_EUROX_ADDRESS=.*|NEXT_PUBLIC_EUROX_ADDRESS=|" "$ENV_FILE"
                fi
            else
                # Agregar línea vacía después de NEXT_PUBLIC_EURO_ADDRESS
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "/^NEXT_PUBLIC_EURO_ADDRESS=/a\\
NEXT_PUBLIC_EUROX_ADDRESS=
" "$ENV_FILE"
                else
                    sed -i "/^NEXT_PUBLIC_EURO_ADDRESS=/a NEXT_PUBLIC_EUROX_ADDRESS=" "$ENV_FILE"
                fi
            fi
        fi
        
        # Verificar que se actualizó correctamente
        UPDATED_EURO=$(grep "^NEXT_PUBLIC_EURO_ADDRESS=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ' || echo "")
        if [ "$UPDATED_EURO" = "$EURO_ADDRESS" ]; then
            print_success "✅ NEXT_PUBLIC_EURO_ADDRESS actualizado en .env.local: $EURO_ADDRESS"
        else
            print_warning "⚠️  No se pudo verificar la actualización de NEXT_PUBLIC_EURO_ADDRESS"
        fi
        
        if [ ! -z "$EUROX_ADDRESS" ]; then
            UPDATED_EUROX=$(grep "^NEXT_PUBLIC_EUROX_ADDRESS=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ' || echo "")
            if [ "$UPDATED_EUROX" = "$EUROX_ADDRESS" ]; then
                print_success "✅ NEXT_PUBLIC_EUROX_ADDRESS actualizado en .env.local: $EUROX_ADDRESS"
            else
                print_warning "⚠️  No se pudo verificar la actualización de NEXT_PUBLIC_EUROX_ADDRESS"
            fi
            print_success ".env.local actualizado con ambas direcciones"
        else
            print_warning "⚠️  NEXT_PUBLIC_EUROX_ADDRESS no se pudo actualizar (necesita fork de mainnet)"
            print_info "   La dirección de Euro está configurada, pero EURx requiere fork de mainnet"
            print_info ""
            print_info "Para desplegar EURx:"
            print_info "1. Detén Anvil (Ctrl+C o kill $ANVIL_PID)"
            print_info "2. Configura: export ALCHEMY_API_KEY=tu_api_key"
            print_info "3. Ejecuta: ./start.sh"
        fi
    else
        print_warning "No se pudo actualizar .env.local (no se encontró dirección de Euro)"
        print_info "Puedes actualizarlo manualmente después de revisar el output del despliegue"
    fi
}

# Verificar que los contratos estén desplegados
verify_contracts() {
    print_info "Verificando que los contratos estén desplegados..."
    
    if [ -z "$EURO_ADDRESS" ] || [ -z "$EUROX_ADDRESS" ]; then
        print_warning "No se pudieron verificar los contratos (direcciones no disponibles)"
        return
    fi
    
    # Verificar que los contratos tienen código
    EURO_CODE=$(cast code "$EURO_ADDRESS" --rpc-url "$ANVIL_RPC_URL" 2>/dev/null || echo "0x")
    EUROX_CODE=$(cast code "$EUROX_ADDRESS" --rpc-url "$ANVIL_RPC_URL" 2>/dev/null || echo "0x")
    
    if [ "$EURO_CODE" != "0x" ] && [ "$EUROX_CODE" != "0x" ]; then
        print_success "Contratos verificados correctamente"
    else
        print_warning "Algunos contratos no tienen código. Puede que necesites redesplegarlos."
    fi
}

# Abrir navegador automáticamente
open_browser() {
    local url="http://localhost:3000"
    local max_attempts=30
    local attempt=0
    
    print_info "Esperando a que el servidor esté listo..."
    
    # Esperar a que el servidor responda
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "Servidor listo!"
            
            # Abrir navegador según el sistema operativo
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                print_info "Abriendo navegador..."
                open "$url" 2>/dev/null || print_warning "No se pudo abrir el navegador automáticamente"
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                # Linux
                print_info "Abriendo navegador..."
                if command -v xdg-open &> /dev/null; then
                    xdg-open "$url" 2>/dev/null || print_warning "No se pudo abrir el navegador automáticamente"
                elif command -v gnome-open &> /dev/null; then
                    gnome-open "$url" 2>/dev/null || print_warning "No se pudo abrir el navegador automáticamente"
                else
                    print_warning "No se encontró comando para abrir navegador. Abre manualmente: $url"
                fi
            else
                print_info "Abre manualmente: $url"
            fi
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    print_warning "El servidor no respondió después de $max_attempts segundos"
    print_info "Abre manualmente: $url"
}

# Iniciar servidor de desarrollo
start_dev_server() {
    print_info "Iniciando servidor de desarrollo..."
    
    cd "$WEB_DIR"
    
    # Verificar que Node.js v22 esté disponible
    if command -v nvm &> /dev/null; then
        print_info "Usando Node.js v22 con nvm..."
        source ~/.nvm/nvm.sh 2>/dev/null || true
        nvm use v22 2>/dev/null || print_warning "No se pudo cambiar a Node.js v22. Asegúrate de tenerlo instalado."
    fi
    
    # Verificar que npm esté disponible
    if ! command -v npm &> /dev/null; then
        print_error "npm no está disponible"
        exit 1
    fi
    
    print_success "Servidor de desarrollo iniciado"
    print_info "La aplicación estará disponible en: http://localhost:3000"
    print_info "Presiona Ctrl+C para detener el servidor"
    echo ""
    
    # Abrir navegador después de un delay (en background)
    # Esto permite que el servidor se inicie mientras esperamos
    (sleep 5 && open_browser) &
    
    # Iniciar el servidor en foreground (para ver los logs)
    npm run dev
}

# Función principal
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║   Superfluid EUR Streaming - Script de Inicio           ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    # 1. Verificar o iniciar Anvil
    if ! check_anvil; then
        start_anvil
        ANVIL_STARTED_BY_SCRIPT="true"
    fi
    
    # 2. Crear .env.local
    create_env_file
    
    # 3. Desplegar contratos
    deploy_contracts
    
    # 4. Verificar contratos
    verify_contracts
    
    # 5. Iniciar servidor
    echo ""
    print_success "Configuración completada!"
    echo ""
    
    if [ "$ANVIL_STARTED_BY_SCRIPT" = "true" ]; then
        print_info "Anvil está corriendo en background (PID: $ANVIL_PID)"
        print_info "Para detener Anvil manualmente: kill $ANVIL_PID"
        print_info "Presiona Ctrl+C para detener el servidor y Anvil automáticamente"
        echo ""
        # Registrar cleanup solo ahora, cuando el servidor se va a iniciar
        # Esto asegura que Anvil solo se detenga cuando el servidor se detenga
        # y NO cuando hay errores durante el despliegue
        trap cleanup_anvil EXIT INT TERM
    fi
    
    start_dev_server
}

# Ejecutar función principal
main

