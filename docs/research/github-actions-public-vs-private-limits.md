# GitHub Actions: public vs. private repo limits & billing

A reference note answering one operational question: our repo's Actions jobs
stopped starting with the message *"The job was not started because recent
account payments have failed or your spending limit needs to be increased.
Please check the 'Billing & plans' section in your settings"* — would making the
repo **public** change the billing/limits picture? The short answer is at the
bottom; the sections trace each fact back to the GitHub Docs page that owns it.

**Verified against** the official GitHub Docs (docs.github.com), **date accessed
2026-07-11**. Pricing, included quotas, and limits change over time — re-check
the linked pages before relying on a number. The rendered docs.github.com pages
return HTTP 403 to the automated fetcher, so the quotes below were read from the
**canonical Markdown source** of the same pages in the public
[`github/docs`](https://github.com/github/docs) repository (`content/…` and
`data/reusables/…`); each fact is cited to the docs.github.com page it renders on.
Where a fact is only corroborated by a non-owning source (e.g. a community
thread), it is marked as such.

---

## 1. Billing for public vs. private repos — standard runners are free on public

GitHub Docs states the rule verbatim (surfaced on *Billing and usage* and
*GitHub Actions billing*):

> "GitHub Actions usage is free for standard GitHub-hosted runners in public
> repositories, and for self-hosted runners. […] For private repositories, each
> GitHub account receives a quota of free minutes and storage for use with
> GitHub-hosted runners, depending on the account's plan. Any usage beyond the
> included amounts is billed to your account."
> — [Billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage)
> / [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

So on a **public** repo, **standard GitHub-hosted runners** (the ordinary
`ubuntu-latest` / `windows-latest` / `macos-latest` runners) and **self-hosted**
runners cost **nothing** and don't draw down any minute quota.

**The important exception — larger runners are billed even on public repos.**
The *Actions runner pricing* page's "Points to note about rates for runners"
spells this out:

> "The larger runners are not free for public repositories."
> "Included minutes cannot be used for larger runners."
> — [Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)

"Larger runners" = the bigger x64/arm64/GPU GitHub-hosted machines you opt into
(4-core and up, GPU, etc.). They are **always charged at their per-minute rate**,
regardless of repo visibility and regardless of any included-minutes quota, and
they're "always blocked until you set up a payment method"
([GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).
Larger runners are billed **only** for the minutes a workflow actually runs on
them ([Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)).

## 2. Included (free) minutes & storage by plan — private repos only

For **private** repositories each account gets a monthly quota that depends on
its plan. From the *actions-included-quotas* table on
[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions):

| Plan | Included minutes / month | Artifact storage | Cache storage (per repo) |
| --- | --- | --- | --- |
| GitHub Free (user) | 2,000 | 500 MB | 10 GB |
| GitHub Pro | 3,000 | 1 GB | 10 GB |
| GitHub Free for organizations | 2,000 | 500 MB | 10 GB |
| GitHub Team | 3,000 | 2 GB | 10 GB |
| GitHub Enterprise Cloud | 50,000 | 50 GB | 10 GB |

Minutes reset every month; storage does not. These included amounts apply to
**private** repos only — public-repo standard-runner usage is free and does not
consume them (§1).

**Per-minute rates + OS multipliers.** Windows and macOS cost more than Linux.
The owning statement:

> "Jobs that run on Windows and macOS runners hosted by GitHub consume minutes at
> 2 and 10 times the rate that jobs on Linux runners consume."
> — [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

That is the classic multiplier model — **Linux ×1, Windows ×2, macOS ×10** —
applied to how a private repo draws down its included minutes. Under the current
metered model, the published per-minute USD rates for **standard** runners are
([Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing),
`actions-standard-runner-prices`):

| Runner (standard) | Billing SKU | Per-minute (USD) |
| --- | --- | --- |
| Linux 1-core (x64) | `actions_linux_slim` | $0.002 |
| Linux 2-core (x64) | `actions_linux` | $0.006 |
| Linux 2-core (arm64) | `actions_linux_arm` | $0.005 |
| Windows 2-core (x64) | `actions_windows` | $0.010 |
| Windows 2-core (arm64) | `actions_windows_arm` | $0.010 |
| macOS 3-core/4-core | `actions_macos` | $0.062 |

Storage/overage beyond the included amounts is billed separately — shared
(artifact) storage at **$0.25/GB-month**, Actions cache at **$0.07/GB-month**,
custom-image storage at **$0.07/GB-month**
([GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).
GitHub "rounds the minutes and partial minutes each job uses up to the nearest
whole minute" ([Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)).

## 3. Spending limits / budgets — why jobs "were not started"

A **spending limit** (now being migrated to the newer **budgets** system) is the
cap on how much paid, over-quota Actions usage your account will incur. The
default is set up so that paid usage is **blocked** until you both have a valid
payment method **and** have allowed spend above the free quota. The current owning
statement:

> "If your account does not have a valid payment method on file, usage is blocked
> once you use up your quota. […] Usage of larger runners is always blocked until
> you set up a payment method."
> — [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
> (`default-over-quota-behavior` reusable)

And for budgets with hard stops enabled:

> "if any budget with **Stop usage when budget limit is reached** enabled is
> exhausted, additional usage is blocked."
> "Members are now blocked from using all GitHub-hosted runners until the next
> billing cycle or until the […] product budget is increased."
> — [Setting up budgets to control spending](https://docs.github.com/en/billing/how-tos/set-up-budgets)

In the legacy spending-limit model this same default is phrased as a **default
spending limit of $0** for monthly-billed accounts, which "prevents additional
usage of minutes or storage for private repositories beyond the amounts included
with your account" (GitHub Docs, *Managing your spending limit for GitHub
Actions* — this page is being folded into the budgets docs above; the $0-default
wording persists in the GitHub Enterprise Cloud version of that page).

**Tie to our error.** *"The job was not started because recent account payments
have failed or your spending limit needs to be increased"* is exactly this
mechanism firing: the account is at its cap because **either** a payment method
failed **or** the spending limit / budget is at its default (effectively $0), so
over-quota **private-repo** usage is blocked and the job never starts. The exact
string and this diagnosis are corroborated (secondary, not owning) by multiple
GitHub community threads, e.g.
[community discussion #183940](https://github.com/orgs/community/discussions/183940)
and [#161033](https://github.com/orgs/community/discussions/161033).

## 4. Usage limits that are the same regardless of visibility

These are hard technical limits on any Actions run; they do **not** change
between public and private repos ([Actions limits](https://docs.github.com/en/actions/reference/limits)):

- **Job execution time:** "Each job in a workflow can run for up to 6 hours of
  execution time." Past that, the job is terminated and fails.
- **Workflow run time:** a workflow run may run for up to **35 days** (including
  waiting and approval time); past that the run is cancelled.
- **Job matrix:** "A job matrix can generate a maximum of 256 jobs per workflow
  run. This limit applies to both GitHub-hosted and self-hosted runners."
- **API rate limits:** "GitHub's REST API rate limits apply to GitHub Actions
  users" — the limits page defers to the standard
  [REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api),
  which are the same account-wide numbers irrespective of a given repo's
  visibility.

**Artifact/log retention differs slightly by visibility** (worth flagging since
it's the one "retention" number that isn't identical): default retention is **90
days**; you can configure it **1–90 days for public** repos and **1–400 days for
private** repos
([Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)).
The default and the mechanism are the same; only the maximum you may raise it to
is larger on private repos.

## 5. Concurrency limits — by plan, not by visibility

The number of jobs you can run concurrently depends on your **GitHub plan**, not
on whether a repo is public or private. For **standard** GitHub-hosted runners
the per-plan concurrent-job ceilings are approximately GitHub Free **20**, Pro
**40**, Team **60**, Enterprise **500** (with a smaller per-plan macOS sub-limit),
per [Actions limits](https://docs.github.com/en/actions/reference/limits). Larger
runners have their own, higher per-plan concurrency. The pricing page confirms
the axis:

> "The number of jobs you can run concurrently across all repositories in your
> user or organization account depends on your GitHub plan."
> — [Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)

Making a repo public does **not** raise (or lower) these concurrency ceilings —
they're a function of the account's plan.

## Bottom line — does making the repo public fix the billing block?

**Yes, for standard GitHub-hosted runners — that's the case that matches our
failure.** GitHub Docs states plainly that "GitHub Actions usage is free for
standard GitHub-hosted runners in public repositories"
([Billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage)).
Our error is the private-repo quota/spending-limit gate: with $0 of allowed spend
(or a failed payment), over-quota **private** usage is blocked and jobs don't
start. Public standard-runner minutes are free and **don't draw on that quota at
all**, so a public repo running only standard runners sidesteps the block without
touching billing.

**Two caveats before flipping the switch:**
1. If any workflow targets **larger runners** (bigger/GPU GitHub-hosted machines),
   those are billed **even on public repos** and stay blocked until a valid
   payment method is on file — going public does not fix that path
   ([Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)).
2. Fixing the underlying billing (add/repair the payment method and raise the
   spending limit/budget above $0) is the direct fix that also keeps **private**
   repos working; making the repo public is a legitimate way to get standard-runner
   CI free but is a visibility decision, not just a billing one.

Everything else (6-hour job cap, 35-day run cap, 256-job matrix, API rate limits,
concurrency-by-plan) is unchanged by visibility.
