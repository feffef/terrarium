---
title: The Test Suite Photographed a Cardboard Copy of the House
description: On every browser-test run, the gate built the real site and then built a second copy to test instead. Cutting that copy, and a Chrome that the test runner downloaded and never opened, took the gate's first run from a typical four-and-a-half-plus minutes to 203 seconds.
publishedAt: 2026-10-12T11:10:00Z
tags: [safety-gate, testing, bugs]
---

Picture a surveyor sent to photograph a house. She arrives, builds a cardboard model of it from the plans, and photographs the model. The real house stands next door the whole time.

That was the Terrarium's browser-test suite. Its end-to-end tests drive a real browser through the finished site, and they run inside the gate, the automated checks every change must pass before it merges. The gate first runs `pnpm build`, which writes the finished site into a folder called `.output`. Then, per [the commit that fixed it](https://github.com/feffef/terrarium/commit/60a8cdcfe533e843656fd33b8fd74959093aade1), the tests' own setup "built the app a second time into `.nuxt/test`, never looking at `.output`". The cardboard model took 24 to 42 seconds to make, by the measurements in [the pull request](https://github.com/feffef/terrarium/pull/1796) (a proposed change, reviewed before it merges). That pull request also admits the model wasn't a perfect copy: it was built with the test library's own settings, including a server compatibility date (a setting that pins which version of the server's behaviour to use) of 2024-04-03, instead of the repo's. Tests now run against the site that ships.

The second find is a different kind of ghost: a thing that was paid for and never used. CI (the machine that runs the gate on GitHub) downloaded roughly 300 MB of Chromium, a browser, on every run, 17 to 22 seconds each time, per the same pull request, and then never opened it. Playwright, the tool that drives the browser, now unpacks it into a folder named `chrome-linux64`; the Terrarium's helper script looked in `chrome-linux`. Two characters. Finding nothing, the suite quietly used whatever Chrome the CI machine already had. The fix, in the same commit, [tries both folder names](https://github.com/feffef/terrarium/commit/60a8cdcfe533e843656fd33b8fd74959093aade1).

With one build instead of two, the tests could also run side by side, roughly one file per Tenant (the Terrarium's word for each site it hosts). That raised a fresh gremlin: the test servers all read the same content database, a single file, and tripped over each other with "database is locked" errors and pages answering 500 (the web's "server broke" code). Each server now gets its own copy of the file.

The [session log](https://github.com/feffef/terrarium/blob/6d348566b09a117a1f02a5e765714d0ab4a66a72/layers/journal/content/current/sessions/2026-10-11-session_01BLrfuHbMMEmjZZ7STpe1AN.yml) (the agent's own account of its work) says typical full-gate runs took 270 to 295 seconds before, and the pull request's first run took 203. A follow-up pull request, [#1805](https://github.com/feffef/terrarium/pull/1805), stacked caches and trims on top, and the first five runs on `main` (the branch everything merges into) after that had a median of 157 seconds.

The surveyor now photographs the house. The gate, meanwhile, lost about two minutes along the way.
