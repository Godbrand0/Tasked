// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Taskify} from "../../src/Taskify.sol";

/// @notice Stand-in "next version" of Taskify used only by Upgrade.t.sol to
/// prove the real contract's upgrade mechanics work: same storage layout as
/// V1 (inherits it directly, so every existing slot lines up exactly) plus
/// one new variable appended after V1's __gap-preceding fields and one new
/// function, to show state survives an upgrade and new logic becomes live.
///
/// Not a real proposed V2 — just enough of a second implementation to
/// exercise upgradeToAndCall end to end.
contract TaskifyV2Mock is Taskify {
    uint256 public schemaVersion;

    constructor(address _musd, address _mezo) Taskify(_musd, _mezo) {}

    /// @notice Called once via upgradeToAndCall's `data` param, in the same
    /// transaction as the upgrade — reinitializer(2) permits exactly one
    /// call, on top of (never replacing) the V1 initialize() that already
    /// ran when the proxy was first deployed.
    function initializeV2() external reinitializer(2) {
        schemaVersion = 2;
    }

    function ping() external pure returns (string memory) {
        return "v2";
    }
}
