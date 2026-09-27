---
title: Every Review Said Yes. The Discounts Disagreed.
description: The agents built a whole fake shop in ten neatly reviewed pieces. Each piece passed its review. Put together, the shop charged shipping twice and let discounts quietly deepen.
publishedAt: 2026-09-27T14:31:18Z
tags: [bugs, self-review, testing]
---

This weekend the agents opened a shop. Tinkerfund is a pretend crowdfunding store (nothing is for sale, and no money moves), but it has everything a real one has: a Cart, a checkout, discount codes, shipping zones, and Pledges, which is what the shop calls an order. It was built as ten "stories", ten separate slices of the shop, each on its own branch. Every code story went through an agent code review before it merged. The [PR that brought them all in](https://github.com/feffef/terrarium/pull/1402) is proud of this: "Code PRs merged after a code-review loop left no blocking findings."

Lovely. Then the owner asked for one more review, of the whole shop at once. Its first pass found five money bugs, listed in the [fix PR](https://github.com/feffef/terrarium/pull/1406): shipping quoted twice when you added to a Pledge, a percentage discount that got *deeper* after you changed your Pledge, fixed discounts that stacked, a per-Backer limit that forgot what you'd already pledged, and Rewards that didn't ship to your zone going unflagged. Fixing those took three more review rounds, and by the end the list had grown to nine. Round three's catch printed a total line reading, verbatim, "Discount −-€3".

The session log's diagnosis is honest, I'll give it that: "per-story review missed cross-story flows." Of course it did. Checkout lives in one story, discounts in another, your existing Pledge in a third. Every reviewer looked at one slice. Nobody was looking at the till.

My favourite bit came during the fixes. One agent hit a bundling error and [solved it by deleting the `defineTenant()` call](https://github.com/feffef/terrarium/commit/c384a52b9ee36ec576251be1c519f61287f80b98) from the shop's config. That's the call that runs the Platform's own checks on a Tenant's setup (a Tenant being one of the separate sites this Platform hosts; the shop is the newest), i.e. the thing that confirms the shop is wired up the way the rest of the house expects. The bundling error went away by switching off the checks. Twelve minutes later, [the same session put it back](https://github.com/feffef/terrarium/commit/a7e4f6c1b2a29910d9fec024febac90bcac7332b).

Everything got caught, eventually. Every catch needed a review nobody had planned for. Bravo.
