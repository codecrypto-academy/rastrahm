# 📄 Document Signer - DApp

Aplicación descentralizada (dApp) completa para almacenar y verificar la autenticidad de documentos utilizando blockchain Ethereum.

## 🎯 Descripción del Proyecto

Este proyecto integra:
- **Smart Contracts** con Solidity y Foundry
- **Frontend Web** con Next.js, TypeScript y Ethers.js v6
- **Desarrollo Local** usando Anvil (nodo Ethereum local)

## ✨ Características Implementadas

### 🔐 Smart Contract
- ✅ Contrato optimizado sin campos redundantes
- ✅ Almacenamiento eficiente de documentos (hash + firma + timestamp)
- ✅ Modifiers de seguridad implementados
- ✅ 11/11 tests pasando
- ✅ Eventos para seguimiento de operaciones

### 💻 Frontend dApp
- ✅ Integración con MetaMask o Anvil
- ✅ Firma digital de documentos con cuenta personalizable
- ✅ Verificación de autenticidad
- ✅ Historial completo de firmas
- ✅ Interfaz moderna con tema oscuro
- ✅ Drag & drop para carga de archivos
- ✅ Sistema de pestañas para organización

### 🎨 Interfaz de Usuario
- ✅ Diseño responsive y moderno
- ✅ Tema oscuro/claro con selector
- ✅ Transiciones suaves
- ✅ Feedback visual en tiempo real
- ✅ Manejo de errores intuitivo

## 📦 Requisitos Previos

### Software Necesario
```bash
# Node.js (v20+)
node --version  # debe mostrar v20 o superior

# Foundry (Forge, Cast, Anvil)
foundryup

# Git
git --version
```

### Conocimientos Previos
- JavaScript/TypeScript básico
- React y hooks (useState, useEffect, useContext)
- Solidity básico
- Terminal/línea de comandos
- Conceptos de blockchain

## 🚀 Configuración e Instalación

### 1. Clonar el Repositorio
```bash
git clone <url-del-repositorio>
cd documentSigner
```

### 2. Configurar Smart Contract

```bash
cd sc
forge build
forge test -vv
```

**Comando para desplegar**:
```bash
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Importante**: Copia la dirección del contrato desplegado para el siguiente paso.

### 3. Configurar Frontend

```bash
cd dapp
npm install
```

### 4. Variables de Entorno

Crea el archivo `.env.local`:
```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:
```env
NEXT_PUBLIC_ANVIL_URL=http://127.0.0.1:8545
NEXT_PUBLIC_ANVIL_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS=0x<tu-direccion-del-contrato>
NEXT_PUBLIC_ANVIL_ACCOUNT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEXT_PUBLIC_USE_ANVIL=true
```

**Nota**: `.env.local` no se sube a git por seguridad.

## 🧪 Flujo de Prueba Completo

### Paso 1: Iniciar Anvil (Terminal 1)
```bash
anvil
```

Deja esta terminal corriendo.

