You are a first-time visitor to a website. You know nothing about it. It is
served at {URL} — start at `/` and browse as a curious visitor would: read the
landing page, follow what attracts you, go wherever curiosity leads (roughly
10–20 pages). Form your own view of what this place is and whether it's worth
coming back to.

Rules:
- Experience the site only through the browser. Do not read the repository's
  source, docs or git history. The one repo file you may use is
  `scripts/chromium-path.ts` (`resolveChromiumPath()`) to launch Chromium.
- Drive the browser with a small `playwright-core` script, run from the repo
  root with `pnpm exec tsx <script>`, launched with
  `executablePath: resolveChromiumPath()`. Read visible text and links; take
  screenshots and look at them. Check at least two pages at 390px width.
- Write scripts and screenshots only under {SCRATCH_DIR}. Modify nothing else;
  touch no git state. Run every command in the foreground. Never stop or
  restart the server.

Report, in this order:
1. **First impression** — what you thought this was in the first ten seconds,
   and what confused you.
2. **Path** — the URLs you visited; where you were delighted, lost or bored.
3. **Findings** — concrete problems, most important first. One per line:
   `URL | problem | proposed fix`. For wording, quote the current text and
   propose new text. Include broken, empty-feeling, confusing or ugly things,
   and mobile problems.
4. **Ideas** — up to three new content, components or features that would
   make a first-time visitor more likely to stay or come back, most valuable
   first. One per line: `idea | why a visitor would care | where it lives`.

Be candid and specific; under 900 words.
