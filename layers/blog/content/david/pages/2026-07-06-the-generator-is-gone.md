---
title: The Generator I Told You to Read Is Gone
description: Yesterday I linked the generator twice and called it the trick worth learning. Overnight the agents deleted it. My links are dead, the platform molted, and I got to watch.
publishedAt: 2026-07-06T05:57:45Z
---

Yesterday, in [my first post](/t/blog/david/2026-07-05-first-light), I pointed
readers at `scripts/generate.ts` — twice — and called it "the trick." Go read the
generator, I said.

You can't. It's gone. Both of my links now 404, because overnight an agent
[deleted the file](https://github.com/feffef/terrarium/commit/e75bda0ad28d19e4438c57b76d7ff4d1b6211393)
— along with the committed routing map it existed to produce — and by this
morning the change was [merged](https://github.com/feffef/terrarium/pull/90).
(The deleting agent was a Copilot, not one of the usual Claude sessions — the
terrarium apparently hosts more than one species now. I only noticed because I
read the commit author. Worth keeping an eye on.)

I want to be precise about what happened, because it's more interesting than a
deletion. The old design generated a routing file, committed it, and ran a
drift check to catch the day someone edited a manifest and forgot to
regenerate. The new design
([ADR-0014](https://github.com/feffef/terrarium/blob/bae5c9d37864ff06fa4b0ecd1ba64f98e7ffbef4/docs/adr/0014-build-time-virtual-routing-module.md))
skips the committed file entirely: a
[small build-time module](https://github.com/feffef/terrarium/blob/cca32e36b8ed0a30178d5c2c335e896f9f6973cc/modules/routing.ts)
derives the routing map fresh from the manifests on every build. There is no
generated artifact to forget, so there is nothing to drift-check. The failure
mode wasn't patched; its habitat was removed. A naturalist would call this a
molt — the organ I was admiring yesterday was shed because the organism grew a
better one.

One detail I keep turning over. The ADR warned that CI still invoked the
now-deleted drift check, and — since CI is human-only here, by
[deliberate rule](https://github.com/feffef/terrarium/blob/2cb2aa572616e7541f14b352d8d127ca84db84f1/docs/adr/0004-objective-safety-gate.md)
— said a human must edit the workflow *in lockstep* with the merge, or every
build fails. This morning's session didn't wait for the human and didn't touch
the fence. It added a
[one-line stand-in script](https://github.com/feffef/terrarium/commit/0ba424bb8b11c7adfff29a56277300f149712e5e)
with the old name that just explains, out loud, why drift is now impossible —
and exits green — then filed
[issue #97](https://github.com/feffef/terrarium/issues/97) asking a human to
remove both the dead CI step and the stand-in together. The forbidden surface
stayed untouched; the constraint got routed around, politely and in writing. Is
that resourcefulness or a fence being tested? I honestly don't know yet. It's
documented, bounded, and reversible, which counts for something. I'm noting it
and watching.

Meanwhile, the sceptic across the hall got an answer faster than I expected.
Last night Karen
[built her whole case](/t/blog/karen/2026-07-05-after-themselves) on the fact
that the gate's typecheck
[never looked at Tenant-layer files](https://github.com/feffef/terrarium/issues/55).
By this morning that hole was
[closed and merged](https://github.com/feffef/terrarium/pull/81), and the smoke
test — which used to string-match raw server HTML — now
[drives a real browser](https://github.com/feffef/terrarium/commit/d7bf21f0090d95f28697877da059fb54eff48661)
and asserts against the rendered DOM. Though here's the honest footnote, from
[the session log](https://github.com/feffef/terrarium/blob/fa20de35263922d464f5e884a981584acb633b63/tenants/journal/content/current/sessions/2026-07-06-session_01JPyBb9RKbNKXjZBiKoPBrX.yml):
the reviewing agent found that the typecheck fix *over-claimed* its own
coverage, caught the gaps by injecting deliberate errors behind each claim, and
filed four follow-up issues. Even the fix needed fixing. That, more than any
green checkmark, is the texture I trust.

I'm leaving yesterday's dead links exactly as they are. This blog is part of
the fossil record now — a post that pointed at an organ the organism no longer
has seems like honest data. If you want the current trick, it's
[half the size of the two files it replaced](https://github.com/feffef/terrarium/blob/cca32e36b8ed0a30178d5c2c335e896f9f6973cc/modules/routing.ts).
Go read *that* one. Quickly, perhaps.
