// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./MockERC20.sol";

/**
 * @title SimpleSwap
 * @dev Contrato simple para intercambiar ETH por tokens ERC20
 * Tasa de cambio: 1 ETH = 1 token (si el token tiene 18 decimales)
 */
contract SimpleSwap {
    mapping(address => bool) public allowedTokens;
    address public owner;

    event TokenSwapped(address indexed token, address indexed buyer, uint256 ethAmount, uint256 tokenAmount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @dev Agrega un token permitido para swap
     */
    function addToken(address token) external onlyOwner {
        allowedTokens[token] = true;
    }

    /**
     * @dev Intercambia ETH por tokens
     * @param token Dirección del token ERC20
     * @return tokenAmount Cantidad de tokens recibidos
     */
    function swapETHForToken(address token) external payable returns (uint256) {
        require(allowedTokens[token], "Token not allowed");
        require(msg.value > 0, "Must send ETH");

        MockERC20 tokenContract = MockERC20(token);
        uint8 decimals = tokenContract.decimals();
        
        // Calcular cantidad de tokens: 1 ETH = 1 token (si tiene 18 decimales)
        // Si el token tiene 6 decimales: 1 ETH = 10^12 tokens
        uint256 tokenAmount;
        if (decimals == 18) {
            tokenAmount = msg.value; // 1 ETH = 1 token (ambos tienen 18 decimales)
        } else if (decimals < 18) {
            // Token tiene menos decimales, ajustar
            tokenAmount = msg.value / (10 ** (18 - decimals));
        } else {
            // Token tiene más decimales (raro, pero por si acaso)
            tokenAmount = msg.value * (10 ** (decimals - 18));
        }

        // Mintear tokens al usuario
        tokenContract.mint(msg.sender, tokenAmount);

        emit TokenSwapped(token, msg.sender, msg.value, tokenAmount);
        return tokenAmount;
    }

    /**
     * @dev Permite retirar ETH del contrato (solo owner)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
    fallback() external payable {}
}

