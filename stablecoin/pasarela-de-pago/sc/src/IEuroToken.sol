// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEuroToken
 * @dev Interfaz para interactuar con el contrato EuroToken
 */
interface IEuroToken {
    /**
     * @dev Transferir tokens de una dirección a otra
     * @param to Dirección destino
     * @param amount Cantidad de tokens a transferir
     * @return bool true si la transferencia fue exitosa
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Transferir tokens en nombre de otra dirección (requiere aprobación previa)
     * @param from Dirección origen
     * @param to Dirección destino
     * @param amount Cantidad de tokens a transferir
     * @return bool true si la transferencia fue exitosa
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @dev Aprobar a otra dirección para gastar tokens
     * @param spender Dirección autorizada
     * @param amount Cantidad de tokens autorizados
     * @return bool true si la aprobación fue exitosa
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Obtener el balance de una dirección
     * @param account Dirección a consultar
     * @return uint256 Balance de la cuenta
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Obtener la cantidad de tokens que una dirección puede gastar en nombre de otra
     * @param owner Dirección propietaria
     * @param spender Dirección autorizada
     * @return uint256 Cantidad de tokens autorizados
     */
    function allowance(address owner, address spender) external view returns (uint256);

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

