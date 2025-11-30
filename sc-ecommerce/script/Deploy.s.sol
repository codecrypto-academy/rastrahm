// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Ecommerce} from "../src/Ecommerce.sol";

/**
 * @title DeployEcommerce
 * @dev Script para desplegar el contrato Ecommerce
 */
contract DeployEcommerce is Script {
    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address euroTokenAddress = vm.envAddress("EURO_TOKEN_ADDRESS");
        address paymentGatewayAddress = vm.envAddress("PAYMENT_GATEWAY_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Desplegar Ecommerce
        Ecommerce ecommerce = new Ecommerce(
            euroTokenAddress,
            paymentGatewayAddress,
            deployer
        );

        vm.stopBroadcast();

        console.log("Ecommerce deployed at:", address(ecommerce));
        console.log("EuroToken address:", euroTokenAddress);
        console.log("PaymentGateway address:", paymentGatewayAddress);
        console.log("Owner:", deployer);

        return address(ecommerce);
    }
}

