// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IEuroToken.sol";

/**
 * @title PaymentGateway
 * @dev Contrato para procesar pagos con EuroTokens entre clientes y comerciantes
 * @notice Este contrato actúa como pasarela de pago que procesa transferencias de tokens
 * @notice Se integra con el contrato Ecommerce para procesar pagos de facturas
 */
contract PaymentGateway is AccessControl, ReentrancyGuard {
    // Rol para procesadores de pago autorizados
    bytes32 public constant PAYMENT_PROCESSOR_ROLE = keccak256("PAYMENT_PROCESSOR_ROLE");

    // Referencia al contrato EuroToken
    IEuroToken public immutable euroToken;

    /**
     * @dev Estructura para registrar un pago
     * @param paymentId ID único del pago
     * @param payer Dirección que paga
     * @param payee Dirección que recibe el pago
     * @param amount Cantidad de tokens transferidos (en unidades base con 6 decimales)
     * @param invoiceId ID de la factura asociada (opcional)
     * @param timestamp Timestamp del pago
     * @param processed Indica si el pago ya fue procesado (previene duplicados)
     * @param txHash Hash de la transacción del pago
     */
    struct Payment {
        string paymentId;
        address payer;
        address payee;
        uint256 amount;
        string invoiceId;
        uint256 timestamp;
        bool processed;
        bytes32 txHash;
    }

    // Mapeo de paymentId a Payment para prevenir duplicados
    mapping(string => Payment) public payments;

    // Array de todos los paymentIds para poder listarlos
    string[] public paymentIds;

    // Mapeo de dirección a array de paymentIds de sus pagos realizados
    mapping(address => string[]) public payerPayments;

    // Mapeo de dirección a array de paymentIds de pagos recibidos
    mapping(address => string[]) public payeePayments;

    // Eventos
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
     * @dev Constructor del contrato
     * @param euroTokenAddress Dirección del contrato EuroToken
     * @param initialOwner Dirección que será el admin inicial
     */
    constructor(address euroTokenAddress, address initialOwner) {
        require(euroTokenAddress != address(0), "PaymentGateway: invalid EuroToken address");
        require(initialOwner != address(0), "PaymentGateway: invalid owner address");

        euroToken = IEuroToken(euroTokenAddress);
        
        // Dar rol DEFAULT_ADMIN_ROLE al owner inicial
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
    }

    /**
     * @dev Función principal para procesar un pago con EuroTokens
     * @param paymentId ID único del pago (previene duplicados)
     * @param payer Dirección que paga los tokens
     * @param payee Dirección que recibe los tokens (comerciante)
     * @param amount Cantidad de tokens a transferir (en unidades base con 6 decimales)
     * @param invoiceId ID de la factura asociada (opcional, puede ser vacío)
     * @notice Solo direcciones con PAYMENT_PROCESSOR_ROLE pueden ejecutar esta función
     * @notice El payer debe haber aprobado previamente este contrato para gastar tokens
     * @notice Ejemplo: Para pagar 100 EURT, amount = 100 * 10^6 = 100000000
     * @return bool true si el pago fue exitoso
     */
    function processPayment(
        string memory paymentId,
        address payer,
        address payee,
        uint256 amount,
        string memory invoiceId
    ) external onlyRole(PAYMENT_PROCESSOR_ROLE) nonReentrant returns (bool) {
        require(bytes(paymentId).length > 0, "PaymentGateway: paymentId cannot be empty");
        require(payer != address(0), "PaymentGateway: payer cannot be zero address");
        require(payee != address(0), "PaymentGateway: payee cannot be zero address");
        require(amount > 0, "PaymentGateway: amount must be greater than zero");
        require(payer != payee, "PaymentGateway: payer and payee cannot be the same");

        // Verificar que esta transacción no haya sido procesada antes (prevenir duplicados)
        require(!payments[paymentId].processed, "PaymentGateway: payment already processed");

        // SEGURIDAD: Verificar allowance primero (más barato que balance)
        // Verificar que el contrato tiene suficiente allowance del payer
        require(
            euroToken.allowance(payer, address(this)) >= amount,
            "PaymentGateway: insufficient allowance"
        );

        // Verificar que el payer tiene suficiente balance
        require(
            euroToken.balanceOf(payer) >= amount,
            "PaymentGateway: insufficient balance"
        );

        // Transferir tokens del payer al payee usando transferFrom
        // El payer debe haber aprobado previamente este contrato para gastar tokens
        bool success = euroToken.transferFrom(payer, payee, amount);
        require(success, "PaymentGateway: transfer failed");

        // Registrar el pago
        bytes32 txHash = keccak256(abi.encodePacked(paymentId, payer, payee, amount, block.timestamp));

        payments[paymentId] = Payment({
            paymentId: paymentId,
            payer: payer,
            payee: payee,
            amount: amount,
            invoiceId: invoiceId,
            timestamp: block.timestamp,
            processed: true,
            txHash: txHash
        });

        // Agregar a la lista de paymentIds
        paymentIds.push(paymentId);

        // Agregar a los pagos del payer
        payerPayments[payer].push(paymentId);

        // Agregar a los pagos recibidos del payee
        payeePayments[payee].push(paymentId);

        // Emitir evento
        emit PaymentProcessed(
            paymentId,
            payer,
            payee,
            amount,
            invoiceId,
            txHash,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Función para verificar si un usuario tiene suficiente balance y allowance
     * @param payer Dirección que pagará
     * @param amount Cantidad requerida
     * @return bool true si tiene suficiente balance y allowance
     */
    function canProcessPayment(address payer, uint256 amount) external view returns (bool) {
        if (payer == address(0) || amount == 0) {
            return false;
        }

        uint256 balance = euroToken.balanceOf(payer);
        uint256 allowance = euroToken.allowance(payer, address(this));

        return balance >= amount && allowance >= amount;
    }

    /**
     * @dev Obtener los detalles de un pago por paymentId
     * @param paymentId ID del pago
     * @return Payment Detalles del pago
     */
    function getPayment(string memory paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @dev Obtener todos los pagos realizados por un usuario
     * @param payer Dirección del pagador
     * @return Payment[] Array de pagos realizados
     */
    function getPayerPayments(address payer) external view returns (Payment[] memory) {
        string[] memory paymentIdsArray = payerPayments[payer];
        Payment[] memory result = new Payment[](paymentIdsArray.length);
        
        for (uint256 i = 0; i < paymentIdsArray.length; i++) {
            result[i] = payments[paymentIdsArray[i]];
        }
        
        return result;
    }

    /**
     * @dev Obtener todos los pagos recibidos por un usuario
     * @param payee Dirección del receptor
     * @return Payment[] Array de pagos recibidos
     */
    function getPayeePayments(address payee) external view returns (Payment[] memory) {
        string[] memory paymentIdsArray = payeePayments[payee];
        Payment[] memory result = new Payment[](paymentIdsArray.length);
        
        for (uint256 i = 0; i < paymentIdsArray.length; i++) {
            result[i] = payments[paymentIdsArray[i]];
        }
        
        return result;
    }

    /**
     * @dev Obtener el número total de pagos procesados
     * @return uint256 Cantidad total de pagos
     */
    function getTotalPayments() external view returns (uint256) {
        return paymentIds.length;
    }

    /**
     * @dev Verificar si un pago ya fue procesado
     * @param paymentId ID del pago
     * @return bool true si ya fue procesado, false en caso contrario
     */
    function isPaymentProcessed(string memory paymentId) external view returns (bool) {
        return payments[paymentId].processed;
    }

    /**
     * @dev Función para otorgar rol PAYMENT_PROCESSOR_ROLE (solo admin)
     * @param account Dirección a la que se otorga el rol
     */
    function grantPaymentProcessorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(PAYMENT_PROCESSOR_ROLE, account);
        emit PaymentProcessorRoleGranted(account, msg.sender);
    }

    /**
     * @dev Función para revocar rol PAYMENT_PROCESSOR_ROLE (solo admin)
     * @param account Dirección a la que se revoca el rol
     */
    function revokePaymentProcessorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(PAYMENT_PROCESSOR_ROLE, account);
        emit PaymentProcessorRoleRevoked(account, msg.sender);
    }
}

