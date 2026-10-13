# ADR reference index

Scanned 975 text files under /home/user/terrarium (excluding node_modules, .git, .nuxt, .output; symlinks not followed; 6 binary files skipped). Session logs, blog posts and docs/adr-rewrite/ skipped. Context is the enclosing block (to the nearest blank lines, 3 to 12 lines each side), with the Markdown section heading. Own ADR file and own rule(s) `.claude/rules/adr-NNNN*.md` excluded. One reference = one (file, line, ADR).

| ADR | live code | live docs | total | files |
|---|---|---|---|---|
| [0001](0001.md) | 9 | 20 | 29 | 23 |
| [0002](0002.md) | 21 | 8 | 29 | 23 |
| [0003](0003.md) | 15 | 80 | 95 | 38 |
| [0004](0004.md) | 102 | 97 | 199 | 113 |
| [0005](0005.md) | 5 | 12 | 17 | 13 |
| [0006](0006.md) | 14 | 12 | 26 | 19 |
| [0007](0007.md) | 3 | 14 | 17 | 9 |
| [0008](0008.md) | 10 | 7 | 17 | 12 |
| [0009](0009.md) | 78 | 44 | 122 | 50 |
| [0010](0010.md) | 17 | 5 | 22 | 14 |
| [0011](0011.md) | 4 | 12 | 16 | 14 |
| [0012](0012.md) | 27 | 6 | 33 | 14 |
| [0013](0013.md) | 24 | 13 | 37 | 26 |
| [0014](0014.md) | 24 | 14 | 38 | 26 |
| [0015](0015.md) | 14 | 10 | 24 | 14 |
| [0016](0016.md) | 10 | 2 | 12 | 11 |
| [0017](0017.md) | 68 | 23 | 91 | 37 |
| [0018](0018.md) | 9 | 13 | 22 | 16 |
| [0019](0019.md) | 10 | 6 | 16 | 10 |
| [0020](0020.md) | 18 | 49 | 67 | 29 |
| [0021](0021.md) | 4 | 8 | 12 | 9 |
| [0022](0022.md) | 6 | 14 | 20 | 7 |
| [0023](0023.md) | 5 | 27 | 32 | 16 |
| [0024](0024.md) | 35 | 6 | 41 | 13 |
| [0025](0025.md) | 44 | 14 | 58 | 31 |
| [0026](0026.md) | 11 | 11 | 22 | 12 |
| [0027](0027.md) | 11 | 10 | 21 | 15 |
| [0028](0028.md) | 11 | 9 | 20 | 12 |
| [0029](0029.md) | 5 | 6 | 11 | 10 |
| [0030](0030.md) | 7 | 8 | 15 | 9 |

Total references: 1181.

Unmatched bare `00NN` tokens outside historical records (manual review; not counted):

- `pnpm-lock.yaml:3515: resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}`
- `app/components/ContentLoadErrorDialog.vue:95: box-shadow: 0 12px 40px #0004;`
- `app/components/ContentLoadErrorDialog.vue:99: background: #0006;`
- `scripts/validate-adr-rules.ts:24: export const NO_RULE = new Set(['0007'])`
- `scripts/shell-reads.ts:712: const key = '${m.path}\u0000${m.rule}'`
- `scripts/session-trace.ts:371: const key = '${m.path}\u0000${m.rule}'`
- `layers/tinkerfund/content/prod/pages/campaigns/cat-acknowledgement-button.md:44: <g transform="matrix(.866 .5 -.866 .5 200 207)"><rect x="-16" y="-8.5" width="32" height="17" rx="2" style="fill:var(--tf-ink)" /><rect x="-14" y="-6.5" width="`
- `layers/midden/content/trench/artifacts/the-phantom-skill.yml:30: url: https://github.com/feffef/terrarium/blob/65978c777b7dfd0008acbb751730aed7cfbcd6b0/layers/journal/content/current/skills/review.yml`
- `tests/unit/double-background-guard.spec.ts:213: expect(dryRun(['--tool', 'Edit', '--input', '{"command":"pnpm gate:scoped \\u0026","run_in_background":true}']).decision).toBe(`
- `tests/unit/log-session-land.spec.ts:63: return 'deadbeef0000'`
- `tests/unit/log-session-land.spec.ts:222: return 'deadbeef0000'`
- `tests/unit/shell-reads.spec.ts:635: output: 'the real content of 0018',`
- `tests/unit/validate-adr-rules.spec.ts:31: expect(findAdrRuleProblems({ adrs: { '0024': ADR }, rules })).toEqual([])`
- `tests/unit/validate-adr-rules.spec.ts:41: const problems = findAdrRuleProblems({ adrs: { '0024': ADR, '0007': 'old' }, rules: { 'adr-0099.md': 'x' } })`
- `tests/unit/validate-adr-rules.spec.ts:52: expect(newFormatProblems('0024', NEW)).toEqual([])`
- `tests/unit/validate-adr-rules.spec.ts:53: expect(newFormatProblems('0024', '# 24. Mermaid\n\nDate: 2026-01-01\nStatus: Accepted\n')).toEqual([])`
- `tests/unit/validate-adr-rules.spec.ts:58: expect(newFormatProblems('0024', text)).toEqual([`
