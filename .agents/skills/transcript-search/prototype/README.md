# PROTOTYPE: transcript-search shape (#2296)

Throwaway, never merged. It answers "What shape should the transcript-search
Skill take?" The verdict is on the issue.

- `transcript.prototype.ts`: the filter. It reads saved `list_events` pages,
  writes a flattened transcript (one line per event, oldest first, images
  dropped) and answers `read-check` or `dispatches` within the context cap,
  with a `COVERAGE` and a `NEXT` line. Any other question name only flattens.
- `recipe.prototype.md`: the budgeted tier. One subagent loops fetch, script,
  `NEXT`.

## Full tier, as run on 2026-10-19

On session_01DNheR1… (4.9 h, 91 pages, 9,088 events):

1. A Haiku walker calls `list_events` with limit 100, `kinds:["keep_alive"]`
   and `before_id` chaining, writing `first_id last_id has_more` per page.
   That took 91 calls, 6 min and 125k tokens.
2. Split the cursors into 4 ranges: page 1 has no cursor, and page i uses
   page i-1's `first_id`. Four parallel Haiku fetchers each fetch their range
   unfiltered and write the saved paths to a manifest. That took 26–118 s and
   about 74k tokens each, with 0 pages inline.
3. `transcript.prototype.ts flatten --budget 999 <all pages>` turned 15.8 MB
   of pages into a 4.7 MB flat file in 1.8 s.

The sequential chain (Haiku links of 20 pages handing on the cursor) ran at
about 6.5 s per page. On link 3 the server once returned an earlier page for
a correct `before_id`; a repeat call returned the right page. The chain took
that as a loop and stopped. So check that each `first_id` is new, and retry
once if it isn't.
