// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEuroToken
 * @dev Interfaz para interactuar con el contrato EuroToken
 */
interface IEuroToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function decimals() external view returns (uint8);
}

