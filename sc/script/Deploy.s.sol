// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {SimpleSwap} from "../src/SimpleSwap.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy mock tokens
        MockERC20 tokenA = new MockERC20("Token A", "TKA");
        MockERC20 tokenB = new MockERC20("Token B", "TKB");

        // Deploy Escrow
        Escrow escrow = new Escrow();

        // Deploy SimpleSwap
        SimpleSwap swap = new SimpleSwap();
        
        // Agregar tokens al SimpleSwap
        swap.addToken(address(tokenA));
        swap.addToken(address(tokenB));

        // Register tokens in Escrow
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        // Log addresses in a simple, parseable format
        console2.log("ESCROW_ADDRESS", address(escrow));
        console2.log("TOKEN_A_ADDRESS", address(tokenA));
        console2.log("TOKEN_B_ADDRESS", address(tokenB));
        console2.log("SIMPLE_SWAP_ADDRESS", address(swap));

        vm.stopBroadcast();
    }
}


