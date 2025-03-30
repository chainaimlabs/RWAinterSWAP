// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import {BaseHook} from "uniswap-hooks/base/BaseHook.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {PoolManager} from "v4-core/src/PoolManager.sol";
import "../src/DynamicHook.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

contract DeployScript is Script {
    function run() external {
        // Set RPC URL to unichain (Sepolia)
        vm.createSelectFork(vm.rpcUrl("unichain"));

        // Start broadcasting transactions
        vm.startBroadcast();

        // Deploy PoolManager
        IPoolManager manager = IPoolManager(address(new PoolManager()));

        // Set hook permissions
        uint160 flags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG
        );

        // Mine a salt that will produce a hook address with the correct flags
        (address hookAddress, bytes32 salt) = HookMiner.find(
            address(this),
            flags,
            type(DynamicHook).creationCode,
            abi.encode(address(manager), "https://example.com")
        );

        // Deploy the hook using CREATE2
        DynamicHook hook = new DynamicHook{salt: salt}(
            manager,
            "https://example.com"
        );

        require(address(hook) == hookAddress, "Hook deployment failed");

        vm.stopBroadcast();
    }
}
