// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Taskify} from "../src/Taskify.sol";
import {MockMUSD} from "../src/MockMUSD.sol";
import {MockMEZO} from "../src/MockMEZO.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @notice Deploys MockMUSD, MockMEZO, and Taskify (behind a UUPS
/// ERC1967Proxy) to whichever network is targeted (Mezo testnet/mainnet or
/// local). On mainnet, pass the real MUSD token address instead of
/// deploying a mock (see MUSD_ADDRESS env var).
///
/// The address to interact with — and the one the frontend's
/// NEXT_PUBLIC_TASKIFY_CONTRACT should point at — is the PROXY, never the
/// implementation. Future upgrades go through script/Upgrade.s.sol against
/// this same proxy address.
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

        Taskify implementation = new Taskify(musd, mezo);
        console.log("Deployed Taskify implementation:", address(implementation));

        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), abi.encodeCall(Taskify.initialize, ()));
        Taskify taskify = Taskify(address(proxy));
        console.log("Deployed Taskify proxy (use this address):", address(taskify));

        // Optional — veBTC/veMEZO escrow addresses are unverified leads as of
        // VOTING_SYSTEM_REDESIGN.md (never confirmed on a live block explorer
        // from this environment) and often aren't known yet at deploy time.
        // Both are owner-settable post-deploy via setVeBTCEscrow/
        // setVeMEZOEscrow specifically so they don't need to gate a redeploy —
        // set here only if already confirmed and passed explicitly.
        address veBTCEscrow = vm.envOr("VEBTC_ESCROW_ADDRESS", address(0));
        address veMEZOEscrow = vm.envOr("VEMEZO_ESCROW_ADDRESS", address(0));

        if (veBTCEscrow != address(0)) {
            taskify.setVeBTCEscrow(veBTCEscrow);
            console.log("Set veBTCEscrow:", veBTCEscrow);
        }
        if (veMEZOEscrow != address(0)) {
            taskify.setVeMEZOEscrow(veMEZOEscrow);
            console.log("Set veMEZOEscrow:", veMEZOEscrow);
        }

        vm.stopBroadcast();
    }
}
