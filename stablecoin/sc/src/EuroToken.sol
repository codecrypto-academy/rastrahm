// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EuroToken
 * @dev Token ERC20 que representa euros digitales (1 EURT = 1 EUR)
 * @notice Este contrato implementa un stablecoin con 6 decimales de precisión
 * @custom:decimal 6 decimales (1 EURT = 1 EUR con precisión de microeuros)
 */
contract EuroToken is ERC20, Ownable {
    /**
     * @dev Evento emitido cuando se crean nuevos tokens (mint)
     * @param to Dirección que recibe los tokens
     * @param amount Cantidad de tokens creados (en unidades base con 6 decimales)
     */
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @dev Constructor del contrato
     * @param initialOwner Dirección del propietario inicial que puede hacer mint
     * @notice El owner inicial será quien despliegue el contrato
     */
    constructor(address initialOwner) ERC20("EuroToken", "EURT") Ownable(initialOwner) {
        // El constructor ya establece el owner mediante Ownable(initialOwner)
        // No se hace mint inicial aquí para mantener control total
    }

    /**
     * @dev Función para especificar el número de decimales
     * @return uint8 Número de decimales (6)
     * @notice 6 decimales significa que 1 EURT = 1 EUR con precisión de microeuros
     * @notice Ejemplo: 1.500000 EURT = 1.5 EUR en notación estándar
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev Función para crear nuevos tokens (mint)
     * @param to Dirección que recibirá los tokens
     * @param amount Cantidad de tokens a crear (en unidades base con 6 decimales)
     * @notice Solo el owner puede ejecutar esta función
     * @notice Ejemplo: Para crear 100 EURT, amount = 100 * 10^6 = 100000000
     * @notice Emite el evento TokensMinted para auditoría
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "EuroToken: cannot mint to zero address");
        require(amount > 0, "EuroToken: amount must be greater than zero");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Función para quemar (destruir) tokens
     * @param amount Cantidad de tokens a quemar
     * @notice Permite a cualquier usuario quemar sus propios tokens
     * @notice Útil para reducir la oferta monetaria si es necesario
     */
    function burn(uint256 amount) external {
        require(amount > 0, "EuroToken: amount must be greater than zero");
        _burn(msg.sender, amount);
    }

    /**
     * @dev Función para quemar tokens de otra dirección (requiere aprobación)
     * @param from Dirección de la que se queman los tokens
     * @param amount Cantidad de tokens a quemar
     * @notice Solo el owner puede ejecutar esta función
     * @notice Requiere que el dueño de los tokens haya aprobado previamente a este contrato
     */
    function burnFrom(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "EuroToken: cannot burn from zero address");
        require(amount > 0, "EuroToken: amount must be greater than zero");
        
        // Verificar allowance (según documentación, requiere aprobación)
        uint256 currentAllowance = allowance(from, msg.sender);
        require(currentAllowance >= amount, "EuroToken: insufficient allowance");
        
        // Reducir allowance antes de quemar
        _approve(from, msg.sender, currentAllowance - amount);
        
        _burn(from, amount);
    }
}

