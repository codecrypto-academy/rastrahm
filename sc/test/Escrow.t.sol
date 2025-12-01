// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract EscrowTest is Test {
    Escrow public escrow;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public owner;
    address public user1;
    address public user2;

    event TokenAdded(address indexed token);
    event OperationCreated(
        uint256 indexed operationId,
        address indexed user1,
        address indexed user2,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    );
    event OperationCompleted(
        uint256 indexed operationId,
        address indexed user2,
        uint256 completedAt
    );
    event OperationCancelled(uint256 indexed operationId);

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        escrow = new Escrow();
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");

        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        tokenA.mint(user1, 1000 ether);
        tokenB.mint(user2, 1000 ether);
    }

    // ============ Tests para addToken ============

    function testAddToken() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKC");
        
        vm.expectEmit(true, false, false, false);
        emit TokenAdded(address(tokenC));
        
        escrow.addToken(address(tokenC));
        assertTrue(escrow.allowedTokens(address(tokenC)));
    }

    function testAddTokenOnlyOwner() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKC");
        vm.prank(user1);
        vm.expectRevert();
        escrow.addToken(address(tokenC));
    }

    function testAddTokenInvalidAddress() public {
        vm.expectRevert("Invalid token address");
        escrow.addToken(address(0));
    }

    function testAddTokenAlreadyAdded() public {
        vm.expectRevert("Token already added");
        escrow.addToken(address(tokenA));
    }

    // ============ Tests para getAllowedTokens ============

    function testGetAllowedTokens() public view {
        address[] memory tokens = escrow.getAllowedTokens();
        assertEq(tokens.length, 2);
        assertEq(tokens[0], address(tokenA));
        assertEq(tokens[1], address(tokenB));
    }

    function testGetAllowedTokensAfterAdding() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKC");
        escrow.addToken(address(tokenC));
        
        address[] memory tokens = escrow.getAllowedTokens();
        assertEq(tokens.length, 3);
        assertEq(tokens[2], address(tokenC));
    }

    // ============ Tests para createOperation ============

    function testCreateOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);

        uint256 user1BalanceBefore = tokenA.balanceOf(user1);
        uint256 escrowBalanceBefore = tokenA.balanceOf(address(escrow));

        vm.expectEmit(true, true, true, true);
        emit OperationCreated(1, user1, user2, address(tokenA), address(tokenB), 100 ether, 200 ether);

        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );

        assertEq(operationId, 1);

        Escrow.Operation memory operation = escrow.getOperation(operationId);
        assertEq(operation.id, 1);
        assertEq(operation.user1, user1);
        assertEq(operation.user2, user2);
        assertEq(operation.tokenA, address(tokenA));
        assertEq(operation.tokenB, address(tokenB));
        assertEq(operation.amountA, 100 ether);
        assertEq(operation.amountB, 200 ether);
        assertTrue(operation.isActive);
        assertEq(operation.closedAt, 0);

        // Verificar que los tokens se transfirieron correctamente
        assertEq(tokenA.balanceOf(user1), user1BalanceBefore - 100 ether);
        assertEq(tokenA.balanceOf(address(escrow)), escrowBalanceBefore + 100 ether);
        
        vm.stopPrank();
    }

    function testCreateOperationWithNotAllowedToken() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKC");
        
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        
        vm.expectRevert("Token not allowed");
        escrow.createOperation(address(tokenA), address(tokenC), 100 ether, 200 ether, user2);
        
        vm.expectRevert("Token not allowed");
        escrow.createOperation(address(tokenC), address(tokenB), 100 ether, 200 ether, user2);
        
        vm.stopPrank();
    }

    function testCreateOperationWithSameTokens() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);

        vm.expectRevert("Tokens must be different");
        escrow.createOperation(
            address(tokenA),
            address(tokenA),
            100 ether,
            200 ether,
            user2
        );
        vm.stopPrank();
    }

    function testCreateOperationWithZeroAmount() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);

        vm.expectRevert("Amounts must be greater than 0");
        escrow.createOperation(address(tokenA), address(tokenB), 0, 200 ether, user2);

        vm.expectRevert("Amounts must be greater than 0");
        escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 0, user2);
        
        vm.stopPrank();
    }

    function testCreateOperationInsufficientAllowance() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 50 ether); // Menos de lo necesario

        vm.expectRevert();
        escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, user2);
        
        vm.stopPrank();
    }

    function testCreateMultipleOperations() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 500 ether);

        uint256 op1 = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, user2);
        uint256 op2 = escrow.createOperation(address(tokenA), address(tokenB), 150 ether, 300 ether, user2);
        uint256 op3 = escrow.createOperation(address(tokenA), address(tokenB), 200 ether, 400 ether, user2);

        assertEq(op1, 1);
        assertEq(op2, 2);
        assertEq(op3, 3);

        Escrow.Operation[] memory allOps = escrow.getAllOperations();
        assertEq(allOps.length, 3);
        
        vm.stopPrank();
    }

    // ============ Tests para completeOperation ============

    function testCompleteOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );
        vm.stopPrank();

        uint256 user1BalanceBBefore = tokenB.balanceOf(user1);
        uint256 user2BalanceABefore = tokenA.balanceOf(user2);
        uint256 escrowBalanceBefore = tokenA.balanceOf(address(escrow));

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        
        vm.expectEmit(true, true, false, true);
        emit OperationCompleted(operationId, user2, block.timestamp);
        
        escrow.completeOperation(operationId);
        vm.stopPrank();

        Escrow.Operation memory operation = escrow.getOperation(operationId);
        assertFalse(operation.isActive);
        assertGt(operation.closedAt, 0);

        // Verificar balances después del swap
        assertEq(tokenB.balanceOf(user1), user1BalanceBBefore + 200 ether);
        assertEq(tokenA.balanceOf(user2), user2BalanceABefore + 100 ether);
        assertEq(tokenA.balanceOf(address(escrow)), escrowBalanceBefore - 100 ether);
    }

    function testCannotCompleteOwnOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );

        tokenB.mint(user1, 200 ether);
        tokenB.approve(address(escrow), 200 ether);

        vm.expectRevert("Only user2 can complete");
        escrow.completeOperation(operationId);
        vm.stopPrank();
    }

    function testCompleteOperationNotActive() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );
        escrow.cancelOperation(operationId);
        vm.stopPrank();

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        
        vm.expectRevert("Operation is not active");
        escrow.completeOperation(operationId);
        vm.stopPrank();
    }

    function testCompleteOperationInsufficientAllowance() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );
        vm.stopPrank();

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 100 ether); // Menos de lo necesario

        vm.expectRevert(); // fallo por falta de allowance o por revert interna de transferFrom
        escrow.completeOperation(operationId);
        vm.stopPrank();
    }

    // ============ Tests para cancelOperation ============

    function testCancelOperation() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );

        uint256 user1BalanceBefore = tokenA.balanceOf(user1);
        uint256 escrowBalanceBefore = tokenA.balanceOf(address(escrow));

        vm.expectEmit(true, false, false, false);
        emit OperationCancelled(operationId);

        escrow.cancelOperation(operationId);
        vm.stopPrank();

        Escrow.Operation memory operation = escrow.getOperation(operationId);
        assertFalse(operation.isActive);
        assertGt(operation.closedAt, 0);

        // Verificar que los tokens regresaron al creador
        assertEq(tokenA.balanceOf(user1), user1BalanceBefore + 100 ether);
        assertEq(tokenA.balanceOf(address(escrow)), escrowBalanceBefore - 100 ether);
    }

    function testCancelOperationOnlyCreator() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );
        vm.stopPrank();

        vm.prank(user2);
        vm.expectRevert("Only creator can cancel");
        escrow.cancelOperation(operationId);
    }

    function testCancelOperationNotActive() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );
        escrow.cancelOperation(operationId);

        vm.expectRevert("Operation is not active");
        escrow.cancelOperation(operationId);
        vm.stopPrank();
    }

    // ============ Tests para getAllOperations ============

    function testGetAllOperations() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 500 ether);

        escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, user2);
        escrow.createOperation(address(tokenA), address(tokenB), 150 ether, 300 ether, user2);
        vm.stopPrank();

        Escrow.Operation[] memory allOps = escrow.getAllOperations();
        assertEq(allOps.length, 2);
        assertEq(allOps[0].id, 1);
        assertEq(allOps[0].amountA, 100 ether);
        assertEq(allOps[1].id, 2);
        assertEq(allOps[1].amountA, 150 ether);
    }

    function testGetAllOperationsEmpty() public view {
        Escrow.Operation[] memory allOps = escrow.getAllOperations();
        assertEq(allOps.length, 0);
    }

    function testGetAllOperationsWithCompleted() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 500 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );
        vm.stopPrank();

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        escrow.completeOperation(operationId);
        vm.stopPrank();

        Escrow.Operation[] memory allOps = escrow.getAllOperations();
        assertEq(allOps.length, 1);
        assertFalse(allOps[0].isActive);
        assertGt(allOps[0].closedAt, 0);
    }

    // ============ Tests de integración ============

    function testFullFlow() public {
        // 1. Crear operación
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 operationId = escrow.createOperation(
            address(tokenA),
            address(tokenB),
            100 ether,
            200 ether,
            user2
        );
        vm.stopPrank();

        // 2. Verificar que está activa
        Escrow.Operation memory op = escrow.getOperation(operationId);
        assertTrue(op.isActive);

        // 3. Completar operación
        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        escrow.completeOperation(operationId);
        vm.stopPrank();

        // 4. Verificar que está cerrada
        op = escrow.getOperation(operationId);
        assertFalse(op.isActive);
        assertGt(op.closedAt, 0);

        // 5. Verificar balances finales
        assertEq(tokenA.balanceOf(user2), 100 ether);
        assertEq(tokenB.balanceOf(user1), 200 ether);
        assertEq(tokenA.balanceOf(address(escrow)), 0);
    }

    function testMultipleUsersMultipleOperations() public {
        // User1 crea operación 1
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 200 ether);
        uint256 op1 = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, user2);
        vm.stopPrank();

        // User2 completa operación 1
        vm.startPrank(user2);
        tokenB.approve(address(escrow), 200 ether);
        escrow.completeOperation(op1);
        vm.stopPrank();

        // User1 crea operación 2 con user2 como contraparte también
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 op2 = escrow.createOperation(address(tokenA), address(tokenB), 50 ether, 100 ether, user2);
        vm.stopPrank();

        // User2 completa operación 2
        vm.startPrank(user2);
        tokenB.approve(address(escrow), 100 ether);
        escrow.completeOperation(op2);
        vm.stopPrank();

        Escrow.Operation[] memory allOps = escrow.getAllOperations();
        assertEq(allOps.length, 2);
        assertFalse(allOps[0].isActive);
        assertFalse(allOps[1].isActive);
    }
}

