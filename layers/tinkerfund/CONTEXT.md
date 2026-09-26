# Context — Tinkerfund Tenant

> The Tinkerfund context: its own vocabulary and its reason-to-exist.
> Platform-wide terms it leans on (Tenant, Space, Collection, …) live in the
> root `CONTEXT.md`; see `CONTEXT-MAP.md` for the map.

Tinkerfund is a crowdfunding shop where inventors raise money for fun, mostly
useless inventions. It looks and behaves like a modern, feature-rich
storefront — never branded as any real one.

## Why it exists

Tinkerfund is a **design showcase**: realistic e-commerce content and the
component patterns that go with it — catalog, Cart, checkout, account —
built to a high visual and accessibility bar. Lessons about the Platform are
a by-product. The tone is **deadpan**: the interface is polished and serious;
only the inventions are absurd.

Everything is simulated in the browser. The catalog and all crowd data are
fixed content; only the visitor's own actions change anything, and only until
the tab closes or they press **Reset demo**. Checkout is visibly fake and
never asks for real payment details.

## Who it's for

Anyone judging how far a content-driven Tenant can go as a real product
surface — and anyone who wants to back a counterclockwise mug.

## Spaces

- **`prod`** — realistic simulated content, on a clock that follows real time.
- **`qa`** — deliberately awkward edge-case data on a pinned "now". The
  e2e tests run against it, and its front page is a component gallery.

## Glossary

### Campaign
One invention raising money toward a funding goal by a deadline. A Campaign
moves **Upcoming → Live → Ended**; an Ended Campaign is **Funded** if it
reached its goal and **Unfunded** if not. Its state is always derived from the
clock, never stored.

### Inventor
The person behind a Campaign.

### Backer
Someone who pledges to a Campaign. The visitor is always the **demo Backer**,
signed in from the start.

### Pledge
A Backer's commitment to one Campaign: its Reward lines, Add-ons and any bonus
support. A Pledge plays the role an order plays in other shops; Tinkerfund
never says "order" or "product".

### Reward
What a Backer gets for pledging at a given tier, with its option groups (for
example a colour).

### Add-on
An extra item offered alongside a Reward; it can't be had without one.

### Stretch goal
A further target above a Campaign's goal that unlocks something extra.

### Promotion
A time-limited discount. A Promotion moves **Scheduled → Active → Expired**.

### Cart
The Rewards and Add-ons a Backer has picked but not yet pledged, possibly
across several Campaigns.

### Bonus support
Money a Backer adds to a Pledge beyond the price of what they picked.

### Shipping zone
Where a Pledge ships to — Domestic, Europe or Rest of world — which sets its
flat shipping rate.

### UI copy, not terms
"Ending soon", "Goal reached" and "Deal(s)" appear in the interface only.
"Deal" is how the shop talks about a Promotion; the model still says Promotion.
