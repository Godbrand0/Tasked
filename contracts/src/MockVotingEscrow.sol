// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test double for Mezo's Tigris IMezoVotingEscrow (veBTC). Tracks a
/// checkpoint history per NFT so getPastVotes can be exercised the same way
/// the real contract is used in voteOnGrant — a fixed snapshotTimestamp that
/// must resolve to the ownership/weight as of that moment, not live state.
contract MockVotingEscrow {
    struct Checkpoint {
        uint256 timestamp;
        address owner;
        uint256 weight;
    }

    mapping(address => uint256[]) private _tokensOf;
    mapping(uint256 => Checkpoint[]) private _checkpoints;

    function mint(address to, uint256 tokenId, uint256 weight) external {
        _tokensOf[to].push(tokenId);
        _checkpoints[tokenId].push(Checkpoint({timestamp: block.timestamp, owner: to, weight: weight}));
    }

    /// @dev Simulates a re-lock that changes an NFT's weight in place
    /// (ownership unchanged) — used to test that a vote cast under a fixed
    /// snapshotTimestamp still resolves to the weight as of that snapshot,
    /// not whatever the position has grown/shrunk to by vote-cast time.
    function reweight(uint256 tokenId, uint256 newWeight) external {
        address owner = _checkpoints[tokenId][_checkpoints[tokenId].length - 1].owner;
        _checkpoints[tokenId].push(Checkpoint({timestamp: block.timestamp, owner: owner, weight: newWeight}));
    }

    function transfer(uint256 tokenId, address to) external {
        address from = _checkpoints[tokenId][_checkpoints[tokenId].length - 1].owner;
        uint256[] storage arr = _tokensOf[from];
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == tokenId) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }
        _tokensOf[to].push(tokenId);
        uint256 weight = _checkpoints[tokenId][_checkpoints[tokenId].length - 1].weight;
        _checkpoints[tokenId].push(Checkpoint({timestamp: block.timestamp, owner: to, weight: weight}));
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _tokensOf[owner].length;
    }

    function ownerToNFTokenIdList(address owner, uint256 index) external view returns (uint256) {
        return _tokensOf[owner][index];
    }

    function getPastVotes(address account, uint256 tokenId, uint256 timestamp) external view returns (uint256) {
        Checkpoint[] storage cps = _checkpoints[tokenId];
        if (cps.length == 0) return 0;

        uint256 lo = 0;
        uint256 hi = cps.length;
        while (lo < hi) {
            uint256 mid = (lo + hi) / 2;
            if (cps[mid].timestamp <= timestamp) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        if (lo == 0) return 0;

        Checkpoint storage cp = cps[lo - 1];
        return cp.owner == account ? cp.weight : 0;
    }
}
