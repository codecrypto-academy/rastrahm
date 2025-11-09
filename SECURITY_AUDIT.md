# 🔒 Auditoría de Seguridad - DAO Voting System

**Fecha:** Análisis de seguridad de contratos  
**Contratos analizados:** `MinimalForwarder.sol` y `DAOVoting.sol`

---

## 📋 Resumen Ejecutivo

Se identificaron **8 problemas de seguridad** de diferentes severidades:
- **🔴 CRÍTICO:** 1
- **🟠 ALTO:** 2
- **🟡 MEDIO:** 3
- **🟢 BAJO:** 2

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **Falta de Deadline en MinimalForwarder** ⚠️ CRÍTICO

**Ubicación:** `MinimalForwarder.sol:73-93`

**Problema:**
El contrato `MinimalForwarder` no tiene un campo `deadline` en `ForwardRequest`, lo que permite que una firma sea válida indefinidamente. Una transacción firmada puede ser ejecutada en cualquier momento futuro, incluso si el usuario ya no quiere ejecutarla.

```solidity
struct ForwardRequest {
    address from;
    address to;
    uint256 value;
    uint256 gas;
    uint256 nonce;
    bytes data;
    // ❌ FALTA: uint256 deadline;
}
```

**Impacto:**
- Un usuario puede firmar una transacción y olvidarse de ella
- Un atacante puede interceptar una firma y ejecutarla meses después
- No hay forma de invalidar una firma firmada

**Recomendación:**
Agregar campo `deadline` y validar en `execute()`:
```solidity
if (block.timestamp > req.deadline) {
    revert ForwardRequestExpired();
}
```

**Referencia:** 
OpenZeppelin's ERC2771Forwarder incluye `deadline` por esta razón.

---

## 🟠 PROBLEMAS DE ALTA SEVERIDAD

### 2. **Falta de Validación de Gas en MinimalForwarder** ⚠️ ALTO

**Ubicación:** `MinimalForwarder.sol:82-84`

**Problema:**
El forwarder no valida que el gas especificado sea suficiente o razonable. Un relayer malicioso podría:
- Especificar muy poco gas para hacer que la transacción falle
- Especificar demasiado gas para hacer que el relayer pague más de lo necesario

```solidity
(bool success, bytes memory returndata) = req.to.call{value: req.value, gas: req.gas}(
    abi.encodePacked(req.data, req.from)
);
```

**Impacto:**
- Gas griefing: el relayer puede hacer que transacciones válidas fallen
- Ataques de DoS si el relayer especifica gas muy bajo
- Sobrecarga de gas si se especifica demasiado

**Recomendación:**
Agregar validación de gas mínimo/máximo y verificar que el gas restante sea suficiente después de la llamada:
```solidity
require(req.gas >= 21000, "MinimalForwarder: gas too low");
require(gasleft() >= req.gas, "MinimalForwarder: insufficient gas");
// Después de la llamada:
require(gasleft() > req.gas / 63, "MinimalForwarder: insufficient gas forwarded");
```

**Referencia:**
OpenZeppelin ERC2771Forwarder implementa `_checkForwardedGas()` para esto.

---

### 3. **Falta de Validación de Forwarder Trusted en MinimalForwarder** ⚠️ ALTO

**Ubicación:** `MinimalForwarder.sol:82-88`

**Problema:**
El contrato no valida que el contrato destino (`req.to`) confíe en este forwarder. Esto permite que un atacante use el forwarder para llamar a contratos que no confían en él, lo que podría causar comportamiento inesperado.

```solidity
(bool success, bytes memory returndata) = req.to.call{value: req.value, gas: req.gas}(
    abi.encodePacked(req.data, req.from)
);

// ❌ No valida si req.to confía en este forwarder
```

**Impacto:**
- Un usuario podría intentar usar el forwarder con contratos que no lo soportan
- El forwarder podría ejecutar llamadas a contratos que no esperan meta-transacciones
- Podría causar confusión en el `_msgSender()` del contrato destino

