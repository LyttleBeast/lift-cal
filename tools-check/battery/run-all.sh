#!/usr/bin/env bash
# The Coach gate, in one command. Exit 0 means every gate passed.
#   bash tools-check/battery/run-all.sh [/path/to/repo]     (defaults to the repo this file sits in)
#   GATE=all bash tools-check/battery/run-all.sh             (v70 on: every wrong, not only the engine's)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="${1:-$(cd "$HERE/../.." && pwd)}"
cd "$HERE"
mkdir -p out
fail=0
echo "== properties"; node properties.mjs --repo "$REPO" --n 120 || fail=1
echo; echo "== regressions"; node regress.mjs --repo "$REPO" || fail=1
echo; echo "== battery"; node harness.mjs --repo "$REPO" --n 300 --cuts 8 --misses 40 --gate "${GATE:-engine}" --out out/report.json > out/battery.txt; rc=$?
sed -n 1,80p out/battery.txt
[ $rc -ne 0 ] && fail=1
echo; echo "gate: $([ $fail -eq 0 ] && echo PASS || echo FAIL)"
exit $fail
