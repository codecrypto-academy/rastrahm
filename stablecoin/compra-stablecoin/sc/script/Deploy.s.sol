// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {StablecoinPurchase} from "../src/StablecoinPurchase.sol";

/**
 * @title DeployStablecoinPurchase
 * @dev Script para desplegar el contrato StablecoinPurchase
 */
contract DeployStablecoinPurchase is Script {
    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address euroTokenAddress = vm.envAddress("EURO_TOKEN_ADDRESS");
        address purchaserAddress = vm.envAddress("PURCHASER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Desplegar StablecoinPurchase
        StablecoinPurchase stablecoinPurchase = new StablecoinPurchase(
            euroTokenAddress,
            deployer
        );

        // Otorgar rol PURCHASER_ROLE al address especificado
        stablecoinPurchase.grantRole(
            stablecoinPurchase.PURCHASER_ROLE(),
            purchaserAddress
        );

        vm.stopBroadcast();

        console.log("StablecoinPurchase deployed at:", address(stablecoinPurchase));
        console.log("EuroToken address:", euroTokenAddress);
        console.log("Purchaser role granted to:", purchaserAddress);

        return address(stablecoinPurchase);
    }
}

