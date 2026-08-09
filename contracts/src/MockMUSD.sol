// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Mock MUSD (Mezo USD) for testnet/devnet use. Mirrors usdx-token.clar —
/// an 18-decimal ERC-20 with an open mint faucet for testing.
contract MockMUSD is ERC20 {
    constructor() ERC20("Mezo USD", "MUSD") {}

    function mint(uint256 amount, address recipient) external {
        _mint(recipient, amount);
    }
}