**Recomendación:**
Agregar validación antes de ejecutar:
```solidity
// Verificar que el contrato destino confía en este forwarder
if (req.to.code.length > 0) {
    (bool isTrusted, ) = req.to.staticcall(
        abi.encodeWithSelector(
            ERC2771Context.isTrustedForwarder.selector,
            address(this)
        )
    );
    require(isTrusted, "MinimalForwarder: target does not trust this forwarder");
}
```

---

## 🟡 PROBLEMAS DE SEVERIDAD MEDIA

### 4. **Prevención de Voto Duplicado** ✅ IMPLEMENTADO

**Ubicación:** `DAOVoting.sol:197-228`

**Problema Original:**
Un usuario podía votar el mismo tipo de voto múltiples veces.

**Solución Implementada:**
- ✅ Si el usuario intenta votar el mismo tipo de voto que ya votó, se lanza `AlreadyVoted`
- ✅ Si el usuario cambia su voto (ej: de A_FAVOR a EN_CONTRA), se resta el voto anterior y se suma el nuevo
- ✅ La lógica previene votos duplicados del mismo tipo pero permite cambiar el voto

**Código:**
```solidity
// Si el usuario ya votó con el mismo voto, no permitir votar de nuevo
if (userHasVoted && previousVote == voteType) {
    revert AlreadyVoted(proposalId, sender);
}

// Si el usuario ya votó con un voto diferente, restar su voto anterior
if (userHasVoted && previousVote != voteType) {
    // Restar voto anterior...
    // Agregar nuevo voto...
}
```

**Tests:**
- ✅ `test_Vote_CannotVoteSameTwice()` - Verifica que no se puede votar el mismo tipo dos veces
- ✅ `test_Vote_ChangeFromForToAgainst()` - Verifica cambio de A_FAVOR a EN_CONTRA
- ✅ `test_Vote_ChangeFromAgainstToAbstention()` - Verifica cambio de EN_CONTRA a ABSTENCION

---

### 5. **Falta de Límite en Deadline de Propuestas** ⚠️ MEDIO

**Ubicación:** `DAOVoting.sol:118-158`

**Problema:**
No hay un límite máximo en el `deadline` de una propuesta. Un usuario podría crear una propuesta con un deadline muy lejano (años en el futuro), bloqueando efectivamente fondos del DAO indefinidamente.

```solidity
if (deadline <= block.timestamp) {
    revert DeadlineInPast(deadline);
}
// ❌ No valida deadline máximo
```

**Impacto:**
- Propuestas pueden bloquear fondos por tiempo indefinido
- Podría ser usado como un ataque de DoS

**Recomendación:**
Agregar límite máximo:
```solidity
uint256 public constant MAX_DEADLINE_DURATION = 90 days; // Ejemplo
if (deadline > block.timestamp + MAX_DEADLINE_DURATION) {
    revert DeadlineTooFar(deadline);
}
```

---

### 6. **Falta de Validación de Recipient en Ejecución** ⚠️ MEDIO

**Ubicación:** `DAOVoting.sol:262-264`

**Problema:**
El contrato no valida que el `recipient` sea un contrato válido o una dirección que pueda recibir ETH antes de ejecutar la propuesta. Si el `recipient` es un contrato que no puede recibir ETH, la transferencia fallará y la propuesta quedará ejecutada pero sin transferir fondos.

```solidity
(bool success, ) = proposal.recipient.call{value: proposal.amount}("");
require(success, "DAOVoting: transfer failed");
```

**Impacto:**
- Si la transferencia falla, la propuesta se marca como ejecutada pero los fondos quedan bloqueados
- No hay forma de recuperar los fondos sin crear otra propuesta

**Recomendación:**
Validar antes de marcar como ejecutada, o usar un patrón pull payment:
```solidity
// Validar que la transferencia fue exitosa ANTES de marcar como ejecutada
(bool success, ) = proposal.recipient.call{value: proposal.amount}("");
require(success, "DAOVoting: transfer failed");

// Solo después de éxito, marcar como ejecutada
proposal.executed = true;
```

---

## 🟢 PROBLEMAS DE SEVERIDAD BAJA

### 7. **Falta de Evento de Error en MinimalForwarder** ⚠️ BAJO

**Ubicación:** `MinimalForwarder.sol:90`

