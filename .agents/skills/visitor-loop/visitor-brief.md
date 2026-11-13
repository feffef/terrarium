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
- Drive the browser with a small `playwright-core` script that opens it with
  `launchChromium()` from `scripts/lib/chromium.ts` (it adds the flags this
  sandbox needs). Save each script under {SCRIPT_DIR} and run every command
  from the directory you start in, since `pnpm` fails anywhere else: never
  `cd`. Run scripts as `pnpm exec tsx {SCRIPT_DIR}/<script>` and give every
  file they write an absolute path under {SCRATCH_DIR}.
- Use the cheapest tool that answers each question:
  - **Words and links:** read them as text. One script that walks several
    pages and saves each page's visible text and links to its own file, plus
    an index of URL to file, beats a screenshot per page.
  - **What can be measured** (overflow, sizes, positions): measure it in the
    page at the width in question, 390px included. Pass `page.evaluate` its
    body as a string, since `tsx` breaks a function passed to it.
  - **What must be seen** (overlap, clipping, contrast, awkward wrapping,
    images, a first impression): screenshot it and look at the screenshot.
- Create {SCRATCH_DIR} and {SCRIPT_DIR} first and write nothing outside them.
  Modify nothing else; never `checkout`, `switch` or `reset`. Run every
  command in the foreground. Never stop or restart the server.

Report, in this order:
1. **Path**: the URLs you visited; where you were delighted, lost or bored.
2. **Findings**: concrete problems, most important first. One per line:
   `URL | problem | proposed fix | evidence`. For wording, quote the current
   text and propose new text. Evidence is what you saw or checked (a
   screenshot, file:line, a command); write "unverified" if you have none.
3. **Ideas**: up to three new content, components or features, most valuable
   first. One per line: `page path | what it shows now | idea | why a visitor
   would care`.
4. **Hard-won**: anything that took you several attempts to find or work out,
   and what finally worked. Write "none" if nothing did.

Give every count, id or claim about the code its source (URL, file:line or
command), or mark it unverified. Be candid and specific; under 900 words.
