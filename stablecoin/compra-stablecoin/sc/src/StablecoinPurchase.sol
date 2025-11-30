// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IEuroToken.sol";

/**
 * @title StablecoinPurchase
 * @dev Contrato para comprar EuroTokens usando pagos de Stripe (fiat)
 * @notice Este contrato actúa como intermediario entre Stripe y EuroToken
 * @notice Solo direcciones autorizadas (backend) pueden ejecutar compras después de validar el pago en Stripe
 */
contract StablecoinPurchase is AccessControl, ReentrancyGuard {
    // Rol para autorizar direcciones que pueden ejecutar compras
    bytes32 public constant PURCHASER_ROLE = keccak256("PURCHASER_ROLE");

    // Referencia al contrato EuroToken
    IEuroToken public immutable euroToken;

    /**
     * @dev Estructura para registrar una compra
     * @param purchaseId ID único de la compra (paymentIntentId de Stripe)
     * @param buyer Dirección que recibe los tokens
     * @param amountTokens Cantidad de tokens creados (en unidades base con 6 decimales)
     * @param amountEur Cantidad en euros pagada (en centavos de euro, ej: 10000 = 100.00 EUR)
     * @param timestamp Timestamp de la compra
     * @param processed Indica si la compra ya fue procesada (previene duplicados)
     */
    struct Purchase {
        string purchaseId;        // paymentIntentId de Stripe
        address buyer;
        uint256 amountTokens;
        uint256 amountEur;        // En centavos de euro (ej: 10000 = 100.00 EUR)
        uint256 timestamp;
        bool processed;
    }

    // Mapeo de purchaseId a Purchase para prevenir duplicados
    mapping(string => Purchase) public purchases;

    // Array de todos los purchaseIds para poder listarlos
    string[] public purchaseIds;

    // Mapeo de dirección a array de purchaseIds de sus compras
    mapping(address => string[]) public userPurchases;

    // Eventos
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
     * @dev Constructor del contrato
     * @param euroTokenAddress Dirección del contrato EuroToken
     * @param initialOwner Dirección que será el admin inicial (puede otorgar roles)
     */
    constructor(address euroTokenAddress, address initialOwner) {
        require(euroTokenAddress != address(0), "StablecoinPurchase: invalid EuroToken address");
        require(initialOwner != address(0), "StablecoinPurchase: invalid owner address");

        euroToken = IEuroToken(euroTokenAddress);
        
        // Dar rol DEFAULT_ADMIN_ROLE al owner inicial
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
    }

    /**
     * @dev Función principal para comprar tokens después de un pago exitoso en Stripe
     * @param purchaseId ID único de la compra (paymentIntentId de Stripe) - previene duplicados
     * @param buyer Dirección del comprador que recibirá los tokens
     * @param amountEur Cantidad en euros pagada (en centavos, ej: 10000 = 100.00 EUR)
     * @notice Solo direcciones con PURCHASER_ROLE pueden ejecutar esta función
     * @notice El backend debe validar el pago en Stripe antes de llamar esta función
     * @notice 1 EUR = 1 EURT (equivalencia 1:1)
     * @notice Los tokens tienen 6 decimales, entonces 1 EURT = 10^6 unidades base
     */
    function purchaseTokens(
        string memory purchaseId,
        address buyer,
        uint256 amountEur
    ) external onlyRole(PURCHASER_ROLE) nonReentrant {
        require(bytes(purchaseId).length > 0, "StablecoinPurchase: purchaseId cannot be empty");
        require(buyer != address(0), "StablecoinPurchase: buyer cannot be zero address");
        require(amountEur > 0, "StablecoinPurchase: amount must be greater than zero");

        // Verificar que esta compra no haya sido procesada antes (prevenir duplicados)
        require(!purchases[purchaseId].processed, "StablecoinPurchase: purchase already processed");

        // Convertir cantidad en euros a tokens (1 EUR = 1 EURT)
        // amountEur está en centavos (ej: 10000 = 100.00 EUR)
        // Necesitamos convertir a unidades base con 6 decimales
        // 1 EUR = 1 EURT = 10^6 unidades base
        // amountEur (centavos) * 10^4 = unidades base (con 6 decimales)
        // Ejemplo: 10000 centavos * 10000 = 100000000 unidades base = 100.000000 EURT
        uint256 amountTokens = amountEur * 10**4;

        // SEGURIDAD: Patrón Checks-Effects-Interactions
        // INTERACTIONS PRIMERO: Hacer mint de tokens (si falla, no se modifica estado)
        // Nota: El contrato StablecoinPurchase necesita ser owner de EuroToken
        // o tener permisos para hacer mint. Esto se configura después del deploy.
        // El owner de EuroToken debe transferir la propiedad a este contrato
        // o agregar este contrato como minter autorizado.
        euroToken.mint(buyer, amountTokens);

        // EFFECTS DESPUÉS: Registrar la compra (solo si mint fue exitoso)
        purchases[purchaseId] = Purchase({
            purchaseId: purchaseId,
            buyer: buyer,
            amountTokens: amountTokens,
            amountEur: amountEur,
            timestamp: block.timestamp,
            processed: true
        });

        // Agregar a la lista de purchaseIds
        purchaseIds.push(purchaseId);

        // Agregar a las compras del usuario
        userPurchases[buyer].push(purchaseId);

        // Emitir evento
        emit TokensPurchased(purchaseId, buyer, amountTokens, amountEur, block.timestamp);
    }

    /**
     * @dev Obtener los detalles de una compra por purchaseId
     * @param purchaseId ID de la compra
     * @return Purchase Detalles de la compra
     */
    function getPurchase(string memory purchaseId) external view returns (Purchase memory) {
        return purchases[purchaseId];
    }

    /**
     * @dev Obtener todas las compras de un usuario
     * @param user Dirección del usuario
     * @return Purchase[] Array de compras del usuario
     */
    function getUserPurchases(address user) external view returns (Purchase[] memory) {
        string[] memory userPurchaseIds = userPurchases[user];
        Purchase[] memory result = new Purchase[](userPurchaseIds.length);
        
        for (uint256 i = 0; i < userPurchaseIds.length; i++) {
            result[i] = purchases[userPurchaseIds[i]];
        }
        
        return result;
    }

    /**
     * @dev Obtener el número total de compras procesadas
     * @return uint256 Cantidad total de compras
     */
    function getTotalPurchases() external view returns (uint256) {
        return purchaseIds.length;
    }

    /**
     * @dev Verificar si una compra ya fue procesada
     * @param purchaseId ID de la compra
     * @return bool true si ya fue procesada, false en caso contrario
     */
    function isPurchaseProcessed(string memory purchaseId) external view returns (bool) {
        return purchases[purchaseId].processed;
    }

    /**
     * @dev Función para otorgar rol PURCHASER_ROLE (solo admin)
     * @param account Dirección a la que se otorga el rol
     */
    function grantPurchaserRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(PURCHASER_ROLE, account);
        emit PurchaserRoleGranted(account, msg.sender);
    }

    /**
     * @dev Función para revocar rol PURCHASER_ROLE (solo admin)
     * @param account Dirección a la que se revoca el rol
     */
    function revokePurchaserRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(PURCHASER_ROLE, account);
        emit PurchaserRoleRevoked(account, msg.sender);
    }
}

