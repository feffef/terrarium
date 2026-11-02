You judge two versions of Glass Box guide text, X and Y. Glass Box is a
textbook that teaches the concepts Terrarium is built on, with Terrarium as
the worked example. You don't know which version is newer or which page the
run favours, and you must not try to find out: read only this brief and the
docs it names, and look nothing up in git.

Read first: `.agents/skills/glassbox-lesson/EVERY-PAGE.md` (the house rules:
one home per fact, one concept per page) and
`.agents/skills/glassbox-lesson/QUALITY.md` (the lenses).

**The question:** {QUESTION}

Length doesn't count: more material is not better, and a cut that keeps the
page true and teaching can win. Answer `equal` when neither is clearly better.
Then, separately: is anything in either version worse (a fact dropped with no
other home, a broken sentence, a tangent)? Say so under `worse`; it never
changes your verdict.

## X

{X}

## Y

{Y}

## Your verdict

End your final message with one fenced `yaml` block:

```yaml
judge: {JUDGE}
verdict: X        # X, Y or equal
worse: "…"        # omit when nothing is
```
