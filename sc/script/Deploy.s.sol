// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DocumentSigner} from "../src/DocumentSigner.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        DocumentSigner documentSigner = new DocumentSigner();

        console.log("DocumentSigner deployed at:", address(documentSigner));

        vm.stopBroadcast();
    }
}

