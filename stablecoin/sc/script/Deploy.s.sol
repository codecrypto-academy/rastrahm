// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {EuroToken} from "../src/EuroToken.sol";

/**
 * @title DeployEuroToken
 * @dev Script para desplegar el contrato EuroToken
 */
contract DeployEuroToken is Script {
    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Desplegar EuroToken con el deployer como owner inicial
        EuroToken euroToken = new EuroToken(deployer);

        vm.stopBroadcast();

        console.log("EuroToken deployed at:", address(euroToken));
        console.log("Owner:", deployer);

        return address(euroToken);
    }
}

