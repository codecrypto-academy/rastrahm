// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Euro.sol";

/**
 * @title DeployAll
 * @dev Script completo que despliega Euro y crea el Super Token EURx
 *
 * Usage:
 * forge script script/DeployAll.s.sol:DeployAllScript \
 *   --rpc-url http://127.0.0.1:8545 \
 *   --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
 *   --broadcast
 */

// Superfluid interfaces
interface ISuperTokenFactory {
    function createERC20Wrapper(
        address underlyingToken,
        uint8 underlyingDecimals,
        uint8 upgradability,
        string calldata name,
        string calldata symbol
    ) external returns (address);
}

interface ISuperfluid {
    function getSuperTokenFactory() external view returns (ISuperTokenFactory);
}

contract DeployAllScript is Script {
    // Anvil's first default account
    address constant INITIAL_HOLDER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    // 10 thousand EUR tokens (with 18 decimals)
    uint256 constant INITIAL_SUPPLY = 10_000 * 10**18;

    // Superfluid Host on Ethereum Mainnet (available via fork)
    address constant SUPERFLUID_HOST = 0x4E583d9390082B65Bef884b629DFA426114CED6d;

    function run() external {
        vm.startBroadcast();

        console.log("====================================");
        console.log("Step 1: Deploying Euro ERC20 Token");
        console.log("====================================");

        // Deploy the Euro contract
        Euro euro = new Euro();
        console.log("Euro token deployed at:", address(euro));

        // Mint initial supply to the first Anvil account
        euro.mint(INITIAL_HOLDER, INITIAL_SUPPLY);
        console.log("Minted", INITIAL_SUPPLY / 10**18, "EUR tokens to:", INITIAL_HOLDER);

        console.log("");
        console.log("====================================");
        console.log("Step 2: Creating EURx Super Token");
        console.log("====================================");

        // Get the Super Token Factory from Superfluid Host
        ISuperfluid host = ISuperfluid(SUPERFLUID_HOST);
        ISuperTokenFactory factory = host.getSuperTokenFactory();

        console.log("Using Superfluid Host at:", SUPERFLUID_HOST);
        console.log("Using Super Token Factory at:", address(factory));

        // Create the ERC20 wrapper
        address euroX = factory.createERC20Wrapper(
            address(euro),
            18, // decimals
            1,  // SEMI_UPGRADABLE
            "Super Euro",
            "EURx"
        );

        console.log("EURx Super Token created at:", euroX);

        console.log("");
        console.log("====================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("====================================");
        console.log("");
        console.log("Account balances:");
        console.log("  EUR balance:", euro.balanceOf(INITIAL_HOLDER) / 10**18, "EUR");
        console.log("  Address:", INITIAL_HOLDER);
        console.log("");
        console.log("====================================");
        console.log("NEXT STEPS:");
        console.log("====================================");
        console.log("");
        console.log("1. Update web/src/config/web3.ts with:");
        console.log("");
        console.log("   export const euroAddress = '", address(euro), "';");
        console.log("   export const euroXAddress = '", euroX, "';");
        console.log("");
        console.log("2. Install web dependencies:");
        console.log("   cd web && npm install");
        console.log("");
        console.log("3. Start the web app:");
        console.log("   cd web && npm run dev");
        console.log("");
        console.log("4. Open http://localhost:3000 and connect your wallet");
        console.log("");
        console.log("====================================");

        vm.stopBroadcast();
    }
}
