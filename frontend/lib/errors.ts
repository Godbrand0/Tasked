import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

// Friendly copy for Taskify.sol's custom errors — shown instead of the raw
// "execution reverted: NotApprovedVoter()" viem produces. Wording is a first
// pass; tweak freely, this is the only place it lives.
const KNOWN_CONTRACT_ERRORS: Record<string, string> = {
  AlreadyApplied: "You've already applied to this task.",
  AlreadyClaimed: "This reward has already been claimed.",
  AlreadyVoted: "You've already voted on this proposal.",
  CooldownActive: "You can only update your experience tier once a day.",
  DeadlineNotPassed: "This task's deadline hasn't passed yet.",
  DeadlinePassed: "This task's deadline has already passed.",
  DuplicateWinner: "The same winner was selected more than once.",
  ExperienceMismatch: "Your experience tier doesn't match what this task requires.",
  InsufficientFunds: "There aren't enough funds available for this action.",
  InvalidAmount: "That amount isn't valid — check the minimum and try again.",
  InvalidAssignee: "That wallet isn't the assignee for this task.",
  InvalidDuration: "That work duration is outside the allowed range.",
  InvalidExperience: "That experience level isn't valid.",
  InvalidOwner: "That address can't be set as the owner.",
  InvalidRole: "That role isn't valid for registration.",
  InvalidStatus: "This task isn't in the right state for that action.",
  InvalidToken: "That token isn't supported — use MUSD or MEZO.",
  InvalidTreasury: "That address can't be set as the treasury.",
  InvalidWave: "This wave can't be claimed yet.",
  InvalidWinnerCount: "That winner count isn't valid for this task.",
  NoReward: "There's no reward available to claim.",
  NoStake: "You need real voting weight to do that.",
  NotApplied: "You haven't applied to this task.",
  NotApprovedVoter: "You're not on the approved voter list yet.",
  NotAuthorized: "You're not authorized to do that.",
  NotStranded: "These funds aren't stranded — nothing to claim.",
  TaskKindMismatch: "That action doesn't apply to this kind of task.",
  TaskNotFound: "That task doesn't exist.",
  UserAlreadyRegistered: "This wallet is already registered.",
  UserNotRegistered: "You need to register before doing that.",
  VotingClosed: "Voting has closed for this proposal.",
  VotingOpen: "Voting is still open for this proposal.",
  WaveNotFinished: "This wave hasn't finished yet.",
  WinnerNotJoined: "That address never joined this task.",
};

// Turns a thrown error from a contract write (wagmi's writeContractAsync,
// via viem) into a short, user-facing sentence. Contract writes always throw
// real viem BaseError instances, not plain Error — so a bare
// `err instanceof Error` check always matches and always shows the raw,
// multi-line RPC/revert string. This walks the error chain for a decoded
// Solidity custom error first, falls back to viem's own human summary, and
// only reaches `fallback` for something truly unrecognized.
export function formatContractError(err: unknown, fallback: string): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return "Transaction cancelled.";
    }

    const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const name = revertError.data?.errorName;
      if (name && KNOWN_CONTRACT_ERRORS[name]) return KNOWN_CONTRACT_ERRORS[name];
    }

    return err.shortMessage || fallback;
  }

  if (err instanceof Error && err.message && err.message.length < 160 && !err.message.includes("0x")) {
    return err.message;
  }

  return fallback;
}
