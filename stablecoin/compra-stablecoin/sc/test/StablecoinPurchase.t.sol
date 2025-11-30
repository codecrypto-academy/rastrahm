// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {StablecoinPurchase} from "../src/StablecoinPurchase.sol";
import {MockEuroToken} from "./MockEuroToken.sol";

/**
 * @title StablecoinPurchaseTest
 * @dev Suite de tests para el contrato StablecoinPurchase
 */
contract StablecoinPurchaseTest is Test {
    StablecoinPurchase public stablecoinPurchase;
    MockEuroToken public euroToken;
    
    // Direcciones de prueba
    address public owner;
    address public purchaser;  // Backend con PURCHASER_ROLE
    address public buyer1;
    address public buyer2;
    address public nonPurchaser;

    // Eventos esperados
    event TokensPurchased(
        string indexed purchaseId,
        address indexed buyer,
        uint256 amountTokens,
        uint256 amountEur,
        uint256 timestamp
    );

    event PurchaserRoleGranted(address indexed account, address indexed admin);
    event PurchaserRoleRevoked(address indexed account, address indexed admin);

    /**
     * @dev Función setUp que se ejecuta antes de cada test
     */
    function setUp() public {
        // Crear direcciones de prueba
        owner = address(this); // El contrato de test será el owner
        purchaser = makeAddr("purchaser");
        buyer1 = makeAddr("buyer1");
        buyer2 = makeAddr("buyer2");
        nonPurchaser = makeAddr("nonPurchaser");

        // Desplegar MockEuroToken
        euroToken = new MockEuroToken(owner);

        // Desplegar StablecoinPurchase
        stablecoinPurchase = new StablecoinPurchase(address(euroToken), owner);

        // Transferir ownership de EuroToken a StablecoinPurchase para que pueda hacer mint
        euroToken.transferOwnership(address(stablecoinPurchase));

        // Otorgar rol PURCHASER_ROLE a purchaser
        stablecoinPurchase.grantPurchaserRole(purchaser);

        console.log("StablecoinPurchase deployed at:", address(stablecoinPurchase));
        console.log("MockEuroToken deployed at:", address(euroToken));
        console.log("Owner:", owner);
        console.log("Purchaser:", purchaser);
    }

    // ============ TESTS DE DEPLOY ============

    /**
     * @dev Test 1: Verificar que el contrato se despliega correctamente
     */
    function test_Deploy() public {
        assertTrue(address(stablecoinPurchase) != address(0), "Contract should be deployed");
        assertEq(address(stablecoinPurchase.euroToken()), address(euroToken), "EuroToken address should be set");
        assertTrue(stablecoinPurchase.hasRole(stablecoinPurchase.DEFAULT_ADMIN_ROLE(), owner), "Owner should have admin role");
        assertTrue(stablecoinPurchase.hasRole(stablecoinPurchase.PURCHASER_ROLE(), purchaser), "Purchaser should have purchaser role");
        assertEq(stablecoinPurchase.getTotalPurchases(), 0, "Initial purchases should be 0");

        console.log("[PASS] Deploy test passed");
    }

    // ============ TESTS DE PURCHASE TOKENS POR PURCHASER ============

    /**
     * @dev Test 2: Verificar que un purchaser puede comprar tokens
     */
    function test_PurchaseTokensByPurchaser() public {
        string memory purchaseId = "pi_test_12345";
        address buyer = buyer1;
        uint256 amountEur = 10000; // 100.00 EUR en centavos
        uint256 expectedTokens = amountEur * 10**4; // 100000000 unidades base = 100.000000 EURT

        uint256 initialBalance = euroToken.balanceOf(buyer);
        assertEq(initialBalance, 0, "Initial balance should be 0");

        vm.expectEmit(true, true, false, true);
        emit TokensPurchased(purchaseId, buyer, expectedTokens, amountEur, block.timestamp);

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId, buyer, amountEur);

        // Verificar que los tokens fueron creados
        assertEq(euroToken.balanceOf(buyer), expectedTokens, "Buyer should have 100 EURT");
        assertEq(euroToken.totalSupply(), expectedTokens, "Total supply should be 100 EURT");

        // Verificar que la compra fue registrada
        StablecoinPurchase.Purchase memory purchase = stablecoinPurchase.getPurchase(purchaseId);
        assertEq(purchase.purchaseId, purchaseId, "Purchase ID should match");
        assertEq(purchase.buyer, buyer, "Buyer should match");
        assertEq(purchase.amountTokens, expectedTokens, "Amount tokens should match");
        assertEq(purchase.amountEur, amountEur, "Amount EUR should match");
        assertTrue(purchase.processed, "Purchase should be processed");

        console.log("[PASS] Purchase tokens by purchaser test passed");
    }

    /**
     * @dev Test 3: Verificar múltiples compras
     */
    function test_MultiplePurchases() public {
        string memory purchaseId1 = "pi_test_11111";
        string memory purchaseId2 = "pi_test_22222";
        
        uint256 amountEur1 = 5000; // 50.00 EUR
        uint256 amountEur2 = 7500; // 75.00 EUR
        
        uint256 expectedTokens1 = amountEur1 * 10**4;
        uint256 expectedTokens2 = amountEur2 * 10**4;

        // Primera compra
        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId1, buyer1, amountEur1);

        // Segunda compra
        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId2, buyer1, amountEur2);

        // Verificar balances
        assertEq(
            euroToken.balanceOf(buyer1), 
            expectedTokens1 + expectedTokens2, 
            "Buyer should have 125 EURT"
        );
        assertEq(
            euroToken.totalSupply(), 
            expectedTokens1 + expectedTokens2, 
            "Total supply should be 125 EURT"
        );

        // Verificar número de compras
        assertEq(stablecoinPurchase.getTotalPurchases(), 2, "Should have 2 purchases");

        console.log("[PASS] Multiple purchases test passed");
    }

    /**
     * @dev Test 4: Verificar compras a diferentes usuarios
     */
    function test_PurchasesToDifferentUsers() public {
        string memory purchaseId1 = "pi_test_aaa";
        string memory purchaseId2 = "pi_test_bbb";
        
        uint256 amountEur1 = 10000; // 100 EUR
        uint256 amountEur2 = 20000; // 200 EUR
        
        uint256 expectedTokens1 = amountEur1 * 10**4;
        uint256 expectedTokens2 = amountEur2 * 10**4;

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId1, buyer1, amountEur1);

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId2, buyer2, amountEur2);

        assertEq(euroToken.balanceOf(buyer1), expectedTokens1, "Buyer1 should have 100 EURT");
        assertEq(euroToken.balanceOf(buyer2), expectedTokens2, "Buyer2 should have 200 EURT");
        assertEq(euroToken.totalSupply(), expectedTokens1 + expectedTokens2, "Total supply should be 300 EURT");

        console.log("[PASS] Purchases to different users test passed");
    }

    // ============ TESTS DE PURCHASE TOKENS POR NO-PURCHASER (DEBE FALLAR) ============

    /**
     * @dev Test 5: Verificar que un no-purchaser NO puede comprar tokens
     */
    function test_PurchaseTokensByNonPurchaserShouldFail() public {
        string memory purchaseId = "pi_test_99999";
        uint256 amountEur = 10000;

        vm.prank(nonPurchaser);
        vm.expectRevert();
        stablecoinPurchase.purchaseTokens(purchaseId, buyer1, amountEur);

        // Verificar que no se crearon tokens
        assertEq(euroToken.balanceOf(buyer1), 0, "No tokens should be created");
        assertEq(euroToken.totalSupply(), 0, "Total supply should remain 0");
        assertEq(stablecoinPurchase.getTotalPurchases(), 0, "No purchases should be registered");

        console.log("[PASS] Non-purchaser rejection test passed");
    }

    // ============ TESTS DE VALIDACIONES ============

    /**
     * @dev Test 6: Verificar que no se puede comprar con purchaseId vacío
     */
    function test_PurchaseWithEmptyPurchaseIdShouldFail() public {
        uint256 amountEur = 10000;

        vm.prank(purchaser);
        vm.expectRevert("StablecoinPurchase: purchaseId cannot be empty");
        stablecoinPurchase.purchaseTokens("", buyer1, amountEur);

        console.log("[PASS] Empty purchaseId rejection test passed");
    }

    /**
     * @dev Test 7: Verificar que no se puede comprar para dirección cero
     */
    function test_PurchaseToZeroAddressShouldFail() public {
        string memory purchaseId = "pi_test_zzz";
        uint256 amountEur = 10000;

        vm.prank(purchaser);
        vm.expectRevert("StablecoinPurchase: buyer cannot be zero address");
        stablecoinPurchase.purchaseTokens(purchaseId, address(0), amountEur);

        console.log("[PASS] Zero address rejection test passed");
    }

    /**
     * @dev Test 8: Verificar que no se puede comprar con cantidad cero
     */
    function test_PurchaseZeroAmountShouldFail() public {
        string memory purchaseId = "pi_test_zero";

        vm.prank(purchaser);
        vm.expectRevert("StablecoinPurchase: amount must be greater than zero");
        stablecoinPurchase.purchaseTokens(purchaseId, buyer1, 0);

        console.log("[PASS] Zero amount rejection test passed");
    }

    /**
     * @dev Test 9: Verificar prevención de duplicados
     */
    function test_DuplicatePurchaseShouldFail() public {
        string memory purchaseId = "pi_test_duplicate";
        uint256 amountEur = 10000;

        // Primera compra (debe ser exitosa)
        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId, buyer1, amountEur);

        // Intentar segunda compra con mismo purchaseId (debe fallar)
        vm.prank(purchaser);
        vm.expectRevert("StablecoinPurchase: purchase already processed");
        stablecoinPurchase.purchaseTokens(purchaseId, buyer1, amountEur);

        // Verificar que solo se procesó una compra
        assertEq(stablecoinPurchase.getTotalPurchases(), 1, "Should have only 1 purchase");
        assertEq(euroToken.balanceOf(buyer1), amountEur * 10**4, "Should have tokens from first purchase only");

        console.log("[PASS] Duplicate purchase prevention test passed");
    }

    // ============ TESTS DE CONSULTAS ============

    /**
     * @dev Test 10: Verificar getPurchase
     */
    function test_GetPurchase() public {
        string memory purchaseId = "pi_test_get";
        uint256 amountEur = 15000; // 150 EUR
        uint256 expectedTokens = amountEur * 10**4;

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId, buyer1, amountEur);

        StablecoinPurchase.Purchase memory purchase = stablecoinPurchase.getPurchase(purchaseId);
        
        assertEq(purchase.purchaseId, purchaseId, "Purchase ID should match");
        assertEq(purchase.buyer, buyer1, "Buyer should match");
        assertEq(purchase.amountTokens, expectedTokens, "Amount tokens should match");
        assertEq(purchase.amountEur, amountEur, "Amount EUR should match");
        assertTrue(purchase.processed, "Purchase should be processed");

        console.log("[PASS] Get purchase test passed");
    }

    /**
     * @dev Test 11: Verificar getUserPurchases
     */
    function test_GetUserPurchases() public {
        string memory purchaseId1 = "pi_user_1";
        string memory purchaseId2 = "pi_user_2";
        
        uint256 amountEur1 = 10000;
        uint256 amountEur2 = 20000;

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId1, buyer1, amountEur1);

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId2, buyer1, amountEur2);

        StablecoinPurchase.Purchase[] memory purchases = stablecoinPurchase.getUserPurchases(buyer1);
        
        assertEq(purchases.length, 2, "Should have 2 purchases");
        assertEq(purchases[0].purchaseId, purchaseId1, "First purchase ID should match");
        assertEq(purchases[1].purchaseId, purchaseId2, "Second purchase ID should match");

        console.log("[PASS] Get user purchases test passed");
    }

    /**
     * @dev Test 12: Verificar getTotalPurchases
     */
    function test_GetTotalPurchases() public {
        assertEq(stablecoinPurchase.getTotalPurchases(), 0, "Initial should be 0");

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens("pi_1", buyer1, 10000);

        assertEq(stablecoinPurchase.getTotalPurchases(), 1, "Should be 1");

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens("pi_2", buyer2, 20000);

        assertEq(stablecoinPurchase.getTotalPurchases(), 2, "Should be 2");

        console.log("[PASS] Get total purchases test passed");
    }

    /**
     * @dev Test 13: Verificar isPurchaseProcessed
     */
    function test_IsPurchaseProcessed() public {
        string memory purchaseId = "pi_check";

        // Antes de procesar
        assertFalse(stablecoinPurchase.isPurchaseProcessed(purchaseId), "Should not be processed");

        // Después de procesar
        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId, buyer1, 10000);

        assertTrue(stablecoinPurchase.isPurchaseProcessed(purchaseId), "Should be processed");

        console.log("[PASS] Is purchase processed test passed");
    }

    // ============ TESTS DE CONVERSIÓN DE CANTIDADES ============

    /**
     * @dev Test 14: Verificar conversión correcta de euros a tokens
     */
    function test_AmountConversion() public {
        // 1 EUR = 100 centavos
        // 1 EURT = 10^6 unidades base (con 6 decimales)
        // amountEur en centavos * 10^4 = unidades base
        
        string memory purchaseId = "pi_conversion";
        uint256 amountEurCentavos = 10000; // 100.00 EUR = 10000 centavos
        uint256 expectedTokens = 100000000; // 100.000000 EURT

        vm.prank(purchaser);
        stablecoinPurchase.purchaseTokens(purchaseId, buyer1, amountEurCentavos);

        assertEq(euroToken.balanceOf(buyer1), expectedTokens, "Conversion should be correct");

        StablecoinPurchase.Purchase memory purchase = stablecoinPurchase.getPurchase(purchaseId);
        assertEq(purchase.amountTokens, expectedTokens, "Stored amount should be correct");
        assertEq(purchase.amountEur, amountEurCentavos, "Stored EUR should be correct");

        console.log("[PASS] Amount conversion test passed");
    }

    // ============ TESTS DE ROLES ============

    /**
     * @dev Test 15: Verificar que el admin puede otorgar roles
     */
    function test_GrantPurchaserRole() public {
        address newPurchaser = makeAddr("newPurchaser");

        vm.expectEmit(true, true, false, false);
        emit PurchaserRoleGranted(newPurchaser, owner);

        stablecoinPurchase.grantPurchaserRole(newPurchaser);

        assertTrue(
            stablecoinPurchase.hasRole(stablecoinPurchase.PURCHASER_ROLE(), newPurchaser),
            "New purchaser should have role"
        );

        // Verificar que puede hacer compras
        vm.prank(newPurchaser);
        stablecoinPurchase.purchaseTokens("pi_new", buyer1, 10000);

        console.log("[PASS] Grant purchaser role test passed");
    }

    /**
     * @dev Test 16: Verificar que el admin puede revocar roles
     */
    function test_RevokePurchaserRole() public {
        vm.expectEmit(true, true, false, false);
        emit PurchaserRoleRevoked(purchaser, owner);

        stablecoinPurchase.revokePurchaserRole(purchaser);

        assertFalse(
            stablecoinPurchase.hasRole(stablecoinPurchase.PURCHASER_ROLE(), purchaser),
            "Purchaser should not have role anymore"
        );

        // Verificar que no puede hacer compras
        vm.prank(purchaser);
        vm.expectRevert();
        stablecoinPurchase.purchaseTokens("pi_revoked", buyer1, 10000);

        console.log("[PASS] Revoke purchaser role test passed");
    }

    /**
     * @dev Test 17: Verificar que solo admin puede otorgar/revocar roles
     */
    function test_OnlyAdminCanManageRoles() public {
        address newPurchaser = makeAddr("newPurchaser");

        // Intentar otorgar rol como no-admin (debe fallar)
        vm.prank(nonPurchaser);
        vm.expectRevert();
        stablecoinPurchase.grantPurchaserRole(newPurchaser);

        // Intentar revocar rol como no-admin (debe fallar)
        vm.prank(nonPurchaser);
        vm.expectRevert();
        stablecoinPurchase.revokePurchaserRole(purchaser);

        console.log("[PASS] Only admin can manage roles test passed");
    }
}

