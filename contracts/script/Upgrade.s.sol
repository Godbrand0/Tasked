// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Taskify} from "../src/Taskify.sol";

/// @notice Upgrades an already-deployed Taskify proxy to a new
/// implementation. Requires PRIVATE_KEY (must be CONTRACT_OWNER on the
/// target proxy), PROXY_ADDRESS, MUSD_ADDRESS, and MEZO_ADDRESS (the same
/// musd/mezo the existing proxy was initialized with — the new
/// implementation's immutables must match, or every escrow/fee call on the
/// upgraded contract will misbehave).
///
/// Usage:
///   PROXY_ADDRESS=0x... forge script script/Upgrade.s.sol --rpc-url <url> --broadcast
contract Upgrade is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        address musd = vm.envAddress("MUSD_ADDRESS");
        address mezo = vm.envAddress("MEZO_ADDRESS");

        vm.startBroadcast(deployerKey);

        Taskify newImplementation = new Taskify(musd, mezo);
        console.log("Deployed new Taskify implementation:", address(newImplementation));

        Taskify(proxyAddress).upgradeToAndCall(address(newImplementation), "");
        console.log("Upgraded proxy", proxyAddress, "to implementation", address(newImplementation));

        vm.stopBroadcast();
    }
}
