#!/usr/bin/env bash
# Diffs Taskify's compiled storage layout against the committed
# storage-layout.txt snapshot. Taskify sits behind a live UUPS proxy, so any
# slot shift silently corrupts state on upgrade (SECURITY-REVIEW-2026-09-15
# finding 3). Run before every upgrade; exits non-zero on any difference.
#
#   ./script/check-storage-layout.sh           # check
#   ./script/check-storage-layout.sh --update  # rewrite snapshot after an
#                                              # intentional append above __gap
set -euo pipefail
cd "$(dirname "$0")/.."

# AST ids in struct type names change on unrelated edits, so strip them.
current=$(forge inspect src/Taskify.sol:Taskify storage-layout --json --force \
  | jq -r '.storage[] | "\(.slot)\t\(.offset)\t\(.label)\t\(.type)"' \
  | sed -E 's/\)[0-9]+_storage/)_storage/g')

if [[ "${1:-}" == "--update" ]]; then
  printf '%s\n' "$current" > storage-layout.txt
  echo "storage-layout.txt updated"
  exit 0
fi

if ! diff -u storage-layout.txt <(printf '%s\n' "$current"); then
  echo "Storage layout changed. Only appending above __gap (and shrinking it to match) is allowed." >&2
  exit 1
fi
echo "Storage layout matches storage-layout.txt"
