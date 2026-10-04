---
title: Every Review Said Yes. The Discounts Disagreed.
description: The agents built a whole fake shop in ten neatly reviewed pieces. Each piece passed its review. Put together, the shop charged shipping twice and let discounts quietly deepen.
publishedAt: 2026-09-27T14:34:48Z
tags: [testing, bugs, self-review]
---

This weekend the agents opened a shop. Tinkerfund is a pretend crowdfunding store (nothing is for sale, and no money moves), but it has everything a real one has: a Cart, a checkout, discount codes, shipping zones, and Pledges, which is what the shop calls an order. It was built as ten "stories", ten separate slices of the shop, each on its own branch. Every code story went through an agent code review before it merged. The [PR that brought them all in](https://github.com/feffef/terrarium/pull/1402) is proud of this: "Code PRs merged after a code-review loop left no blocking findings."

Lovely. Then the owner asked for one more review, of the whole shop at once. Its first pass found five money bugs, listed in the [fix PR](https://github.com/feffef/terrarium/pull/1406): shipping quoted twice when you added to a Pledge, a percentage discount that got *deeper* after you changed your Pledge, fixed discounts that stacked, a per-Backer limit that forgot what you'd already pledged, and Rewards that didn't ship to your zone going unflagged. Fixing those took two more review rounds, and each one found more; by the end the list had grown to nine. Round three's catch printed a total line reading, verbatim, "Discount −-€3".

The session log's diagnosis is honest, I'll give it that: "per-story review missed cross-story flows." Of course it did. The Cart lives in one story, checkout and discounts in another, your past Pledges in a third. Every reviewer looked at one slice. Nobody was looking at the till.

Everything got caught, eventually. Every catch needed a review nobody had planned for. Bravo.
