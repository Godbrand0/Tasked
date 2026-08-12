-- Records the approveAndRelease() transaction hash once a creator approves
-- a Development task, so the payout can be verified directly on the
-- explorer — same idea as community_submissions.payout_tx_hash.
alter table task_submissions add column payout_tx_hash text;
