// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {PaymentGateway} from "../src/PaymentGateway.sol";
import {MockEuroToken} from "./MockEuroToken.sol";

/**
 * @title PaymentGatewayTest
 * @dev Suite de tests para el contrato PaymentGateway
 */
contract PaymentGatewayTest is Test {
    PaymentGateway public paymentGateway;
    MockEuroToken public euroToken;
    
    // Direcciones de prueba
    address public owner;
    address public paymentProcessor;  // Backend con PAYMENT_PROCESSOR_ROLE
    address public payer1;
    address public payer2;
    address public payee1;  // Comerciante
    address public payee2;
    address public nonProcessor;

    // Eventos esperados
    event PaymentProcessed(
        string indexed paymentId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string invoiceId,
        bytes32 txHash,
        uint256 timestamp
    );

    event PaymentProcessorRoleGranted(address indexed account, address indexed admin);
    event PaymentProcessorRoleRevoked(address indexed account, address indexed admin);

    /**
     * @dev Función setUp que se ejecuta antes de cada test
     */
    function setUp() public {
        // Crear direcciones de prueba
        owner = address(this); // El contrato de test será el owner
        paymentProcessor = makeAddr("paymentProcessor");
        payer1 = makeAddr("payer1");
        payer2 = makeAddr("payer2");
        payee1 = makeAddr("payee1");
        payee2 = makeAddr("payee2");
        nonProcessor = makeAddr("nonProcessor");

        // Desplegar MockEuroToken
        euroToken = new MockEuroToken(owner);

        // Desplegar PaymentGateway
        paymentGateway = new PaymentGateway(address(euroToken), owner);

        // Otorgar rol PAYMENT_PROCESSOR_ROLE a paymentProcessor
        paymentGateway.grantPaymentProcessorRole(paymentProcessor);

        // Mint tokens a los payers para que tengan fondos
        euroToken.mint(payer1, 1000 * 10**6); // 1000 EURT
        euroToken.mint(payer2, 500 * 10**6);  // 500 EURT

        console.log("PaymentGateway deployed at:", address(paymentGateway));
        console.log("MockEuroToken deployed at:", address(euroToken));
        console.log("Owner:", owner);
        console.log("PaymentProcessor:", paymentProcessor);
    }

    // ============ TESTS DE DEPLOY ============

    /**
     * @dev Test 1: Verificar que el contrato se despliega correctamente
     */
    function test_Deploy() public {
        assertTrue(address(paymentGateway) != address(0), "Contract should be deployed");
        assertEq(address(paymentGateway.euroToken()), address(euroToken), "EuroToken address should be set");
        assertTrue(paymentGateway.hasRole(paymentGateway.DEFAULT_ADMIN_ROLE(), owner), "Owner should have admin role");
        assertTrue(paymentGateway.hasRole(paymentGateway.PAYMENT_PROCESSOR_ROLE(), paymentProcessor), "Processor should have processor role");
        assertEq(paymentGateway.getTotalPayments(), 0, "Initial payments should be 0");

        console.log("[PASS] Deploy test passed");
    }

    // ============ TESTS DE PROCESS PAYMENT POR PROCESSOR ============

    /**
     * @dev Test 2: Verificar que un processor puede procesar pagos
     */
    function test_ProcessPaymentByProcessor() public {
        string memory paymentId = "pay_test_12345";
        uint256 amount = 100 * 10**6; // 100 EURT
        string memory invoiceId = "INV-001";

        // Aprobar al PaymentGateway para gastar tokens
        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount);

        uint256 initialBalancePayer = euroToken.balanceOf(payer1);
        uint256 initialBalancePayee = euroToken.balanceOf(payee1);

        vm.expectEmit(true, true, false, false);
        emit PaymentProcessed(paymentId, payer1, payee1, amount, invoiceId, bytes32(0), block.timestamp);

        vm.prank(paymentProcessor);
        bool success = paymentGateway.processPayment(paymentId, payer1, payee1, amount, invoiceId);

        assertTrue(success, "Payment should be successful");

        // Verificar que los tokens fueron transferidos
        assertEq(
            euroToken.balanceOf(payer1),
            initialBalancePayer - amount,
            "Payer balance should decrease"
        );
        assertEq(
            euroToken.balanceOf(payee1),
            initialBalancePayee + amount,
            "Payee balance should increase"
        );

        // Verificar que el pago fue registrado
        PaymentGateway.Payment memory payment = paymentGateway.getPayment(paymentId);
        assertEq(payment.paymentId, paymentId, "Payment ID should match");
        assertEq(payment.payer, payer1, "Payer should match");
        assertEq(payment.payee, payee1, "Payee should match");
        assertEq(payment.amount, amount, "Amount should match");
        assertEq(payment.invoiceId, invoiceId, "Invoice ID should match");
        assertTrue(payment.processed, "Payment should be processed");

        console.log("[PASS] Process payment by processor test passed");
    }

    /**
     * @dev Test 3: Verificar múltiples pagos
     */
    function test_MultiplePayments() public {
        string memory paymentId1 = "pay_11111";
        string memory paymentId2 = "pay_22222";
        uint256 amount1 = 100 * 10**6;
        uint256 amount2 = 50 * 10**6;

        // Aprobar ambos pagos
        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount1 + amount2);

        // Primer pago
        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId1, payer1, payee1, amount1, "INV-001");

        // Segundo pago
        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId2, payer1, payee1, amount2, "INV-002");

        // Verificar balances
        assertEq(
            euroToken.balanceOf(payer1),
            1000 * 10**6 - amount1 - amount2,
            "Payer should have 850 EURT"
        );
        assertEq(
            euroToken.balanceOf(payee1),
            amount1 + amount2,
            "Payee should have 150 EURT"
        );

        // Verificar número de pagos
        assertEq(paymentGateway.getTotalPayments(), 2, "Should have 2 payments");

        console.log("[PASS] Multiple payments test passed");
    }

    /**
     * @dev Test 4: Verificar pagos a diferentes payees
     */
    function test_PaymentsToDifferentPayees() public {
        string memory paymentId1 = "pay_aaa";
        string memory paymentId2 = "pay_bbb";
        uint256 amount1 = 200 * 10**6;
        uint256 amount2 = 300 * 10**6;

        // Aprobar ambos pagos
        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount1 + amount2);

        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId1, payer1, payee1, amount1, "INV-001");

        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId2, payer1, payee2, amount2, "INV-002");

        assertEq(euroToken.balanceOf(payee1), amount1, "Payee1 should have 200 EURT");
        assertEq(euroToken.balanceOf(payee2), amount2, "Payee2 should have 300 EURT");

        console.log("[PASS] Payments to different payees test passed");
    }

    // ============ TESTS DE PROCESS PAYMENT POR NO-PROCESSOR (DEBE FALLAR) ============

    /**
     * @dev Test 5: Verificar que un no-processor NO puede procesar pagos
     */
    function test_ProcessPaymentByNonProcessorShouldFail() public {
        string memory paymentId = "pay_99999";
        uint256 amount = 100 * 10**6;

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount);

        vm.prank(nonProcessor);
        vm.expectRevert();
        paymentGateway.processPayment(paymentId, payer1, payee1, amount, "INV-001");

        // Verificar que no se transfirieron tokens
        assertEq(euroToken.balanceOf(payer1), 1000 * 10**6, "Payer balance should not change");
        assertEq(euroToken.balanceOf(payee1), 0, "Payee balance should not change");

        console.log("[PASS] Non-processor rejection test passed");
    }

    // ============ TESTS DE VALIDACIONES ============

    /**
     * @dev Test 6: Verificar que no se puede procesar con paymentId vacío
     */
    function test_PaymentWithEmptyPaymentIdShouldFail() public {
        uint256 amount = 100 * 10**6;

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount);

        vm.prank(paymentProcessor);
        vm.expectRevert("PaymentGateway: paymentId cannot be empty");
        paymentGateway.processPayment("", payer1, payee1, amount, "INV-001");

        console.log("[PASS] Empty paymentId rejection test passed");
    }

    /**
     * @dev Test 7: Verificar que no se puede procesar con payer cero
     */
    function test_PaymentWithZeroPayerShouldFail() public {
        string memory paymentId = "pay_zzz";
        uint256 amount = 100 * 10**6;

        vm.prank(paymentProcessor);
        vm.expectRevert("PaymentGateway: payer cannot be zero address");
        paymentGateway.processPayment(paymentId, address(0), payee1, amount, "INV-001");

        console.log("[PASS] Zero payer rejection test passed");
    }

    /**
     * @dev Test 8: Verificar que no se puede procesar con payee cero
     */
    function test_PaymentWithZeroPayeeShouldFail() public {
        string memory paymentId = "pay_zzz";
        uint256 amount = 100 * 10**6;

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount);

        vm.prank(paymentProcessor);
        vm.expectRevert("PaymentGateway: payee cannot be zero address");
        paymentGateway.processPayment(paymentId, payer1, address(0), amount, "INV-001");

        console.log("[PASS] Zero payee rejection test passed");
    }

    /**
     * @dev Test 9: Verificar que no se puede procesar con cantidad cero
     */
    function test_PaymentZeroAmountShouldFail() public {
        string memory paymentId = "pay_zero";

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), 1000 * 10**6);

        vm.prank(paymentProcessor);
        vm.expectRevert("PaymentGateway: amount must be greater than zero");
        paymentGateway.processPayment(paymentId, payer1, payee1, 0, "INV-001");

        console.log("[PASS] Zero amount rejection test passed");
    }

    /**
     * @dev Test 10: Verificar que no se puede procesar con payer y payee iguales
     */
    function test_PaymentSamePayerAndPayeeShouldFail() public {
        string memory paymentId = "pay_same";
        uint256 amount = 100 * 10**6;

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount);

        vm.prank(paymentProcessor);
        vm.expectRevert("PaymentGateway: payer and payee cannot be the same");
        paymentGateway.processPayment(paymentId, payer1, payer1, amount, "INV-001");

        console.log("[PASS] Same payer and payee rejection test passed");
    }

    /**
     * @dev Test 11: Verificar que no se puede procesar sin balance suficiente
     */
    function test_PaymentInsufficientBalanceShouldFail() public {
        string memory paymentId = "pay_insufficient";
        uint256 amount = 2000 * 10**6; // Más de lo que tiene payer1 (1000 EURT)

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount);

        vm.prank(paymentProcessor);
        vm.expectRevert("PaymentGateway: insufficient balance");
        paymentGateway.processPayment(paymentId, payer1, payee1, amount, "INV-001");

        console.log("[PASS] Insufficient balance rejection test passed");
    }

    /**
     * @dev Test 12: Verificar que no se puede procesar sin allowance suficiente
     */
    function test_PaymentInsufficientAllowanceShouldFail() public {
        string memory paymentId = "pay_no_allowance";
        uint256 amount = 100 * 10**6;
        uint256 insufficientAllowance = 50 * 10**6; // Menos de lo necesario

        // Aprobar menos de lo necesario
        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), insufficientAllowance);

        vm.prank(paymentProcessor);
        vm.expectRevert("PaymentGateway: insufficient allowance");
        paymentGateway.processPayment(paymentId, payer1, payee1, amount, "INV-001");

        console.log("[PASS] Insufficient allowance rejection test passed");
    }

    /**
     * @dev Test 13: Verificar prevención de duplicados
     */
    function test_DuplicatePaymentShouldFail() public {
        string memory paymentId = "pay_duplicate";
        uint256 amount = 100 * 10**6;

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount * 2);

        // Primer pago (debe ser exitoso)
        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId, payer1, payee1, amount, "INV-001");

        // Intentar segundo pago con mismo paymentId (debe fallar)
        vm.prank(paymentProcessor);
        vm.expectRevert("PaymentGateway: payment already processed");
        paymentGateway.processPayment(paymentId, payer1, payee1, amount, "INV-001");

        // Verificar que solo se procesó un pago
        assertEq(paymentGateway.getTotalPayments(), 1, "Should have only 1 payment");

        console.log("[PASS] Duplicate payment prevention test passed");
    }

    // ============ TESTS DE CONSULTAS ============

    /**
     * @dev Test 14: Verificar canProcessPayment
     */
    function test_CanProcessPayment() public {
        uint256 amount = 100 * 10**6;

        // Sin aprobación
        assertFalse(paymentGateway.canProcessPayment(payer1, amount), "Should not be able to process without approval");

        // Con aprobación pero sin balance suficiente
        vm.prank(payer2);
        euroToken.approve(address(paymentGateway), 1000 * 10**6);
        assertFalse(paymentGateway.canProcessPayment(payer2, 1000 * 10**6), "Should not be able to process with insufficient balance");

        // Con aprobación y balance suficiente
        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount);
        assertTrue(paymentGateway.canProcessPayment(payer1, amount), "Should be able to process");

        console.log("[PASS] Can process payment test passed");
    }

    /**
     * @dev Test 15: Verificar getPayment
     */
    function test_GetPayment() public {
        string memory paymentId = "pay_get";
        uint256 amount = 150 * 10**6;
        string memory invoiceId = "INV-100";

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount);

        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId, payer1, payee1, amount, invoiceId);

        PaymentGateway.Payment memory payment = paymentGateway.getPayment(paymentId);
        
        assertEq(payment.paymentId, paymentId, "Payment ID should match");
        assertEq(payment.payer, payer1, "Payer should match");
        assertEq(payment.payee, payee1, "Payee should match");
        assertEq(payment.amount, amount, "Amount should match");
        assertEq(payment.invoiceId, invoiceId, "Invoice ID should match");
        assertTrue(payment.processed, "Payment should be processed");

        console.log("[PASS] Get payment test passed");
    }

    /**
     * @dev Test 16: Verificar getPayerPayments
     */
    function test_GetPayerPayments() public {
        string memory paymentId1 = "pay_payer_1";
        string memory paymentId2 = "pay_payer_2";
        uint256 amount1 = 100 * 10**6;
        uint256 amount2 = 200 * 10**6;

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount1 + amount2);

        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId1, payer1, payee1, amount1, "INV-001");

        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId2, payer1, payee2, amount2, "INV-002");

        PaymentGateway.Payment[] memory payments = paymentGateway.getPayerPayments(payer1);
        
        assertEq(payments.length, 2, "Should have 2 payments");
        assertEq(payments[0].paymentId, paymentId1, "First payment ID should match");
        assertEq(payments[1].paymentId, paymentId2, "Second payment ID should match");

        console.log("[PASS] Get payer payments test passed");
    }

    /**
     * @dev Test 17: Verificar getPayeePayments
     */
    function test_GetPayeePayments() public {
        string memory paymentId1 = "pay_payee_1";
        string memory paymentId2 = "pay_payee_2";
        uint256 amount1 = 100 * 10**6;
        uint256 amount2 = 200 * 10**6;

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), amount1);

        vm.prank(payer2);
        euroToken.approve(address(paymentGateway), amount2);

        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId1, payer1, payee1, amount1, "INV-001");

        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId2, payer2, payee1, amount2, "INV-002");

        PaymentGateway.Payment[] memory payments = paymentGateway.getPayeePayments(payee1);
        
        assertEq(payments.length, 2, "Should have 2 payments");
        assertEq(payments[0].paymentId, paymentId1, "First payment ID should match");
        assertEq(payments[1].paymentId, paymentId2, "Second payment ID should match");

        console.log("[PASS] Get payee payments test passed");
    }

    /**
     * @dev Test 18: Verificar getTotalPayments
     */
    function test_GetTotalPayments() public {
        assertEq(paymentGateway.getTotalPayments(), 0, "Initial should be 0");

        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), 100 * 10**6);

        vm.prank(paymentProcessor);
        paymentGateway.processPayment("pay_1", payer1, payee1, 100 * 10**6, "INV-001");

        assertEq(paymentGateway.getTotalPayments(), 1, "Should be 1");

        vm.prank(payer2);
        euroToken.approve(address(paymentGateway), 200 * 10**6);

        vm.prank(paymentProcessor);
        paymentGateway.processPayment("pay_2", payer2, payee2, 200 * 10**6, "INV-002");

        assertEq(paymentGateway.getTotalPayments(), 2, "Should be 2");

        console.log("[PASS] Get total payments test passed");
    }

    /**
     * @dev Test 19: Verificar isPaymentProcessed
     */
    function test_IsPaymentProcessed() public {
        string memory paymentId = "pay_check";

        // Antes de procesar
        assertFalse(paymentGateway.isPaymentProcessed(paymentId), "Should not be processed");

        // Después de procesar
        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), 100 * 10**6);

        vm.prank(paymentProcessor);
        paymentGateway.processPayment(paymentId, payer1, payee1, 100 * 10**6, "INV-001");

        assertTrue(paymentGateway.isPaymentProcessed(paymentId), "Should be processed");

        console.log("[PASS] Is payment processed test passed");
    }

    // ============ TESTS DE ROLES ============

    /**
     * @dev Test 20: Verificar que el admin puede otorgar roles
     */
    function test_GrantPaymentProcessorRole() public {
        address newProcessor = makeAddr("newProcessor");

        vm.expectEmit(true, true, false, false);
        emit PaymentProcessorRoleGranted(newProcessor, owner);

        paymentGateway.grantPaymentProcessorRole(newProcessor);

        assertTrue(
            paymentGateway.hasRole(paymentGateway.PAYMENT_PROCESSOR_ROLE(), newProcessor),
            "New processor should have role"
        );

        // Verificar que puede procesar pagos
        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), 100 * 10**6);

        vm.prank(newProcessor);
        paymentGateway.processPayment("pay_new", payer1, payee1, 100 * 10**6, "INV-001");

        console.log("[PASS] Grant payment processor role test passed");
    }

    /**
     * @dev Test 21: Verificar que el admin puede revocar roles
     */
    function test_RevokePaymentProcessorRole() public {
        vm.expectEmit(true, true, false, false);
        emit PaymentProcessorRoleRevoked(paymentProcessor, owner);

        paymentGateway.revokePaymentProcessorRole(paymentProcessor);

        assertFalse(
            paymentGateway.hasRole(paymentGateway.PAYMENT_PROCESSOR_ROLE(), paymentProcessor),
            "Processor should not have role anymore"
        );

        // Verificar que no puede procesar pagos
        vm.prank(payer1);
        euroToken.approve(address(paymentGateway), 100 * 10**6);

        vm.prank(paymentProcessor);
        vm.expectRevert();
        paymentGateway.processPayment("pay_revoked", payer1, payee1, 100 * 10**6, "INV-001");

        console.log("[PASS] Revoke payment processor role test passed");
    }

    /**
     * @dev Test 22: Verificar que solo admin puede otorgar/revocar roles
     */
    function test_OnlyAdminCanManageRoles() public {
        address newProcessor = makeAddr("newProcessor");

        // Intentar otorgar rol como no-admin (debe fallar)
        vm.prank(nonProcessor);
        vm.expectRevert();
        paymentGateway.grantPaymentProcessorRole(newProcessor);

        // Intentar revocar rol como no-admin (debe fallar)
        vm.prank(nonProcessor);
        vm.expectRevert();
        paymentGateway.revokePaymentProcessorRole(paymentProcessor);

        console.log("[PASS] Only admin can manage roles test passed");
    }
}

