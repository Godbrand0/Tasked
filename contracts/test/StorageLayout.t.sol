// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Taskify} from "../src/Taskify.sol";
import {TaskifyV2Mock} from "./mocks/TaskifyV2Mock.sol";
import {MockMUSD} from "../src/MockMUSD.sol";
import {MockMEZO} from "../src/MockMEZO.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @notice Pins Taskify's storage slots to the layout already live behind
/// the mainnet proxy (see storage-layout.txt), by reading raw slots rather
/// than trusting getters. An upgrade that reorders, retypes, or inserts
/// state anywhere but directly above __gap moves one of these values and
/// fails here, instead of silently corrupting live state after an upgrade
/// (SECURITY-REVIEW-2026-09-15 finding 3).
contract StorageLayoutTest is Test {
    Taskify taskify;
    MockMUSD musd;
    MockMEZO mezo;

    address alice = makeAddr("alice");

    // Slots 0-21: initial mainnet deployment. Never change these.
    uint256 constant SLOT_CONTRACT_OWNER = 0;
    uint256 constant SLOT_TREASURY = 12;
    uint256 constant SLOT_NEXT_TASK_ID = 16;
    uint256 constant SLOT_CURRENT_WAVE_ID = 17;
    uint256 constant SLOT_WAVE_POOL_AMOUNT = 19;
    uint256 constant SLOT_WAVE_TOTAL_TASKS = 20;
    // Appended above __gap after the initial deployment.
    uint256 constant SLOT_PENDING_OWNER = 22;
    // First slot past __gap: Taskify's total footprint must stay 72 slots.
    uint256 constant SLOT_FIRST_AFTER_GAP = 72;

    function setUp() public {
        musd = new MockMUSD();
        mezo = new MockMEZO();
        Taskify implementation = new Taskify(address(musd), address(mezo));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), abi.encodeCall(Taskify.initialize, ()));
        taskify = Taskify(address(proxy));
    }

    function _slot(uint256 slot) private view returns (bytes32) {
        return vm.load(address(taskify), bytes32(slot));
    }

    function test_InitialDeploymentSlotsUnchanged() public {
        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        musd.mint(10e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 10e18);
        taskify.createTask("Layout task", 10e18, address(musd), 0, 4, block.timestamp + 7 days);
        vm.stopPrank();

        address newTreasury = makeAddr("treasury");
        taskify.setTreasuryAddress(newTreasury);

        assertEq(address(uint160(uint256(_slot(SLOT_CONTRACT_OWNER)))), address(this));
        assertEq(address(uint160(uint256(_slot(SLOT_TREASURY)))), newTreasury);
        assertEq(uint256(_slot(SLOT_NEXT_TASK_ID)), 2);
        assertEq(uint256(_slot(SLOT_CURRENT_WAVE_ID)), 1);
        assertEq(uint256(_slot(SLOT_WAVE_POOL_AMOUNT)), taskify.wavePoolAmount());
        assertGt(taskify.wavePoolAmount(), 0);
        assertEq(uint256(_slot(SLOT_WAVE_TOTAL_TASKS)), 1);
    }

    function test_AppendedSlotsSitDirectlyAboveGap() public {
        address multisig = makeAddr("multisig");
        taskify.transferOwnership(multisig);
        assertEq(address(uint160(uint256(_slot(SLOT_PENDING_OWNER)))), multisig);
    }

    /// @notice Taskify (declared state + __gap) must always total 72 slots,
    /// so the gap shrinks by exactly what's appended above it. Checked
    /// through the V2 mock: its inherited variable lands on the first slot
    /// past Taskify's footprint.
    function test_TotalFootprintIs72Slots() public {
        TaskifyV2Mock implementationV2 = new TaskifyV2Mock(address(musd), address(mezo));
        taskify.upgradeToAndCall(address(implementationV2), abi.encodeCall(TaskifyV2Mock.initializeV2, ()));

        assertEq(uint256(_slot(SLOT_FIRST_AFTER_GAP)), 2);
        assertEq(TaskifyV2Mock(address(taskify)).schemaVersion(), 2);
    }
}
