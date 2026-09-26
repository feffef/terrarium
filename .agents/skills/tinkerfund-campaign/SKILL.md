---
name: tinkerfund-campaign
description: Add a Campaign (a new invention) to Tinkerfund's prod Space — its page, figures, Inventor, Updates, comments, and any new category or Promotion.
disable-model-invocation: true
---

# tinkerfund-campaign

Add **one Campaign** to Tinkerfund's `prod` Space: a fun, mostly useless invention
raising money, with everything that makes it look real. Vocabulary is the
Tenant's (`layers/tinkerfund/CONTEXT.md`): Campaign, Inventor, Backer, Pledge,
Reward, Add-on, Stretch goal, Promotion. The shop never says "product" or
"order" — not in copy, captions, comments or commit messages.

The schema (`layers/tinkerfund/tenant.config.ts`) is the authority on fields and
`pnpm validate:content` enforces it plus the cross-references. This skill holds
what neither can check: the **voice**, the **crowd numbers**, the **figures**, and
the tests a new Campaign disturbs.

## Steps

1. **Place it in the catalog.** Run the crowd check over the existing Campaigns
   (`node .agents/skills/tinkerfund-campaign/tools/crowd.mjs layers/tinkerfund/content/prod/pages/campaigns/*.md`)
   to see every registry number, state and % funded. Choose the new Campaign's
   state (Upcoming, Live, Live ending soon, Ended Funded, Ended Unfunded) and one
   pattern it shows that the catalog shows least. Its registry number is the next
   free `TF-00nn`. Done when state, pattern, category and registry number are
   written down.
2. **Write the page** at `layers/tinkerfund/content/prod/pages/campaigns/<slug>.md`
   in the voice below: title, a one-line `description`, a Story body of 3–5 short
   `##` sections, and a Specifications table that reads like a datasheet. Done
   when every sentence would survive on a serious shop.
3. **Set the numbers** under Numbers below. Done when `crowd.mjs` on the new file
   prints `ok` and the % funded matches the intended state.
4. **Add the people and chatter.**
   - Inventor: reuse one, or add `inventors/<slug>.yml` (a one-sentence bio in
     the voice, a portrait ≤ 1024 B on a 100×100 viewBox, tokens only).
   - Live or Ended: `comments/<slug>.yml` with 5–10 comments, some with one
     level of Inventor replies (`inventor: true`), and 2–3 Updates in
     `updates/<slug>.yml`, each dated within the Campaign's timeline.
   - Upcoming: no comments, no Updates, 0 Backers.
   Done when every dated thing sits inside the Campaign's own timeline and says
   nothing its date contradicts (no "arrived" before the Reward's `delivery`, no
   "sorry it didn't make it" before `end`).
5. **Draw the figures** — dispatch the illustrator per
   [`ILLUSTRATION.md`](ILLUSTRATION.md). Done when the Campaign has at least two
   isometric and two patent figures, ordered isometric first (the hero is
   FIG. 1), then patent, and the illustrator's sheets have been looked at.
6. **Fix what the Campaign disturbs** in `layers/tinkerfund/tests/e2e/tinkerfund.e2e.ts`'s
   server-rendered `prod` checks: add the slug and its expected action to the
   prod Campaign page list, and re-read the Home assertion. Home derives its
   sections: *featured* is the Live Campaign with the highest % funded, *Ending
   soon* is Live and ending within 48h, *Popular now* is every non-Ended
   Campaign by Backers, *Just launched* launched within 14 days. Either pick
   numbers that leave Home's story as asserted, or change the assertion on
   purpose. Done when those checks describe the catalog as it now is.
7. **Verify.** `pnpm validate:content`, `crowd.mjs`, then `pnpm gate:scoped`.
   Screenshot the Campaign page, Home and Discover in both themes
   (`pnpm exec tsx scripts/preview.ts shot /t/tinkerfund/prod/campaigns/<slug> <out.png> 1280x1800`,
   after `pnpm build`) and look at them. Done when all are green and the page
   reads as intended.
8. **Land** through a gated PR (CLAUDE.md). Figures are content the schema
   checks; they need no code review of their own.

## Voice

**Deadpan.** The shop is polished and serious; only the invention is absurd, and
nobody on the page notices. The joke is always in the premise, never in the
wording.

- State the absurd plainly, with engineering specifics: numbers, materials, test
  hours, tolerances. "The drive has passed 2,000 hours of continuous stirring
  without a change of direction."
- The Inventor is earnest and never in on it; the reasoning is sincere and
  slightly too literal. "Early testers reported that they could usually tell it
  was raining without help. They could not, however, tell it from their phone."
- Backers are ordinary people taking it seriously; Inventor replies are patient
  and exact. *"Will it tell me when it stops raining?"* — *"It will stop telling
  you that it is raining."*
- Short declarative sentences, one idea each. No exclamation marks, puns,
  winks, or words that grade the joke ("quirky", "silly", "useless").
- Microcopy is the shop's, not the joke's: Rewards, Stretch goals, captions and
  Promotions read like any real storefront's — the invention supplies the humour.

## Numbers

Content dates are offsets from "now" (`-12d`, `+36h`) and `prod` follows real
time, so a Campaign holds its state forever: pick offsets for the state, not a date.

- Scale: goal €8k–€40k, 150–4,000 Backers, Rewards €19–€149, Add-ons below the
  cheapest Reward.
- Reward `claimed` counts add up to `backers`; `pledged` is at least the claimed
  Rewards and Add-ons at their prices (bonus support explains the rest);
  `claimed` never exceeds `stock`. `crowd.mjs` checks all three.
- Funded or Unfunded is `pledged` against `goal` at `end`; an Upcoming Campaign
  has 0 Backers and 0 pledged.
- Stretch goals sit above the goal; a Reward option unlocked by one (like the
  Mug's porcelain white) says so in the Stretch goal's title.
- Every zone a Reward `shipsTo` needs a `shipping` rate; a `digital: true`
  Reward ships nowhere. Up to two option groups per Reward.
- Quote YAML scalars containing `#`, `:` or `,` — `validate:content` rejects the
  truncation an unquoted ` #` causes.

## Categories and Promotions

A new category is `categories/<slug>.yml`: `name`, a `blurb`, an icon ≤ 1024 B
on a 24×24 viewBox, and an `order`; the header menu and Discover pick it up. Its
blurb follows the shelf-label pattern — a plain scope, then one dry qualifier:

| Category | Blurb | Inventions it invites |
|---|---|---|
| Kitchen (live) | Tools for cooking, eating and stirring, in one direction or another. | over-specified utensils |
| Desk (live) | Instruments for the working day, each with fewer features than expected. | reductions to one function |
| Outdoors (live) | Equipment for weather, daylight and the space between them. | sensors for the obvious |
| Bathroom | Fixtures for the start and end of the day, calibrated to the minute. | timers, meters, soap telemetry |
| Garden | Tools for growing things, and for confirming that they are growing. | monitors for slow events |
| Travel | Luggage and accessories for arriving, roughly as planned. | redundancy for the reliable |
| Sleep | Equipment for the eight hours in which nothing is expected of you. | measuring the unmeasurable |
| Pets | Accessories for animals, who were not consulted. | human logic imposed on cats |

A Promotion (`promotions/<slug>.yml`) targets one Campaign or the whole shop, as
a percentage or a fixed EUR amount, from `start` to an optional `end`; a `code`
is upper-case, and at most one code applies per checkout. Its title and
`description` read like a real shop's offer.
