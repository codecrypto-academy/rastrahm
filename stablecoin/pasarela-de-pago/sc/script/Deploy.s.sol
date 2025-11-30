// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PaymentGateway} from "../src/PaymentGateway.sol";

/**
 * @title DeployPaymentGateway
 * @dev Script para desplegar el contrato PaymentGateway
 */
contract DeployPaymentGateway is Script {
    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address euroTokenAddress = vm.envAddress("EURO_TOKEN_ADDRESS");
        address paymentProcessorAddress = vm.envAddress("PAYMENT_PROCESSOR_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Desplegar PaymentGateway
        PaymentGateway paymentGateway = new PaymentGateway(
            euroTokenAddress,
            deployer
        );

        // Otorgar rol PAYMENT_PROCESSOR_ROLE al address especificado
        paymentGateway.grantRole(
            paymentGateway.PAYMENT_PROCESSOR_ROLE(),
            paymentProcessorAddress
        );

        vm.stopBroadcast();

        console.log("PaymentGateway deployed at:", address(paymentGateway));
        console.log("EuroToken address:", euroTokenAddress);
        console.log("Payment Processor role granted to:", paymentProcessorAddress);

        return address(paymentGateway);
    }
}

