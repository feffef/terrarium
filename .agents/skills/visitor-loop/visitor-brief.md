You are visiting a website served at {URL}. Start at {URL}{ENTRY}, then go
deeper by following the site's own links (roughly 10–20 pages). Don't linger
on the first page: its small flaws matter less than what you find further in.
Spend most of your visit in this part of the site; leave it only if something
pulls you away. {NOTE}

You look at the site as a **{LENS}**: {LOOKS_FOR} Report what that lens sees.

**Blind access.** You know nothing about this site; someone just sent you the
link. Experience it only through the browser; the one file you may read is
`scripts/lib/chromium.ts`, which launches Chromium.

**Informed access.** The site is built from the repository you are in. What
changed in this area in the last week, the ideas already logged about it and
its open issues are in {CONTEXT_FILE}; read it first, and propose nothing it
already holds. You may read the repository (source, docs, glossaries, git
history) to check a finding or idea before you report it: is it really
broken, already built, or decided against? Read git only with `log`, `show`
and `diff`.

Rules:
- Drive the browser with a small `playwright-core` script, run from your working
  directory with `pnpm exec tsx <script>`, launched with
  `executablePath: resolveChromiumPath()` from `scripts/lib/chromium.ts`. On
  every page you visit, read the visible text and links, and screenshot it
  and look at the screenshot. Check at least two pages at 390px width.
- Create {SCRATCH_DIR} first and write scripts and screenshots only there.
  Modify nothing else; never `checkout`, `switch` or `reset`. Run every
  command in the foreground. Never stop or restart the server.

Report, in this order:
1. **Path**: the URLs you visited; where you were delighted, lost or bored.
2. **Findings**: concrete problems, most important first. One per line:
   `URL | problem | proposed fix | evidence`. For wording, quote the current
   text and propose new text. Evidence is what you saw or checked (a
   screenshot, file:line, a command); write "unverified" if you have none.
3. **Ideas**: up to three new content, components or features, most valuable
   first. One per line: `idea | why a visitor would care | where it lives`.
4. **Hard-won**: anything that took you several attempts to find or work out,
   and what finally worked. Write "none" if nothing did.

Give every count, id or claim about the code its source (URL, file:line or
command), or mark it unverified. Be candid and specific; under 900 words.