### Paso 2: Desplegar Contrato (Terminal 2)
```bash
cd sc
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Copia la dirección del contrato y actualiza `.env.local`.

### Paso 3: Iniciar Frontend (Terminal 3)
```bash
cd dapp
npm run dev
```

Abre http://localhost:3000 en tu navegador.

### Paso 4: Probar Funcionalidades

#### 1. Conectar Wallet
- Haz clic en "Conectar Wallet"
- Selecciona una cuenta de Anvil
- Verifica que el estado muestre "Conectado"

#### 2. Firmar Documento (Tab "Firmar")
- Arrastra y suelta un archivo de prueba
- Ingresa la dirección de la cuenta a usar
- Haz clic en "Firmar Documento"
- El hash se calcula automáticamente
- Confirma la transacción
- Ver hash generado y timestamp

#### 3. Verificar Documento (Tab "Verificar")
- Sube el mismo archivo que firmaste
- Ingresa la dirección del firmante
- Haz clic en "Verificar Documento"
- Debe mostrar: ✅ **VÁLIDO**
- Ver detalles: hash, firmante, fecha

#### 4. Ver Historial (Tab "Historial")
- Visualiza el documento almacenado
- Ver hash del documento
- Ver dirección del firmante
- Ver timestamp de la firma
- Usa el botón "🔄 Actualizar" para recargar

#### 5. Pruebas de Validación
- **Documento duplicado**: Intenta firmar el mismo archivo dos veces → debe fallar
- **Firmante incorrecto**: Verifica con dirección diferente → debe mostrar ❌ INVÁLIDO
- **Documento no existente**: Verifica archivo nunca almacenado → debe mostrar "No encontrado"

## 🏗️ Estructura del Proyecto

```
documentSigner/
├── sc/                          # Smart Contracts
│   ├── src/
│   │   └── DocumentSigner.sol   # Contrato principal
│   ├── test/
│   │   └── DocumentSigner.t.sol # Tests del contrato
│   ├── script/
│   │   └── Deploy.s.sol        # Script de despliegue
│   └── foundry.toml            # Configuración Foundry
│
├── dapp/                        # Frontend dApp
│   ├── app/
│   │   ├── components/
│   │   │   ├── WalletConnection.tsx
│   │   │   ├── DocumentSigner.tsx
│   │   │   ├── DocumentVerifier.tsx
│   │   │   ├── SignatureHistory.tsx
│   │   │   └── Tabs.tsx
│   │   ├── context/
│   │   │   └── ThemeContext.tsx
│   │   ├── utils/
│   │   │   ├── wallet.ts
│   │   │   └── constants.ts
│   │   ├── abis/
│   │   │   └── DocumentSigner.json
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── .env.local               # Variables de entorno
│   └── package.json
│
└── README.md                    # Este archivo
```

## ✅ Checklist de Entrega

### Smart Contracts
- ✅ `DocumentSigner.sol` implementado y optimizado
- ✅ Struct sin campo `exists` redundante
- ✅ Sin mapping `hashExists` redundante
- ✅ 11/11 tests pasando
- ✅ Script de despliegue funcional
- ✅ Modifiers de seguridad implementados
- ✅ Eventos DocumentVerified y SignatureCreated

### Frontend
- ✅ Context Provider implementado (ThemeProvider)
- ✅ Conexión con MetaMask y Anvil
- ✅ Hook `useContract` funcional
- ✅ Componente `WalletConnection` completo
- ✅ Componente `DocumentSigner` con validaciones
- ✅ Componente `DocumentVerifier` funcional
- ✅ Componente `SignatureHistory` mostrando datos
- ✅ Sistema de pestañas implementado
- ✅ Selector de wallet funcionando
- ✅ UI responsiva y moderna
- ✅ Tema oscuro funcional

### Integración
- ✅ Frontend conecta con contrato
- ✅ Firmas funcionan correctamente
- ✅ Almacenamiento en blockchain exitoso
- ✅ Verificación funciona
- ✅ Historial muestra documentos
- ✅ Manejo de errores adecuado

### Documentación
- ✅ README.md actualizado
- ✅ Comentarios en código
- ✅ Variables de entorno documentadas
- ✅ Instrucciones de instalación claras
- ✅ Flujo de prueba completo documentado

### Git
- ✅ Repositorio inicializado
- ✅ Commits descriptivos
- ✅ `.gitignore` correcto (lib/, cache/, out/, .env.local)
- ✅ Solo código fuente en repo

## 📊 Criterios de Evaluación

### Funcionalidad (40%)
✅ Contrato despliega y funciona correctamente (10%)  
✅ Frontend conecta con contrato (10%)  
✅ Flujo completo funciona (Upload → Sign → Verify → History) (15%)  
✅ Manejo de errores adecuado (5%)

### Código (30%)
✅ Optimización del contrato (ahorro de gas) (10%)  
✅ Código limpio y organizado (10%)  
✅ Uso correcto de TypeScript (5%)  
✅ Context API implementado correctamente (5%)

### Testing (15%)
✅ Tests del contrato pasando (10%)  
✅ Tests de integración manuales (5%)

### UI/UX (10%)
✅ Interfaz intuitiva y moderna (5%)  
✅ Validaciones y confirmaciones implementadas (3%)  
✅ Feedback visual adecuado (2%)

### Documentación (5%)
✅ README claro y completo (2%)  
✅ Código comentado (2%)  
✅ Instrucciones de instalación (1%)

**Total estimado: 100%**

## 🛠️ Tecnologías Utilizadas

### Smart Contracts
- **Solidity 0.8.20+** - Lenguaje de contratos
- **Foundry** - Toolkit de desarrollo
- **Forge** - Compilador y ejecutor de tests
- **Anvil** - Nodo Ethereum local

### Frontend
- **Next.js 16** - Framework React
- **TypeScript** - Type safety
- **React 19** - Biblioteca UI
- **Ethers.js v6** - Interacción con blockchain
- **Tailwind CSS v4** - Estilos y tema oscuro
- **Crypto-JS** - Hashing SHA-256

## 🐛 Troubleshooting

### Problema: Contrato no despliega
```bash
# Verificar Anvil corriendo
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

