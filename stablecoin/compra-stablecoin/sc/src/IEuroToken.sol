// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEuroToken
 * @dev Interfaz mínima para interactuar con el contrato EuroToken
 * @notice Solo incluye las funciones necesarias para este contrato
 */
interface IEuroToken {
    /**
     * @dev Función para crear nuevos tokens (mint)
     * @param to Dirección que recibirá los tokens
     * @param amount Cantidad de tokens a crear (en unidades base con 6 decimales)
     * @notice Solo el owner o direcciones autorizadas pueden ejecutar esta función
     */
    function mint(address to, uint256 amount) external;

    /**
     * @dev Obtener el balance de una dirección
     * @param account Dirección a consultar
     * @return uint256 Balance de la cuenta
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Obtener el total supply del token
     * @return uint256 Total supply actual
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Obtener el número de decimales
     * @return uint8 Número de decimales (6)
     */
    function decimals() external view returns (uint8);
}