**Problema:**
El evento `ForwardRequestExecuted` emite `success` pero no emite información sobre el error si la transacción falla. Esto hace difícil debuggear problemas en producción.

**Recomendación:**
Agregar más información al evento:
```solidity
event ForwardRequestExecuted(
    address indexed from,
    address indexed to,
    uint256 nonce,
    bool success,
    bytes returnData // Agregar returnData para debugging
);
```

---

### 8. **Posible Underflow en Cambio de Voto** ⚠️ BAJO (Ya mitigado)

**Ubicación:** `DAOVoting.sol:194-212`

**Problema:**
El código ya está protegido con `hasVoted`, pero inicialmente tenía un problema potencial donde si un usuario no había votado, el enum por defecto (0 = A_FAVOR) podría causar un underflow. **Ya está corregido** con el mapeo `hasVoted`.

**Estado:** ✅ **MITIGADO** - El código actual es seguro.

---

## ✅ ASPECTOS POSITIVOS DE SEGURIDAD

### Implementaciones Correctas:

1. ✅ **ReentrancyGuard** en `executeProposal()` - Previene ataques de reentrancy
2. ✅ **Nonces** en MinimalForwarder - Previene replay attacks
3. ✅ **Validación de firmas EIP-712** - Firma estructurada correcta
4. ✅ **ERC2771Context** - Implementación correcta de meta-transacciones
5. ✅ **Validación de estado** - Propuestas no ejecutadas, deadline pasado, etc.
6. ✅ **Safe Math** (Solidity 0.8+) - Overflow/underflow protegido automáticamente
7. ✅ **Mapeo hasVoted** - Previene problemas con votación múltiple

---

## 📊 Priorización de Correcciones

### ✅ CORRECCIONES IMPLEMENTADAS:

### Prioridad CRÍTICA ✅ COMPLETADO:
1. ✅ **Agregar `deadline` a `MinimalForwarder`** - IMPLEMENTADO
   - Campo `deadline` agregado a `ForwardRequest`
   - Validación en `verify()` y `execute()`
   - Error `ForwardRequestExpired` agregado

### Prioridad ALTA ✅ COMPLETADO:
2. ✅ **Validación de gas en `MinimalForwarder`** - IMPLEMENTADO
   - Validación de gas mínimo (MIN_GAS = 21000)
   - Validación de gas suficiente antes de ejecutar
   - Validación post-ejecución para prevenir gas griefing
   - Errores: `MinimalForwarderGasTooLow`, `MinimalForwarderInsufficientGas`

3. ✅ **Validación de forwarder trusted en `MinimalForwarder`** - IMPLEMENTADO
   - Verificación mediante `staticcall` a `isTrustedForwarder()`
   - Solo se ejecuta si el contrato destino confía en este forwarder
   - Error: `MinimalForwarderUntrustfulTarget`

### Prioridad MEDIA ✅ COMPLETADO:
4. ✅ **Límite máximo en deadline de propuestas** - IMPLEMENTADO
   - Constante `MAX_DEADLINE_DURATION = 90 days`
   - Validación en `createProposal()`
   - Error: `DeadlineTooFar`

5. ✅ **Mejorar validación de recipient en ejecución** - IMPLEMENTADO
   - Validación de recipient antes de transferir
   - Transferencia ANTES de marcar como ejecutada (patrón Checks-Effects-Interactions)
   - Previene que propuestas queden marcadas como ejecutadas si la transferencia falla

### Prioridad BAJA ✅ COMPLETADO:
6. ✅ **Mejorar eventos para debugging** - IMPLEMENTADO
   - Evento `ForwardRequestExecuted` ahora incluye `returnData`
   - Mejor información para debugging en producción

---

## 🔗 Referencias

- [OpenZeppelin ERC2771Forwarder](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/metatx/ERC2771Forwarder.sol)
- [EIP-2771 Standard](https://eips.ethereum.org/EIPS/eip-2771)
- [OpenZeppelin Security Best Practices](https://docs.openzeppelin.com/contracts/security)

---

**Nota:** Este análisis es una auditoría inicial. Se recomienda una auditoría profesional completa antes del despliegue en producción.

