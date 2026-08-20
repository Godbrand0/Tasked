// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Mock MEZO governance token for testnet/devnet use — staked to
/// amplify grant-voting weight.
contract MockMEZO is ERC20 {
    constructor() ERC20("Mezo", "MEZO") {}

    function mint(uint256 amount, address recipient) external {
        _mint(recipient, amount);
    }
}
