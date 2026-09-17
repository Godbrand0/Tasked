// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Taskify} from "../src/Taskify.sol";

/// @notice Deploys a new Taskify implementation for an already-deployed
/// proxy. Requires PRIVATE_KEY (any funded wallet), PROXY_ADDRESS,
/// MUSD_ADDRESS, and MEZO_ADDRESS (the same musd/mezo the existing proxy was
/// initialized with — the new implementation's immutables must match, or
/// every escrow/fee call on the upgraded contract will misbehave; checked
/// against the live proxy below).
///
/// If PRIVATE_KEY is CONTRACT_OWNER, the proxy is upgraded in the same run.
/// Otherwise (e.g. the owner is a Safe multisig, as on mainnet) only the
/// implementation is deployed, and the upgrade transaction for the owner to
/// propose is printed instead.
///
/// Run ./script/check-storage-layout.sh before every upgrade.
///
/// Usage:
///   PROXY_ADDRESS=0x... forge script script/Upgrade.s.sol --rpc-url <url> --broadcast
contract Upgrade is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        address musd = vm.envAddress("MUSD_ADDRESS");
        address mezo = vm.envAddress("MEZO_ADDRESS");

        Taskify proxy = Taskify(proxyAddress);
        require(proxy.musd() == musd, "MUSD_ADDRESS does not match the live proxy");
        require(proxy.mezo() == mezo, "MEZO_ADDRESS does not match the live proxy");

        address deployer = vm.addr(deployerKey);
        address owner = proxy.CONTRACT_OWNER();

        vm.startBroadcast(deployerKey);

        Taskify newImplementation = new Taskify(musd, mezo);
        console.log("Deployed new Taskify implementation:", address(newImplementation));

        if (owner == deployer) {
            proxy.upgradeToAndCall(address(newImplementation), "");
            console.log("Upgraded proxy", proxyAddress, "to implementation", address(newImplementation));
        }

        vm.stopBroadcast();

        if (owner != deployer) {
            console.log("Proxy owner is", owner, "- propose this transaction from it:");
            console.log("  to:    ", proxyAddress);
            console.log("  value:  0");
            console.log("  data:  ");
            console.logBytes(abi.encodeCall(proxy.upgradeToAndCall, (address(newImplementation), "")));
        }
    }
}
