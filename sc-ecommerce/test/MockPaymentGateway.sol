// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../src/IPaymentGateway.sol";
import "../src/IEuroToken.sol";

/**
 * @title MockPaymentGateway
 * @dev Mock del contrato PaymentGateway para usar en tests
 */
contract MockPaymentGateway is IPaymentGateway, AccessControl {
    bytes32 public constant PAYMENT_PROCESSOR_ROLE = keccak256("PAYMENT_PROCESSOR_ROLE");
    IEuroToken public immutable euroToken;

    mapping(string => bool) public processedPayments;

    constructor(address euroTokenAddress, address initialOwner) {
        require(euroTokenAddress != address(0), "MockPaymentGateway: invalid EuroToken address");
        euroToken = IEuroToken(euroTokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
    }

    function processPayment(
        string memory paymentId,
        address payer,
        address payee,
        uint256 amount,
        string memory
    ) external override onlyRole(PAYMENT_PROCESSOR_ROLE) returns (bool) {
        require(!processedPayments[paymentId], "MockPaymentGateway: payment already processed");
        require(euroToken.balanceOf(payer) >= amount, "MockPaymentGateway: insufficient balance");
        require(euroToken.allowance(payer, address(this)) >= amount, "MockPaymentGateway: insufficient allowance");

        processedPayments[paymentId] = true;

        // Transferir tokens
        euroToken.transferFrom(payer, payee, amount);

        return true;
    }

    function grantPaymentProcessorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(PAYMENT_PROCESSOR_ROLE, account);
    }
}