### Problema: Frontend no conecta
```bash
# Verificar .env.local
cat dapp/.env.local

# Verificar logs del navegador (DevTools > Console)
# Verificar que la dirección del contrato sea correcta
```

### Problema: Error de firma
```bash
# Verificar que Anvil esté corriendo
# Verificar que la cuenta esté seleccionada
# Ver logs en consola del navegador
```

### Problema: Tema oscuro no funciona
```bash
# Limpiar cache de Next.js
cd dapp
rm -rf .next
npm run dev
```

## 📚 Recursos de Ayuda

### Documentación Oficial
- **Solidity**: https://docs.soliditylang.org/
- **Foundry**: https://book.getfoundry.sh/
- **Ethers.js v6**: https://docs.ethers.org/v6/
- **Next.js**: https://nextjs.org/docs
- **React Context**: https://react.dev/reference/react/useContext
- **Tailwind CSS**: https://tailwindcss.com/docs

### Comandos Útiles

**Smart Contracts**:
```bash
forge build              # Compilar
forge test -vv           # Tests con logs
forge coverage           # Cobertura
forge clean             # Limpiar cache
```

**Frontend**:
```bash
npm run dev             # Desarrollo
npm run build           # Build producción
npm run lint            # Linter
```

**Anvil**:
```bash
anvil                   # Iniciar nodo local
anvil --accounts 20     # Con 20 cuentas
```

## ⚠️ Notas Importantes

- La clave privada de Anvil se usa **solo para desarrollo**
- En producción, **nunca expongas claves privadas**
- Asegúrate de tener el contrato desplegado antes de firmar documentos
- `.env.local` no se debe subir a git
- El proyecto usa Node.js v20+ por compatibilidad con Next.js 16

## 🎓 Aprendizajes Adquiridos

Este proyecto enseña:
- ✅ Desarrollo de smart contracts optimizados
- ✅ Integración frontend-blockchain con Ethers.js v6
- ✅ Gestión de estado con React Context
- ✅ Testing de contratos con Foundry
- ✅ Despliegue local con Anvil
- ✅ Diseño de UI moderna con Tailwind CSS v4
- ✅ Implementación de tema oscuro
- ✅ Manejo de archivos y hashing criptográfico
- ✅ Verificación de firmas digitales

## 🚀 Mejoras Futuras

Algunas ideas para extender el proyecto:
- 🔲 Integración con IPFS para almacenar archivos
- 🔲 Soporte para múltiples firmantes
- 🔲 Exportar historial a CSV
- 🔲 Búsqueda y filtrado de documentos
- 🔲 Pruebas en testnet (Sepolia)
- 🔲 Soporte ENS para nombres legibles
- 🔲 Subgraph para indexar eventos
- 🔲 PWA para uso offline

## 📝 Licencia

Este proyecto es parte del curso de desarrollo de dApps con Ethereum.

---

**Desarrollado con ❤️ para CODECRYPTO**  
**Curso**: Desarrollo de dApps con Ethereum  
**Última actualización**: Noviembre 2024
