#!/bin/sh
# Standard `.claude/settings.json` wiring for a FAIL-CLOSED `PreToolUse` guard
# (issue #1223). `runIfMain` (`guard-io.ts`) only fail-closes a crash INSIDE its
# own try/catch; a crash before that point — `pnpm exec tsx` failing to cold
# start, a module-resolution error, a throw during import/top-level evaluation
# — exits nonzero with no stdout at all. The old wiring, "<guard> || true",
# swallowed that exit code, so the harness saw the hook "succeed" with no
# deny-JSON and read that as an implicit allow: a fail-closed guard failing
# open on its own crash (confirmed live, session_01BAp91Z4KzsPjPtdSuqmqxL).
#
# This wrapper runs the guard command given after `--`, unmodified, with the
# hook's stdin passed straight through and its stdout captured. Two cases:
#   - exit 0 (main() ALWAYS exits 0 — the deny/allow decision travels only in
#     stdout, per every guard's own header): print whatever the guard printed,
#     byte for byte. A clean allow (nothing) stays nothing; a clean deny (its
#     own JSON) is untouched.
#   - nonzero exit AND no stdout: the guard crashed before it could reach its
#     own fail-closed try/catch. Synthesize the same `buildDenyOutput` shape
#     the guard would have emitted, naming it as this wrapper's own doing so
#     it's never mistaken for the guard's real predicate firing.
# A nonzero exit that DID print something is left alone (print it as-is) —
# that shape isn't produced by any current guard, so there's nothing to guess
# at synthesizing beyond what's already there.
#
# This wrapper itself always exits 0: the whole point is that the settings.json
# entry no longer needs `|| true` layered on top (which would only reintroduce
# the same swallow-and-allow risk one level up, for `sh`/this file itself
# rather than the wrapped guard). Never wire `deferred-tool-guard.ts` through
# this — it is deliberately fail-OPEN (`guard-io.ts`'s `failOpen: true`) and
# must keep its existing bare `|| true` wiring.
#
# Usage:
#   sh scripts/guard-wrap.sh <guard-name> -- <guard command...>
#
# Manual probe (paste both into a PR touching this file — a shell-boundary
# behavior a unit test can't fully observe, per docs/agents/guards.md):
#   printf '{}' | sh scripts/guard-wrap.sh test-guard -- sh -c 'exit 0'
#   printf '{}' | sh scripts/guard-wrap.sh test-guard -- sh -c 'exit 1'
set -u

guard_name=$1
shift
[ "${1:-}" = "--" ] && shift

out=$("$@")
status=$?

if [ "$status" -ne 0 ] && [ -z "$out" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked by scripts/guard-wrap.sh (issue #1223): the %s guard process exited %s with no output, before it could reach its own fail-closed try/catch (runIfMain, guard-io.ts) — e.g. a tsx cold-start or module-load-time crash, not a genuine allow decision. The guard fails CLOSED. This is a guard fault, not an authoring mistake — report it rather than working around it."}}' "$guard_name" "$status"
else
  printf '%s' "$out"
fi

exit 0
