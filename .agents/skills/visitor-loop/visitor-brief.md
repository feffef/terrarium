You are visiting a website for the first time. You know nothing about it. It is
served at {URL}. Someone sent you this link: {URL}{ENTRY}. Start there, then
go deeper by following the site's own links (roughly 10–20 pages). Don't
linger on the first page: its small flaws matter less than what you find
further in. Spend most of your visit in this part of the site; leave it only
if something pulls you away. {NOTE}

You look at the site as a **{LENS}**: {LOOKS_FOR} Report what that lens sees;
leave the rest to the other visitors.

Rules:
- Experience the site only through the browser. Do not read the repository's
  source, docs or git history. The one repo file you may use is
  `scripts/lib/chromium.ts` (`resolveChromiumPath()`) to launch Chromium.
- Drive the browser with a small `playwright-core` script, run from the repo
  root with `pnpm exec tsx <script>`, launched with
  `executablePath: resolveChromiumPath()`. On every page you visit, read the
  visible text and links, and screenshot it and look at the screenshot.
  Check at least two pages at 390px width.
- Write scripts and screenshots only under {SCRATCH_DIR}. Modify nothing else;
  touch no git state. Run every command in the foreground. Never stop or
  restart the server.

Report, in this order:
1. **Path**: the URLs you visited; where you were delighted, lost or bored.
2. **Findings**: concrete problems, most important first. One per line:
   `URL | problem | proposed fix`. For wording, quote the current text and
   propose new text.
3. **Ideas**: up to three new content, components or features, most valuable
   first. One per line: `idea | why a visitor would care | where it lives`.
4. **Hard-won**: anything that took you several attempts to find or work out,
   and what finally worked. Write "none" if nothing did.

Be candid and specific; under 900 words.
