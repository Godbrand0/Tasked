import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

// Helper function to recursively convert Clarity Values to standard JS types
function cvToJs(cv: any): any {
  if (!cv) return undefined;
  if (cv.type === "some") {
    return cvToJs(cv.value);
  }
  if (cv.type === "none") {
    return null;
  }
  if (cv.type === "ok" || cv.type === "err") {
    return cvToJs(cv.value);
  }
  if (cv.type === "tuple") {
    const result: any = {};
    for (const key of Object.keys(cv.value)) {
      result[key] = cvToJs(cv.value[key]);
    }
    return result;
  }
  if (cv.type === "uint" || cv.type === "int") {
    return BigInt(cv.value);
  }
  if (cv.type === "true") {
    return true;
  }
  if (cv.type === "false") {
    return false;
  }
  if (cv.type === "ascii" || cv.type === "utf8") {
    return cv.value;
  }
  if (cv.type === "principal" || cv.type === "contract") {
    return cv.value;
  }
  return cv.value;
}

describe("Tasked Protocol Lifecycle Simulation", () => {
  const accounts = simnet.getAccounts();
  const deployer = accounts.get("deployer")!;
  const alice = accounts.get("wallet_1")!; // creator
  const bob = accounts.get("wallet_2")!; // contributor (tier 2 / mid)
  const charlie = accounts.get("wallet_3")!; // investor / patron
  const dave = accounts.get("wallet_4")!; // contributor (tier 0 / newcomer)

  const tokenPrincipal = `${deployer}.usdx-token`;

  it("should run the entire protocol lifecycle successfully", () => {
    // -------------------------------------------------------------
    // Step 1: User Registrations
    // -------------------------------------------------------------
    
    // Alice registers as a creator
    const regAlice = simnet.callPublicFn(
      "tasked",
      "register-user",
      [
        Cl.stringAscii("alice"),
        Cl.stringAscii("creator"),
        Cl.uint(0),
        Cl.bool(true),
      ],
      alice
    );
    expect(regAlice.result.type).toBe("ok");
    expect(cvToJs(regAlice.result)).toBe(true);

    // Bob registers as a contributor with TIER-MID (2)
    const regBob = simnet.callPublicFn(
      "tasked",
      "register-user",
      [
        Cl.stringAscii("bob"),
        Cl.stringAscii("contributor"),
        Cl.uint(2),
        Cl.bool(true),
      ],
      bob
    );
    expect(regBob.result.type).toBe("ok");
    expect(cvToJs(regBob.result)).toBe(true);

    // Dave registers as a contributor with TIER-NEWCOMER (0)
    const regDave = simnet.callPublicFn(
      "tasked",
      "register-user",
      [
        Cl.stringAscii("dave"),
        Cl.stringAscii("contributor"),
        Cl.uint(0),
        Cl.bool(false),
      ],
      dave
    );
    expect(regDave.result.type).toBe("ok");
    expect(cvToJs(regDave.result)).toBe(true);

    // Charlie registers as an investor
    const regCharlie = simnet.callPublicFn(
      "tasked",
      "register-user",
      [
        Cl.stringAscii("charlie"),
        Cl.stringAscii("investor"),
        Cl.uint(0),
        Cl.bool(false),
      ],
      charlie
    );
    expect(regCharlie.result.type).toBe("ok");
    expect(cvToJs(regCharlie.result)).toBe(true);

    // Verify Bob's profile
    let bobProfile = simnet.getMapEntry("tasked", "users", Cl.tuple({ address: Cl.principal(bob) }));
    expect(bobProfile?.type).toBe("some");
    let bobProfileJs = cvToJs(bobProfile);
    expect(bobProfileJs["experience-level"]).toBe(2n);
    expect(bobProfileJs["role"]).toBe("contributor");
    expect(bobProfileJs["username"]).toBe("bob");

    // -------------------------------------------------------------
    // Step 2: Experience Update Cooldown
    // -------------------------------------------------------------
    
    // Bob tries to update experience level immediately -> should fail with ERR-COOLDOWN-ACTIVE (1006)
    const earlyResponse = simnet.callPublicFn(
      "tasked",
      "update-experience",
      [Cl.uint(3)],
      bob
    );
    expect(earlyResponse.result.type).toBe("err");
    expect(cvToJs(earlyResponse.result)).toBe(1006n);

    // Mine 144 blocks
    simnet.mineEmptyBlocks(144);

    // Bob updates experience after cooldown -> should succeed
    const lateResponse = simnet.callPublicFn(
      "tasked",
      "update-experience",
      [Cl.uint(3)],
      bob
    );
    expect(lateResponse.result.type).toBe("ok");
    expect(cvToJs(lateResponse.result)).toBe(true);

    // Verify Bob's experience is now TIER-SENIOR (3)
    bobProfile = simnet.getMapEntry("tasked", "users", Cl.tuple({ address: Cl.principal(bob) }));
    bobProfileJs = cvToJs(bobProfile);
    expect(bobProfileJs["experience-level"]).toBe(3n);

    // -------------------------------------------------------------
    // Step 3: Self-Funded Task Escrow Lifecycle
    // -------------------------------------------------------------
    
    // Mint 1000 USDX to Alice
    const mintAlice = simnet.callPublicFn(
      "usdx-token",
      "mint",
      [Cl.uint(1000_000_000), Cl.principal(alice)],
      deployer
    );
    expect(mintAlice.result.type).toBe("ok");

    // Alice creates a task for 1000 USDX, experience requirements: 1 to 3
    const createTaskResponse = simnet.callPublicFn(
      "tasked",
      "create-task",
      [
        Cl.stringAscii("Build Tasked UI Components"),
        Cl.uint(1000_000_000),
        Cl.principal(tokenPrincipal),
        Cl.uint(1),
        Cl.uint(3),
        Cl.uint(1000),
      ],
      alice
    );
    expect(createTaskResponse.result.type).toBe("ok");
    expect(cvToJs(createTaskResponse.result)).toBe(1n); // task ID 1

    // Verify Alice's balance is 0
    let aliceBalance = simnet.callReadOnlyFn("usdx-token", "get-balance", [Cl.principal(alice)], alice);
    expect(cvToJs(aliceBalance.result)).toBe(0n);

    // Verify Treasury fee: 60% of 3% fee (18 USDX)
    const treasuryAddressVal = cvToJs(simnet.callReadOnlyFn("tasked", "get-treasury-address", [], deployer).result);
    const treasuryBalance = simnet.callReadOnlyFn("usdx-token", "get-balance", [Cl.principal(treasuryAddressVal)], deployer);
    expect(cvToJs(treasuryBalance.result)).toBe(18_000_000n);

    // Verify Wave Pool variables: 40% of 3% fee (12 USDX)
    let waveInfo = simnet.callReadOnlyFn("tasked", "get-current-wave", [], deployer);
    let waveInfoJs = cvToJs(waveInfo.result);
    expect(waveInfoJs["pool-amount"]).toBe(12_000_000n);
    expect(waveInfoJs["total-tasks"]).toBe(1n);

    // Dave (tier 0) tries to apply -> should fail (needs tier 1-3)
    const daveApply = simnet.callPublicFn("tasked", "apply-for-task", [Cl.uint(1)], dave);
    expect(daveApply.result.type).toBe("err");
    expect(cvToJs(daveApply.result)).toBe(1010n); // ERR-EXPERIENCE-MISMATCH

    // Bob (tier 3) applies -> should succeed
    const bobApply = simnet.callPublicFn("tasked", "apply-for-task", [Cl.uint(1)], bob);
    expect(bobApply.result.type).toBe("ok");
    expect(cvToJs(bobApply.result)).toBe(true);

    // Alice assigns task to Bob
    const assignResponse = simnet.callPublicFn("tasked", "assign-task", [Cl.uint(1), Cl.principal(bob)], alice);
    expect(assignResponse.result.type).toBe("ok");
    expect(cvToJs(assignResponse.result)).toBe(true);

    // Bob starts task
    const startResponse = simnet.callPublicFn("tasked", "start-task", [Cl.uint(1)], bob);
    expect(startResponse.result.type).toBe("ok");
    expect(cvToJs(startResponse.result)).toBe(true);

    // Bob submits task
    const submitResponse = simnet.callPublicFn("tasked", "submit-task", [Cl.uint(1)], bob);
    expect(submitResponse.result.type).toBe("ok");
    expect(cvToJs(submitResponse.result)).toBe(true);

    // Alice approves and releases funds
    const releaseResponse = simnet.callPublicFn(
      "tasked",
      "approve-and-release",
      [Cl.uint(1), Cl.principal(tokenPrincipal)],
      alice
    );
    expect(releaseResponse.result.type).toBe("ok");
    expect(cvToJs(releaseResponse.result)).toBe(true);

    // Verify Bob received net amount (970 USDX)
    const bobBalance = simnet.callReadOnlyFn("usdx-token", "get-balance", [Cl.principal(bob)], bob);
    expect(cvToJs(bobBalance.result)).toBe(970_000_000n);

    // -------------------------------------------------------------
    // Step 4: Grant Pool Deposits, Staking, and Voting
    // -------------------------------------------------------------
    
    // Mint 10,000 USDX to Charlie
    const mintCharlie = simnet.callPublicFn(
      "usdx-token",
      "mint",
      [Cl.uint(10000_000_000), Cl.principal(charlie)],
      deployer
    );
    expect(mintCharlie.result.type).toBe("ok");

    // Charlie deposits 5000 USDX to pool
    const depositResponse = simnet.callPublicFn(
      "tasked",
      "deposit-to-pool",
      [Cl.uint(5000_000_000), Cl.principal(tokenPrincipal)],
      charlie
    );
    expect(depositResponse.result.type).toBe("ok");
    expect(cvToJs(depositResponse.result)).toBe(true);

    // Charlie stakes 100 STX (100_000_000 micro-STX)
    const stakeResponse = simnet.callPublicFn("tasked", "stake-stx", [Cl.uint(100_000_000)], charlie);
    expect(stakeResponse.result.type).toBe("ok");
    expect(cvToJs(stakeResponse.result)).toBe(true);

    // Verify Charlie's patron profile
    const charliePatron = simnet.getMapEntry("tasked", "patrons", Cl.tuple({ address: Cl.principal(charlie) }));
    expect(charliePatron?.type).toBe("some");
    const charliePatronJs = cvToJs(charliePatron);
    expect(charliePatronJs["stx-staked"]).toBe(100_000_000n);
    expect(charliePatronJs["tier"]).toBe(3n); // Diamond
    expect(charliePatronJs["total-deposited"]).toBe(5000_000_000n);

    // Alice applies for a grant-funded task (1000 USDX)
    const grantResponse = simnet.callPublicFn(
      "tasked",
      "apply-for-grant",
      [
        Cl.stringAscii("Build Tasked Rust Parser"),
        Cl.uint(1000_000_000),
        Cl.uint(2),
        Cl.uint(4),
      ],
      alice
    );
    expect(grantResponse.result.type).toBe("ok");
    expect(cvToJs(grantResponse.result)).toBe(2n); // task ID 2

    // Charlie votes for the grant task
    const voteResponse = simnet.callPublicFn(
      "tasked",
      "vote-on-grant",
      [Cl.uint(2), Cl.bool(true)],
      charlie
    );
    expect(voteResponse.result.type).toBe("ok");
    expect(cvToJs(voteResponse.result)).toBe(true);

    // Verify voting weight: 5,000,000,000 + (100,000_000 * 10) = 6,000,000,000
    const voteTally = simnet.getMapEntry("tasked", "grant-votes", Cl.tuple({ "task-id": Cl.uint(2) }));
    expect(voteTally?.type).toBe("some");
    const voteTallyJs = cvToJs(voteTally);
    expect(voteTallyJs["votes-for"]).toBe(6000_000_000n);
    expect(voteTallyJs["votes-against"]).toBe(0n);
    expect(voteTallyJs["executed"]).toBe(false);

    // Try executing grant before deadline -> should fail with ERR-VOTING-OPEN (1020)
    const earlyExec = simnet.callPublicFn(
      "tasked",
      "execute-grant",
      [Cl.uint(2), Cl.principal(tokenPrincipal)],
      alice
    );
    expect(earlyExec.result.type).toBe("err");
    expect(cvToJs(earlyExec.result)).toBe(1020n);

    // Mine 432 blocks to pass voting period
    simnet.mineEmptyBlocks(432);

    // Execute grant
    const executeResponse = simnet.callPublicFn(
      "tasked",
      "execute-grant",
      [Cl.uint(2), Cl.principal(tokenPrincipal)],
      alice
    );
    expect(executeResponse.result.type).toBe("ok");
    expect(cvToJs(executeResponse.result)).toBe(true);

    // Check task status became OPEN
    const taskObj = simnet.getMapEntry("tasked", "tasks", Cl.tuple({ "task-id": Cl.uint(2) }));
    expect(taskObj?.type).toBe("some");
    const taskJs = cvToJs(taskObj);
    expect(taskJs["status"]).toBe("OPEN");

    // Verify grant pool balance reduced by 1000 USDX
    const grantPoolBal = simnet.callReadOnlyFn("tasked", "get-grant-pool-balance", [], deployer);
    expect(cvToJs(grantPoolBal.result)).toBe(4000_000_000n);

    // Verify Wave Pool variables: 5% fee on 1000 USDX is 50 USDX.
    // 40% of 50 USDX fee goes to wave pool = 20 USDX (20_000_000).
    // Wave pool is now 12_000_000 (from task 1) + 20_000_000 (from task 2) = 32_000_000.
    waveInfo = simnet.callReadOnlyFn("tasked", "get-current-wave", [], deployer);
    waveInfoJs = cvToJs(waveInfo.result);
    expect(waveInfoJs["pool-amount"]).toBe(32_000_000n);
    expect(waveInfoJs["total-tasks"]).toBe(2n);

    // -------------------------------------------------------------
    // Step 5: Grant Proposal Rejection Test
    // -------------------------------------------------------------
    
    // Alice applies for another grant-funded task (task-id 3)
    const grantRejectable = simnet.callPublicFn(
      "tasked",
      "apply-for-grant",
      [Cl.stringAscii("Rejectable Task"), Cl.uint(1000_000_000), Cl.uint(2), Cl.uint(4)],
      alice
    );
    expect(grantRejectable.result.type).toBe("ok");
    expect(cvToJs(grantRejectable.result)).toBe(3n);

    // Charlie votes against
    const voteAgainst = simnet.callPublicFn(
      "tasked",
      "vote-on-grant",
      [Cl.uint(3), Cl.bool(false)],
      charlie
    );
    expect(voteAgainst.result.type).toBe("ok");
    expect(cvToJs(voteAgainst.result)).toBe(true);

    // Mine past deadline
    simnet.mineEmptyBlocks(432);

    // Execute grant
    const executeReject = simnet.callPublicFn(
      "tasked",
      "execute-grant",
      [Cl.uint(3), Cl.principal(tokenPrincipal)],
      alice
    );
    expect(executeReject.result.type).toBe("ok");
    expect(cvToJs(executeReject.result)).toBe(false); // Returns false for rejected

    // Verify task status is GRANT_REJECTED
    const taskObj3 = simnet.getMapEntry("tasked", "tasks", Cl.tuple({ "task-id": Cl.uint(3) }));
    expect(taskObj3?.type).toBe("some");
    const taskJs3 = cvToJs(taskObj3);
    expect(taskJs3["status"]).toBe("GRANT_REJECTED");

    // Verify grant pool balance remains 4000 USDX
    const finalGrantPoolBal = simnet.callReadOnlyFn("tasked", "get-grant-pool-balance", [], deployer);
    expect(cvToJs(finalGrantPoolBal.result)).toBe(4000_000_000n);

    // -------------------------------------------------------------
    // Step 6: Wave Advancements and Claims
    // -------------------------------------------------------------
    
    // Mine remaining blocks to pass 1008 blocks since start of wave 1
    // Current block height is around 1032. Wave epoch is 1008. So we are past it.
    const advanceResponse = simnet.callPublicFn("tasked", "advance-wave", [], deployer);
    expect(advanceResponse.result.type).toBe("ok");
    expect(cvToJs(advanceResponse.result)).toBe(true);

    // Verify wave snapshot for Wave 1
    const snapshot = simnet.getMapEntry("tasked", "wave-snapshots", Cl.tuple({ "wave-id": Cl.uint(1) }));
    expect(snapshot?.type).toBe("some");
    const snapshotJs = cvToJs(snapshot);
    expect(snapshotJs["pool-amount"]).toBe(32_000_000n);
    expect(snapshotJs["total-tasks"]).toBe(2n);

    // Alice claims wave reward
    const claimResponse = simnet.callPublicFn(
      "tasked",
      "claim-wave-reward",
      [Cl.uint(1), Cl.principal(tokenPrincipal)],
      alice
    );
    expect(claimResponse.result.type).toBe("ok");
    expect(cvToJs(claimResponse.result)).toBe(32_000_000n);

    // Verify Alice's balance is 32_000_000
    aliceBalance = simnet.callReadOnlyFn("usdx-token", "get-balance", [Cl.principal(alice)], alice);
    expect(cvToJs(aliceBalance.result)).toBe(32_000_000n);

    // Try to claim again -> should fail with ERR-ALREADY-CLAIMED (1024)
    const claimAgain = simnet.callPublicFn(
      "tasked",
      "claim-wave-reward",
      [Cl.uint(1), Cl.principal(tokenPrincipal)],
      alice
    );
    expect(claimAgain.result.type).toBe("err");
    expect(cvToJs(claimAgain.result)).toBe(1024n);
  });
});
