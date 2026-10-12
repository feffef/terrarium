// Journal e2e helpers shared by journal.spec.ts and journal-accordion.spec.ts.
// Not a spec itself (no `.spec.ts` suffix), so vitest never collects it.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIGESTS_DIR } from '../../../../scripts/digest.ts'

// The `current` Space's Digest dates, oldest first — read live rather than
// hardcoded so these assertions stay valid regardless of which dates
// scripts/archive-journal-content.ts has moved out to `archived` (issue: the
// retention sweep ages a hardcoded date like 2026-07-04 out of `current` over
// time).
export const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
export function currentDigestDates(): string[] {
  return readdirSync(join(repoRoot, DIGESTS_DIR))
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map((f) => f.slice(0, -'.md'.length))
    .sort()
}
