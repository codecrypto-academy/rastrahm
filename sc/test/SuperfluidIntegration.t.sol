// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Euro.sol";

// Interfaces Superfluid
interface ISuperfluid {
    function getSuperTokenFactory() external view returns (ISuperTokenFactory);
}

interface ISuperTokenFactory {
    function createERC20Wrapper(
        address underlyingToken,
        uint8 underlyingDecimals,
        uint8 upgradability,
        string calldata name,
        string calldata symbol
    ) external returns (address);
}

interface ISuperToken {
    function upgrade(uint256 amount) external;
    function downgrade(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function getUnderlyingToken() external view returns (address);
    function realtimeBalanceOf(
        address account,
        uint256 timestamp
    ) external view returns (
        int256 availableBalance,
        uint256 deposit,
        uint256 owedDeposit
    );
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IConstantFlowAgreementV1 {
    function createFlow(
        address token,
        address receiver,
        int96 flowRate,
        bytes calldata ctx
    ) external returns (bytes memory newCtx);
    
    function deleteFlow(
        address token,
        address sender,
        address receiver,
        bytes calldata ctx
    ) external returns (bytes memory newCtx);
    
    function getFlow(
        address token,
        address sender,
        address receiver
    ) external view returns (
        uint256 timestamp,
        int96 flowRate,
        uint256 deposit,
        uint256 owedDeposit
    );
    
    function getNetFlow(
        address token,
        address account
    ) external view returns (int96 flowRate);
}

/**
 * @title SuperfluidIntegrationTest
 * @dev Tests de integración con Superfluid para validar:
 *      - Creación de Super Token wrapper
 *      - Upgrade EUR → EURx
 *      - Downgrade EURx → EUR
 *      - Creación de flows
 *      - Eliminación de flows
 *      - Balances en tiempo real
 * 
 * @notice Estos tests requieren fork de mainnet para acceder a Superfluid
 *         Ejecutar con: forge test --fork-url <RPC_URL> --match-path test/SuperfluidIntegration.t.sol
 */
contract SuperfluidIntegrationTest is Test {
    // Superfluid addresses en mainnet
    address constant SUPERFLUID_HOST = 0x4E583d9390082B65Bef884b629DFA426114CED6d;
    address constant CFA_V1 = 0x2844c1BBdA121E9E43105630b9C8310e5c72744b;
    
    // Contratos desplegados
    Euro public euro;
    address public euroX; // Super Token EURx
    
    // Cuentas de prueba
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public deployer;
    
    // Cantidades de prueba
    uint256 constant INITIAL_SUPPLY = 10_000_000 * 10**18; // 10 millones EUR
    uint256 constant UPGRADE_AMOUNT = 5_000 * 10**18; // 5000 EUR
    uint256 constant FLOW_RATE = 771604938271604; // 2000 EUR/mes en wei/segundo
    
    // Interfaces Superfluid
    ISuperfluid public host;
    ISuperTokenFactory public factory;
    ISuperToken public euroXToken;
    IConstantFlowAgreementV1 public cfa;
    
    function setUp() public {
        // Si hay fork URL configurado, usar fork de mainnet
        // De lo contrario, los tests fallarán (se puede usar Anvil con fork)
        string memory rpcUrl = vm.envOr("MAINNET_RPC_URL", string(""));
        
        if (bytes(rpcUrl).length > 0) {
            vm.createSelectFork(rpcUrl);
        } else {
            // Para tests locales, asumimos que Anvil está corriendo con fork
            // y los contratos ya están desplegados
            // En este caso, necesitamos desplegar todo desde cero
        }
        
        deployer = address(this);
        
        // Obtener instancias de Superfluid
        host = ISuperfluid(SUPERFLUID_HOST);
        factory = host.getSuperTokenFactory();
        cfa = IConstantFlowAgreementV1(CFA_V1);
        
        // Desplegar Euro token
        euro = new Euro();
        
        // Mint tokens iniciales a alice
        euro.mint(alice, INITIAL_SUPPLY);
        
        // Crear Super Token wrapper EURx
        euroX = factory.createERC20Wrapper(
            address(euro),
            18, // decimals
            1,  // SEMI_UPGRADABLE
            "Super Euro",
            "EURx"
        );
        
        euroXToken = ISuperToken(euroX);
        
        // Verificar que el wrapper se creó correctamente
        assertEq(euroXToken.getUnderlyingToken(), address(euro));
        
        console.log("Euro deployed at:", address(euro));
        console.log("EURx SuperToken created at:", euroX);
    }
    
    // ============ Tests de Upgrade/Downgrade ============
    
    function testUpgradeEURToEURx() public {
        // Alice aprueba EURx para usar sus EUR
        vm.prank(alice);
        euro.approve(euroX, UPGRADE_AMOUNT);
        
        uint256 aliceEURBefore = euro.balanceOf(alice);
        uint256 aliceEURxBefore = euroXToken.balanceOf(alice);
        
        // Alice hace upgrade
        vm.prank(alice);
        euroXToken.upgrade(UPGRADE_AMOUNT);
        
        // Verificar balances
        assertEq(euro.balanceOf(alice), aliceEURBefore - UPGRADE_AMOUNT, "EUR balance should decrease");
        assertEq(euroXToken.balanceOf(alice), aliceEURxBefore + UPGRADE_AMOUNT, "EURx balance should increase");
        
        console.log("Upgrade successful:");
        console.log("  EUR balance:", euro.balanceOf(alice) / 10**18);
        console.log("  EURx balance:", euroXToken.balanceOf(alice) / 10**18);
    }
    
    function testDowngradeEURxToEUR() public {
        // Primero hacer upgrade
        vm.prank(alice);
        euro.approve(euroX, UPGRADE_AMOUNT);
        vm.prank(alice);
        euroXToken.upgrade(UPGRADE_AMOUNT);
        
        uint256 downgradeAmount = UPGRADE_AMOUNT / 2; // Downgrade la mitad
        uint256 aliceEURBefore = euro.balanceOf(alice);
        uint256 aliceEURxBefore = euroXToken.balanceOf(alice);
        
        // Alice hace downgrade
        vm.prank(alice);
        euroXToken.downgrade(downgradeAmount);
        
        // Verificar balances
        assertEq(euro.balanceOf(alice), aliceEURBefore + downgradeAmount, "EUR balance should increase");
        assertEq(euroXToken.balanceOf(alice), aliceEURxBefore - downgradeAmount, "EURx balance should decrease");
        
        console.log("Downgrade successful:");
        console.log("  EUR balance:", euro.balanceOf(alice) / 10**18);
        console.log("  EURx balance:", euroXToken.balanceOf(alice) / 10**18);
    }
    
    function testUpgradeRequiresApproval() public {
        // Intentar upgrade sin aprobación (debe fallar)
        vm.prank(alice);
        vm.expectRevert();
        euroXToken.upgrade(UPGRADE_AMOUNT);
    }
    
    // ============ Tests de Flows ============
    
    function testCreateFlow() public {
        // Setup: Alice hace upgrade de suficiente EURx
        uint256 upgradeAmount = 10_000 * 10**18; // 10k EUR para tener suficiente para el depósito
        vm.prank(alice);
        euro.approve(euroX, upgradeAmount);
        vm.prank(alice);
        euroXToken.upgrade(upgradeAmount);
        
        // Verificar que no hay flow antes
        (uint256 timestamp, int96 flowRate, , ) = cfa.getFlow(euroX, alice, bob);
        assertEq(flowRate, 0, "Flow rate should be 0 before creation");
        
        // Alice aprueba CFA para crear flows
        vm.prank(alice);
        euroXToken.approve(CFA_V1, type(uint256).max);
        
        // Crear flow de alice a bob
        // forge-lint: disable-next-line(unsafe-typecast)
        // Casting es seguro porque FLOW_RATE (771604938271604) cabe en int96
        int96 flowRateInt96 = int96(uint96(FLOW_RATE));
        vm.prank(alice);
        cfa.createFlow(euroX, bob, flowRateInt96, "");
        
        // Verificar que el flow se creó
        (timestamp, flowRate, , ) = cfa.getFlow(euroX, alice, bob);
        assertEq(uint256(uint96(flowRate)), FLOW_RATE, "Flow rate should match");
        assertGt(timestamp, 0, "Timestamp should be set");
        
        console.log("Flow created successfully:");
        console.log("  Flow rate:", uint256(uint96(flowRate)));
        console.log("  Timestamp:", timestamp);
    }
    
    function testDeleteFlow() public {
        // Setup: Crear flow primero
        uint256 upgradeAmount = 10_000 * 10**18;
        vm.prank(alice);
        euro.approve(euroX, upgradeAmount);
        vm.prank(alice);
        euroXToken.upgrade(upgradeAmount);
        vm.prank(alice);
        euroXToken.approve(CFA_V1, type(uint256).max);
        
        int96 flowRateInt96 = int96(uint96(FLOW_RATE));
        vm.prank(alice);
        cfa.createFlow(euroX, bob, flowRateInt96, "");
        
        // Verificar que el flow existe
        (, int96 flowRateBefore, , ) = cfa.getFlow(euroX, alice, bob);
        assertGt(uint256(uint96(flowRateBefore)), 0, "Flow should exist");
        
        // Eliminar flow
        vm.prank(alice);
        cfa.deleteFlow(euroX, alice, bob, "");
        
        // Verificar que el flow fue eliminado
        (, int96 flowRateAfter, , ) = cfa.getFlow(euroX, alice, bob);
        assertEq(flowRateAfter, 0, "Flow rate should be 0 after deletion");
        
        console.log("Flow deleted successfully");
    }
    
    function testFlowRequiresSufficientBalance() public {
        // Intentar crear flow sin suficiente balance (debe fallar)
        // Alice no tiene EURx
        vm.prank(alice);
        euroXToken.approve(CFA_V1, type(uint256).max);
        
        int96 flowRateInt96 = int96(uint96(FLOW_RATE));
        vm.prank(alice);
        
        // Esto debería fallar porque no hay suficiente balance para el depósito
        vm.expectRevert();
        cfa.createFlow(euroX, bob, flowRateInt96, "");
    }
    
    // ============ Tests de Balance en Tiempo Real ============
    
    function testRealtimeBalanceIncreasesWithFlow() public {
        // Setup: Crear flow
        uint256 upgradeAmount = 10_000 * 10**18;
        vm.prank(alice);
        euro.approve(euroX, upgradeAmount);
        vm.prank(alice);
        euroXToken.upgrade(upgradeAmount);
        vm.prank(alice);
        euroXToken.approve(CFA_V1, type(uint256).max);
        
        int96 flowRateInt96 = int96(uint96(FLOW_RATE));
        vm.prank(alice);
        cfa.createFlow(euroX, bob, flowRateInt96, "");
        
        // Obtener balance inicial de bob
        uint256 bobBalanceBefore = euroXToken.balanceOf(bob);
        (int256 availableBalanceBefore, , ) = euroXToken.realtimeBalanceOf(bob, block.timestamp);
        
        // Avanzar tiempo (simular 1 hora = 3600 segundos)
        vm.warp(block.timestamp + 3600);
        
        // Obtener balance después
        uint256 bobBalanceAfter = euroXToken.balanceOf(bob);
        (int256 availableBalanceAfter, , ) = euroXToken.realtimeBalanceOf(bob, block.timestamp);
        
        // El balance en tiempo real debería haber aumentado
        assertGt(availableBalanceAfter, availableBalanceBefore, "Realtime balance should increase");
        
        // Calcular cuánto debería haber aumentado
        uint256 expectedIncrease = FLOW_RATE * 3600;
        uint256 actualIncrease = uint256(availableBalanceAfter - availableBalanceBefore);
        
        // Permitir pequeña diferencia por redondeo
        assertApproxEqRel(
            actualIncrease,
            expectedIncrease,
            0.01e18, // 1% de tolerancia
            "Balance increase should match flow rate * time"
        );
        
        console.log("Realtime balance test:");
        console.log("  Balance before:", uint256(availableBalanceBefore));
        console.log("  Balance after:", uint256(availableBalanceAfter));
        console.log("  Expected increase:", expectedIncrease);
        console.log("  Actual increase:", actualIncrease);
    }
    
    // ============ Tests de Múltiples Flows ============
    
    function testMultipleFlows() public {
        address charlie = address(0x3);
        
        // Setup: Alice hace upgrade
        uint256 upgradeAmount = 20_000 * 10**18;
        vm.prank(alice);
        euro.approve(euroX, upgradeAmount);
        vm.prank(alice);
        euroXToken.upgrade(upgradeAmount);
        vm.prank(alice);
        euroXToken.approve(CFA_V1, type(uint256).max);
        
        int96 flowRateInt96 = int96(uint96(FLOW_RATE));
        
        // Crear flow a bob
        vm.prank(alice);
        cfa.createFlow(euroX, bob, flowRateInt96, "");
        
        // Crear flow a charlie
        vm.prank(alice);
        cfa.createFlow(euroX, charlie, flowRateInt96, "");
        
        // Verificar ambos flows
        (, int96 flowRateBob, , ) = cfa.getFlow(euroX, alice, bob);
        (, int96 flowRateCharlie, , ) = cfa.getFlow(euroX, alice, charlie);
        
        assertEq(uint256(uint96(flowRateBob)), FLOW_RATE, "Flow to bob should exist");
        assertEq(uint256(uint96(flowRateCharlie)), FLOW_RATE, "Flow to charlie should exist");
        
        // Verificar net flow de alice (debería ser negativo, saliendo)
        int96 netFlow = cfa.getNetFlow(euroX, alice);
        assertLt(netFlow, 0, "Net flow should be negative (outgoing)");
        assertEq(uint256(uint96(-netFlow)), FLOW_RATE * 2, "Net flow should be sum of all flows");
        
        console.log("Multiple flows test:");
        console.log("  Flow to bob:", uint256(uint96(flowRateBob)));
        console.log("  Flow to charlie:", uint256(uint96(flowRateCharlie)));
        console.log("  Net flow from alice:", uint256(uint96(-netFlow)));
    }
    
    // ============ Tests de Edge Cases ============
    
    function testCannotCreateFlowToSelf() public {
        // Setup
        uint256 upgradeAmount = 10_000 * 10**18;
        vm.prank(alice);
        euro.approve(euroX, upgradeAmount);
        vm.prank(alice);
        euroXToken.upgrade(upgradeAmount);
        vm.prank(alice);
        euroXToken.approve(CFA_V1, type(uint256).max);
        
        int96 flowRateInt96 = int96(uint96(FLOW_RATE));
        
        // Intentar crear flow a sí mismo (debería fallar)
        vm.prank(alice);
        vm.expectRevert();
        cfa.createFlow(euroX, alice, flowRateInt96, "");
    }
    
    function testFlowRateZero() public {
        // Crear flow con rate 0 debería eliminar cualquier flow existente
        // o no hacer nada si no existe
        
        uint256 upgradeAmount = 10_000 * 10**18;
        vm.prank(alice);
        euro.approve(euroX, upgradeAmount);
        vm.prank(alice);
        euroXToken.upgrade(upgradeAmount);
        vm.prank(alice);
        euroXToken.approve(CFA_V1, type(uint256).max);
        
        // Crear flow normal primero
        int96 flowRateInt96 = int96(uint96(FLOW_RATE));
        vm.prank(alice);
        cfa.createFlow(euroX, bob, flowRateInt96, "");
        
        // Crear flow con rate 0 (debería eliminar el flow)
        vm.prank(alice);
        cfa.createFlow(euroX, bob, 0, "");
        
        // Verificar que el flow fue eliminado
        (, int96 flowRate, , ) = cfa.getFlow(euroX, alice, bob);
        assertEq(flowRate, 0, "Flow should be deleted when rate is 0");
    }
}

