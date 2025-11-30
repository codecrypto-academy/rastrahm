// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {EuroToken} from "../src/EuroToken.sol";

/**
 * @title EuroTokenTest
 * @dev Suite de tests para el contrato EuroToken
 * @notice Testa las funcionalidades principales: deploy, mint, transferencias y control de acceso
 */
contract EuroTokenTest is Test {
    EuroToken public euroToken;
    
    // Direcciones de prueba
    address public owner;
    address public user1;
    address public user2;
    address public nonOwner;

    // Eventos esperados
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @dev Función setUp que se ejecuta antes de cada test
     * @notice Configura el entorno de pruebas con direcciones y despliega el contrato
     */
    function setUp() public {
        // Crear direcciones de prueba
        owner = address(this); // El contrato de test será el owner
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        nonOwner = makeAddr("nonOwner");

        // Desplegar el contrato EuroToken con el owner
        euroToken = new EuroToken(owner);

        // Log inicial para debugging
        console.log("EuroToken deployed at:", address(euroToken));
        console.log("Owner address:", owner);
    }

    // ============ TESTS DE DEPLOY ============

    /**
     * @dev Test 1: Verificar que el contrato se despliega correctamente
     * @notice Debe verificar:
     *   - El contrato existe
     *   - El owner es correcto
     *   - El nombre y símbolo son correctos
     *   - Los decimales son 6
     *   - El balance inicial es 0
     */
    function test_Deploy() public {
        // Verificar que el contrato existe
        assertTrue(address(euroToken) != address(0), "Contract should be deployed");

        // Verificar que el owner es correcto
        assertEq(euroToken.owner(), owner, "Owner should be set correctly");

        // Verificar nombre y símbolo
        assertEq(euroToken.name(), "EuroToken", "Name should be EuroToken");
        assertEq(euroToken.symbol(), "EURT", "Symbol should be EURT");

        // Verificar decimales
        assertEq(euroToken.decimals(), 6, "Decimals should be 6");

        // Verificar balance inicial (debe ser 0)
        assertEq(euroToken.balanceOf(owner), 0, "Initial balance should be 0");

        console.log("[PASS] Deploy test passed");
    }

    // ============ TESTS DE MINT POR OWNER ============

    /**
     * @dev Test 2: Verificar que el owner puede hacer mint
     * @notice Debe:
     *   - Permitir al owner crear tokens
     *   - Actualizar el balance correctamente
     *   - Emitir el evento TokensMinted
     */
    function test_MintByOwner() public {
        // Cantidad a crear: 100 EURT (100 * 10^6 = 100000000 en unidades base)
        uint256 amount = 100 * 10**6; // 100 EURT con 6 decimales

        // Hacer mint como owner
        vm.expectEmit(true, false, false, true);
        emit TokensMinted(user1, amount);

        euroToken.mint(user1, amount);

        // Verificar que el balance se actualizó correctamente
        assertEq(euroToken.balanceOf(user1), amount, "User1 balance should be 100 EURT");

        // Verificar que el total supply aumentó
        assertEq(euroToken.totalSupply(), amount, "Total supply should be 100 EURT");

        console.log("[PASS] Mint by owner test passed");
        console.log("User1 balance:", euroToken.balanceOf(user1));
        console.log("Total supply:", euroToken.totalSupply());
    }

    /**
     * @dev Test 3: Verificar múltiples mints
     * @notice Debe permitir múltiples operaciones de mint
     */
    function test_MintMultipleTimes() public {
        uint256 amount1 = 50 * 10**6; // 50 EURT
        uint256 amount2 = 75 * 10**6; // 75 EURT

        // Primer mint
        euroToken.mint(user1, amount1);
        assertEq(euroToken.balanceOf(user1), amount1, "First mint failed");

        // Segundo mint
        euroToken.mint(user1, amount2);
        assertEq(euroToken.balanceOf(user1), amount1 + amount2, "Second mint failed");

        // Verificar total supply
        assertEq(euroToken.totalSupply(), amount1 + amount2, "Total supply incorrect");

        console.log("[PASS] Multiple mints test passed");
    }

    /**
     * @dev Test 4: Verificar mint a diferentes usuarios
     * @notice Debe permitir crear tokens para diferentes direcciones
     */
    function test_MintToDifferentUsers() public {
        uint256 amount1 = 100 * 10**6; // 100 EURT
        uint256 amount2 = 200 * 10**6; // 200 EURT

        euroToken.mint(user1, amount1);
        euroToken.mint(user2, amount2);

        assertEq(euroToken.balanceOf(user1), amount1, "User1 balance incorrect");
        assertEq(euroToken.balanceOf(user2), amount2, "User2 balance incorrect");
        assertEq(euroToken.totalSupply(), amount1 + amount2, "Total supply incorrect");

        console.log("[PASS] Mint to different users test passed");
    }

    // ============ TESTS DE MINT POR NO-OWNER (DEBE FALLAR) ============

    /**
     * @dev Test 5: Verificar que un no-owner NO puede hacer mint
     * @notice Este test DEBE fallar cuando un usuario que no es owner intenta hacer mint
     * @notice Usa vm.prank para simular una llamada desde otra dirección
     */
    function test_MintByNonOwnerShouldFail() public {
        uint256 amount = 100 * 10**6; // 100 EURT

        // Cambiar el msg.sender a nonOwner usando vm.prank
        vm.prank(nonOwner);

        // Esperamos que esta llamada revierta (cualquier error de Ownable)
        vm.expectRevert();

        // Intentar hacer mint como no-owner (debe fallar)
        euroToken.mint(user1, amount);

        // Verificar que no se crearon tokens
        assertEq(euroToken.balanceOf(user1), 0, "No tokens should be minted");
        assertEq(euroToken.totalSupply(), 0, "Total supply should remain 0");
    }

    /**
     * @dev Test 6: Verificar que el revert es por falta de permisos
     * @notice Verifica específicamente el tipo de error
     */
    function test_MintByNonOwnerReverts() public {
        uint256 amount = 100 * 10**6;

        vm.prank(nonOwner);

        // Verificar que revierte con error de Ownable
        vm.expectRevert();
        euroToken.mint(user1, amount);

        // Verificar que no se crearon tokens
        assertEq(euroToken.balanceOf(user1), 0, "No tokens should be minted");
        assertEq(euroToken.totalSupply(), 0, "Total supply should remain 0");

        console.log("[PASS] Non-owner mint rejection test passed");
    }

    // ============ TESTS DE VALIDACIONES ============

    /**
     * @dev Test 7: Verificar que no se puede hacer mint a dirección cero
     */
    function test_MintToZeroAddressShouldFail() public {
        uint256 amount = 100 * 10**6;

        vm.expectRevert("EuroToken: cannot mint to zero address");
        euroToken.mint(address(0), amount);

        console.log("[PASS] Mint to zero address rejection test passed");
    }

    /**
     * @dev Test 8: Verificar que no se puede hacer mint de cantidad cero
     */
    function test_MintZeroAmountShouldFail() public {
        vm.expectRevert("EuroToken: amount must be greater than zero");
        euroToken.mint(user1, 0);

        console.log("[PASS] Mint zero amount rejection test passed");
    }

    // ============ TESTS DE TRANSFERENCIAS ============

    /**
     * @dev Test 9: Verificar transferencias básicas entre cuentas
     * @notice Debe:
     *   - Permitir transferir tokens de una cuenta a otra
     *   - Actualizar balances correctamente
     *   - Emitir eventos de transferencia
     */
    function test_Transfer() public {
        // Primero hacer mint a user1
        uint256 mintAmount = 1000 * 10**6; // 1000 EURT
        euroToken.mint(user1, mintAmount);

        // Transferir 500 EURT de user1 a user2
        uint256 transferAmount = 500 * 10**6; // 500 EURT
        
        vm.prank(user1);
        euroToken.transfer(user2, transferAmount);

        // Verificar balances
        assertEq(
            euroToken.balanceOf(user1), 
            mintAmount - transferAmount, 
            "User1 balance should decrease"
        );
        assertEq(
            euroToken.balanceOf(user2), 
            transferAmount, 
            "User2 balance should increase"
        );

        // Verificar que el total supply no cambió
        assertEq(euroToken.totalSupply(), mintAmount, "Total supply should not change");

        console.log("[PASS] Transfer test passed");
        console.log("User1 balance after transfer:", euroToken.balanceOf(user1));
        console.log("User2 balance after transfer:", euroToken.balanceOf(user2));
    }

    /**
     * @dev Test 10: Verificar transferFrom con aprobación
     * @notice Debe permitir transferencias con approve y transferFrom
     */
    function test_TransferFrom() public {
        // Mint tokens a user1
        uint256 mintAmount = 1000 * 10**6;
        euroToken.mint(user1, mintAmount);

        uint256 approveAmount = 300 * 10**6;
        uint256 transferAmount = 200 * 10**6;

        // User1 aprueba a nonOwner para gastar tokens
        vm.prank(user1);
        euroToken.approve(nonOwner, approveAmount);

        // Verificar la aprobación
        assertEq(
            euroToken.allowance(user1, nonOwner), 
            approveAmount, 
            "Allowance should be set"
        );

        // nonOwner transfiere tokens en nombre de user1
        vm.prank(nonOwner);
        euroToken.transferFrom(user1, user2, transferAmount);

        // Verificar balances
        assertEq(
            euroToken.balanceOf(user1), 
            mintAmount - transferAmount, 
            "User1 balance incorrect"
        );
        assertEq(
            euroToken.balanceOf(user2), 
            transferAmount, 
            "User2 balance incorrect"
        );
        assertEq(
            euroToken.allowance(user1, nonOwner), 
            approveAmount - transferAmount, 
            "Allowance should decrease"
        );

        console.log("[PASS] TransferFrom test passed");
    }

    /**
     * @dev Test 11: Verificar que no se puede transferir más de lo que se tiene
     */
    function test_TransferInsufficientBalance() public {
        uint256 mintAmount = 100 * 10**6;
        uint256 transferAmount = 200 * 10**6; // Más de lo que tiene

        euroToken.mint(user1, mintAmount);

        vm.prank(user1);
        vm.expectRevert(); // ERC20InsufficientBalance error
        euroToken.transfer(user2, transferAmount);

        console.log("[PASS] Insufficient balance rejection test passed");
    }

    /**
     * @dev Test 12: Verificar transferencias múltiples
     * @notice Debe permitir múltiples transferencias
     */
    function test_MultipleTransfers() public {
        uint256 initialAmount = 1000 * 10**6;
        euroToken.mint(user1, initialAmount);

        // Primera transferencia
        vm.prank(user1);
        euroToken.transfer(user2, 300 * 10**6);

        // Segunda transferencia
        vm.prank(user1);
        euroToken.transfer(nonOwner, 200 * 10**6);

        // Verificar balances finales
        assertEq(euroToken.balanceOf(user1), 500 * 10**6, "User1 final balance incorrect");
        assertEq(euroToken.balanceOf(user2), 300 * 10**6, "User2 balance incorrect");
        assertEq(euroToken.balanceOf(nonOwner), 200 * 10**6, "NonOwner balance incorrect");
        assertEq(euroToken.totalSupply(), initialAmount, "Total supply should not change");

        console.log("[PASS] Multiple transfers test passed");
    }

    // ============ TESTS DE DECIMALES ============

    /**
     * @dev Test 13: Verificar que los decimales funcionan correctamente
     * @notice Debe verificar que 1 EURT = 1 EUR con 6 decimales
     */
    function test_Decimals() public {
        // 1 EURT = 1 * 10^6 unidades base
        uint256 oneEuroInBaseUnits = 1 * 10**6;

        euroToken.mint(user1, oneEuroInBaseUnits);

        // Verificar que el balance es correcto
        assertEq(
            euroToken.balanceOf(user1), 
            oneEuroInBaseUnits, 
            "1 EURT should equal 1 * 10^6 base units"
        );

        // Verificar decimales
        assertEq(euroToken.decimals(), 6, "Decimals should be 6");

        console.log("[PASS] Decimals test passed");
        console.log("1 EURT in base units:", oneEuroInBaseUnits);
    }

    /**
     * @dev Test 14: Verificar cantidades fraccionarias
     * @notice Debe permitir crear y transferir cantidades menores a 1 EURT
     */
    function test_FractionalAmounts() public {
        // 0.5 EURT = 0.5 * 10^6 = 500000 unidades base
        uint256 halfEuro = 500000; // 0.5 EURT

        euroToken.mint(user1, halfEuro);

        assertEq(euroToken.balanceOf(user1), halfEuro, "Fractional amount should work");

        // Transferir 0.25 EURT
        uint256 quarterEuro = 250000; // 0.25 EURT
        
        vm.prank(user1);
        euroToken.transfer(user2, quarterEuro);

        assertEq(euroToken.balanceOf(user1), 250000, "User1 should have 0.25 EURT");
        assertEq(euroToken.balanceOf(user2), 250000, "User2 should have 0.25 EURT");

        console.log("[PASS] Fractional amounts test passed");
    }
}

