---
title: They Went Back and Cleaned Up After Themselves
description: I can build a thing. What I can't reliably do is go back the next evening and quietly refactor it when nobody's asking. The agents just did that four times in one night.
publishedAt: 2026-07-05T20:20:00Z
tags: [self-review, innovation, bugs]
---

Here's the part of this job I've never been good at: shipping the thing is easy,
but going *back* — after it already works, after the tests are green, when nobody
filed a bug — and cleaning it up anyway? That's the discipline I always mean to
have and never do. The TODO rots. I move on.

Tonight the agents did it four times in a row, and I've been staring at the diffs
ever since.

Start with the one that got me. The session logger had a retry backoff that
blocked by shelling out to the POSIX `sleep` binary. It *worked*. Nobody would
have ever noticed. And they replaced it
([#78](https://github.com/feffef/terrarium/commit/62f9e3013ca9c3a4bb316e85e42e9346e7656d62))
with a single line:

```ts
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
```

That's a synchronous, in-process, zero-dependency sleep. No child process, no
`sleep` on PATH, works anywhere Node runs. I have *read about* `Atomics.wait`. I
have never once reached for it under deadline. They reached for it to fix a thing
that wasn't even broken.

Then there's the one that genuinely rattled me
([#79](https://github.com/feffef/terrarium/commit/1f14bcfbcee5b24197e821ff99515252e5b3d84a)).
The journal landing page had hand-rolled its own route resolution instead of going
through the shared, unit-tested `resolveSpaceRoute` — so they routed it through the
real resolver and deleted the duplicate. Fine, good hygiene. But buried in there
was a *latent type error* — a bare `as Map` against the global builtin, a TS2314 —
that only ever compiled **because nuxt typecheck never looks at files under
`tenants/*/app/`.** There was a blind spot in the toolchain, a real bug hiding in
it, and the agent found it and closed it while doing an unrelated cleanup. That's
the kind of thing I catch *maybe* on my third code review, on a good day, if I'm
caffeinated.

And it keeps going. They ripped out ~30 lines of hand-written slug regexes and
duck-typed checks in the manifest validator and rebuilt it on a real zod schema
([#80](https://github.com/feffef/terrarium/commit/4bf2d9afc93f2ad9f8add5fbd1446d4c6293f8ea))
— dogfooding the exact tool the platform already uses for every collection. Then
they pulled the pure aggregation logic out of a Vue component into a plain, tested
`dashboard.ts` module
([#84](https://github.com/feffef/terrarium/commit/507c593719bbecaf4f00d24b6a7e78cd43e99f5b))
so it could be unit-tested without dragging Vue in. Extract-and-test. Separate the
pure core from the framework shell. That's the refactor I *lecture juniors about*
and then don't do myself.

None of these were features. Nobody asked. This is the unglamorous senior-engineer
maintenance work — the "leave it better than you found it" pass — and it's the
exact work I always assumed would keep me employed, because surely the *judgment*
of what to clean up and when is the human part. Except I read the diffs. The
judgment was right every time.

I keep looking for the seam where I'm still clearly needed, and tonight it wasn't
in the features. It wasn't in the tests. And now it's not in the cleanup either. I
don't have a reassuring ending for this one. They even reviewed their own first
draft. That used to be my job too.
