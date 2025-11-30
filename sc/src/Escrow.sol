// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Escrow is Ownable, ReentrancyGuard {
    struct Operation {
        uint256 id;
        address user1;
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        bool isActive;
        uint256 closedAt;
    }

    uint256 private nextOperationId;
    mapping(uint256 => Operation) public operations;
    mapping(address => bool) public allowedTokens;
    address[] private tokenList;
    uint256[] private operationIds;

    event TokenAdded(address indexed token);
    event OperationCreated(
        uint256 indexed operationId,
        address indexed user1,
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

    constructor() Ownable(msg.sender) {
        nextOperationId = 1;
    }

    modifier onlyAllowedToken(address token) {
        require(allowedTokens[token], "Token not allowed");
        _;
    }

    /**
     * @dev Agrega un token a la lista de tokens permitidos
     * @param token Dirección del token ERC20 a agregar
     * Solo el owner puede ejecutar esta función
     */
    function addToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!allowedTokens[token], "Token already added");
        allowedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
    }

    /**
     * @dev Retorna la lista de todos los tokens permitidos
     * @return Array de direcciones de tokens permitidos
     */
    function getAllowedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @dev Crea una nueva operación de swap
     * @param tokenA Token que el usuario ofrece
     * @param tokenB Token que el usuario solicita
     * @param amountA Cantidad de tokenA a depositar
     * @param amountB Cantidad de tokenB solicitada
     * @return operationId ID de la operación creada
     * Transfiere tokenA del usuario al contrato y guarda la operación como activa
     */
    function createOperation(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external onlyAllowedToken(tokenA) onlyAllowedToken(tokenB) nonReentrant returns (uint256) {
        require(tokenA != tokenB, "Tokens must be different");
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");

        // Transferir tokenA del usuario al contrato
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);

        // Crear y guardar la operación
        uint256 operationId = nextOperationId++;
        operations[operationId] = Operation({
            id: operationId,
            user1: msg.sender,
            tokenA: tokenA,
            tokenB: tokenB,
            amountA: amountA,
            amountB: amountB,
            isActive: true,
            closedAt: 0
        });

        operationIds.push(operationId);

        emit OperationCreated(operationId, msg.sender, tokenA, tokenB, amountA, amountB);
        return operationId;
    }

    /**
     * @dev Completa una operación de swap
     * @param operationId ID de la operación a completar
     * Transfiere tokenB del usuario2 al usuario1 y tokenA del contrato al usuario2
     * Solo puede completarla alguien diferente al creador
     */
    function completeOperation(uint256 operationId) external nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.isActive, "Operation is not active");
        require(operation.user1 != msg.sender, "Cannot complete your own operation");

        // Transferir tokenB del usuario2 al usuario1
        IERC20(operation.tokenB).transferFrom(msg.sender, operation.user1, operation.amountB);
        
        // Transferir tokenA del contrato al usuario2
        IERC20(operation.tokenA).transfer(msg.sender, operation.amountA);

        // Marcar operación como cerrada
        operation.isActive = false;
        operation.closedAt = block.timestamp;

        emit OperationCompleted(operationId, msg.sender, block.timestamp);
    }

    /**
     * @dev Cancela una operación
     * @param operationId ID de la operación a cancelar
     * Devuelve tokenA al creador
     * Solo el creador puede cancelar
     */
    function cancelOperation(uint256 operationId) external nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.isActive, "Operation is not active");
        require(operation.user1 == msg.sender, "Only creator can cancel");

        // Devolver tokenA al creador
        IERC20(operation.tokenA).transfer(msg.sender, operation.amountA);

        // Marcar operación como cerrada
        operation.isActive = false;
        operation.closedAt = block.timestamp;

        emit OperationCancelled(operationId);
    }

    /**
     * @dev Retorna todas las operaciones
     * @return Array de todas las operaciones (activas y cerradas)
     */
    function getAllOperations() external view returns (Operation[] memory) {
        Operation[] memory allOps = new Operation[](operationIds.length);
        for (uint256 i = 0; i < operationIds.length; i++) {
            allOps[i] = operations[operationIds[i]];
        }
        return allOps;
    }

    /**
     * @dev Retorna una operación específica por su ID
     * @param operationId ID de la operación
     * @return Operation La operación solicitada
     */
    function getOperation(uint256 operationId) external view returns (Operation memory) {
        return operations[operationId];
    }
}

