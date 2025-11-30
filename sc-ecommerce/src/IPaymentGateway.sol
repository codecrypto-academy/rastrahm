// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPaymentGateway
 * @dev Interfaz para interactuar con el contrato PaymentGateway
 */
interface IPaymentGateway {
    function processPayment(
        string memory paymentId,
        address payer,
        address payee,
        uint256 amount,
        string memory invoiceId
    ) external returns (bool);
}

