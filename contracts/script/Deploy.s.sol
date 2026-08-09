// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Taskify} from "../src/Taskify.sol";
import {MockMUSD} from "../src/MockMUSD.sol";
import {MockMEZO} from "../src/MockMEZO.sol";

/// @notice Deploys MockMUSD, MockMEZO, and Taskify to whichever network is
/// targeted (Mezo testnet/mainnet or local). On mainnet, pass the real MUSD
/// token address instead of deploying a mock (see MUSD_ADDRESS env var).
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        address musd = vm.envOr("MUSD_ADDRESS", address(0));
        address mezo = vm.envOr("MEZO_ADDRESS", address(0));

        if (musd == address(0)) {
            musd = address(new MockMUSD());
            console.log("Deployed MockMUSD:", musd);
        }

        if (mezo == address(0)) {
            mezo = address(new MockMEZO());
            console.log("Deployed MockMEZO:", mezo);
        }

        Taskify taskify = new Taskify(musd, mezo);
        console.log("Deployed Taskify:", address(taskify));

        vm.stopBroadcast();
    }
}
