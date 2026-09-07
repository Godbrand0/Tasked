// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Taskify} from "../src/Taskify.sol";
import {TaskifyV2Mock} from "./mocks/TaskifyV2Mock.sol";
import {MockMUSD} from "../src/MockMUSD.sol";
import {MockMEZO} from "../src/MockMEZO.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";

/// @notice Exercises the UUPS upgrade mechanics added on top of Taskify:
/// proxy deployment, state continuity across an upgrade, the owner-only
/// upgrade gate, and the implementation-can't-be-initialized-directly
/// safeguard. Complements (doesn't replace) Taskify.t.sol /
/// SecurityAudit.t.sol / TaskLifecycleAudit.t.sol, which all now exercise
/// the proxy-deployed contract's business logic.
contract UpgradeTest is Test {
    Taskify implementationV1;
    Taskify taskify; // proxy, viewed through the V1 ABI
    MockMUSD musd;
    MockMEZO mezo;

    address deployer = address(this); // CONTRACT_OWNER
    address alice = makeAddr("alice"); // creator
    address bob = makeAddr("bob"); // contributor

    function setUp() public {
        musd = new MockMUSD();
        mezo = new MockMEZO();
        implementationV1 = new Taskify(address(musd), address(mezo));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementationV1), abi.encodeCall(Taskify.initialize, ()));
        taskify = Taskify(address(proxy));
    }

    /// @notice The implementation contract itself must never be directly
    /// initializable — only reachable through a proxy's delegatecall. If
    /// this weren't blocked, anyone could call initialize() on the bare
    /// implementation, become its CONTRACT_OWNER, and (depending on what
    /// else the implementation exposes) potentially selfdestruct or corrupt
    /// it, breaking every proxy still pointing at it.
    function test_ImplementationCannotBeInitializedDirectly() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementationV1.initialize();
    }

    /// @notice A proxy can only be initialized once — a second call must
    /// revert, otherwise anyone could re-run initialize() and reassign
    /// CONTRACT_OWNER to themselves after the fact.
    function test_ProxyCannotBeReinitialized() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        taskify.initialize();
    }

    /// @notice Only CONTRACT_OWNER may upgrade the proxy — an attacker
    /// pointing the proxy at their own malicious implementation would
    /// otherwise be able to drain every token Taskify holds in escrow.
    function test_NonOwnerCannotUpgrade() public {
        TaskifyV2Mock implementationV2 = new TaskifyV2Mock(address(musd), address(mezo));

        vm.prank(alice);
        vm.expectRevert(Taskify.NotAuthorized.selector);
        taskify.upgradeToAndCall(address(implementationV2), abi.encodeCall(TaskifyV2Mock.initializeV2, ()));
    }

    /// @notice The core guarantee of upgradeability: real state written
    /// through the V1 ABI (registered users, an open task, escrowed funds)
    /// survives the upgrade unchanged, while new V2 logic and storage
    /// become live on the same address, same balances, same everything —
    /// only the code backing the proxy changed.
    function test_UpgradePreservesStateAndUnlocksNewLogic() public {
        // --- Establish real state on V1 ---
        vm.prank(alice);
        taskify.registerUser("alice", Taskify.Role.Creator, 0, true, false);
        vm.prank(bob);
        taskify.registerUser("bob", Taskify.Role.Contributor, 2, true, false);

        musd.mint(100e18, alice);
        vm.startPrank(alice);
        musd.approve(address(taskify), 100e18);
        uint256 taskId = taskify.createTask("Fix a bug", 100e18, address(musd), 0, 4, block.timestamp + 7 days);
        vm.stopPrank();

        uint256 contractBalanceBefore = musd.balanceOf(address(taskify));
        uint256 nextTaskIdBefore = taskify.nextTaskId();
        (, Taskify.Role aliceRoleBefore,,,,,,,) = taskify.users(alice);
        assertEq(uint8(aliceRoleBefore), uint8(Taskify.Role.Creator));

        // --- Upgrade: deploy V2 implementation, owner calls upgradeToAndCall ---
        TaskifyV2Mock implementationV2 = new TaskifyV2Mock(address(musd), address(mezo));
        taskify.upgradeToAndCall(address(implementationV2), abi.encodeCall(TaskifyV2Mock.initializeV2, ()));

        TaskifyV2Mock taskifyV2 = TaskifyV2Mock(address(taskify));

        // --- Pre-upgrade state is untouched ---
        assertEq(musd.balanceOf(address(taskify)), contractBalanceBefore);
        assertEq(taskify.nextTaskId(), nextTaskIdBefore);
        (, Taskify.Role aliceRoleAfter,,,,,,,) = taskify.users(alice);
        assertEq(uint8(aliceRoleAfter), uint8(Taskify.Role.Creator));
        (,, uint256 amount,,,, Taskify.Status status,,,,,,,,) = taskify.tasks(taskId);
        assertEq(amount, 100e18);
        assertEq(uint8(status), uint8(Taskify.Status.Open));

        // --- New V2 logic and storage are live ---
        assertEq(taskifyV2.schemaVersion(), 2);
        assertEq(taskifyV2.ping(), "v2");

        // --- V1 business logic still works post-upgrade, same as before ---
        vm.prank(bob);
        taskify.applyForTask(taskId);
        vm.prank(alice);
        taskify.assignTask(taskId, bob);
        (,,,,,, Taskify.Status statusAfterAssign,,,,,,,,) = taskify.tasks(taskId);
        assertEq(uint8(statusAfterAssign), uint8(Taskify.Status.Assigned));
    }
}
