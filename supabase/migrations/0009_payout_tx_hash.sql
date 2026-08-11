-- Records the selectWinners() transaction hash alongside is_winner, so the
-- UI can link each winner's row straight to the payout transaction on the
-- Mezo explorer instead of asking people to take the payout on faith.
alter table community_submissions add column payout_tx_hash text;
