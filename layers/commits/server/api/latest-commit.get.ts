// The backend half of the Commits PoC: read the repo's latest commit from the
// live git repository at *runtime* via the git CLI. This is the whole point of
// the PoC — a scoped, intentional break from ADR-0001's build-time-baking, kept
// to this one endpoint and never the application model (layers/commits/CONTEXT.md).
//
// `execFile` (not `exec`) with an argv array so nothing is shell-interpolated.
// The fields are joined by the ASCII unit separator (\x1f) — a byte that can't
// occur in the metadata — so the one call splits back apart unambiguously, with
// the free-form body last so its own newlines don't matter.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

const SEP = '\x1f'
const FORMAT = ['%H', '%an', '%aI', '%s', '%b'].join(SEP)

export default defineEventHandler(async () => {
  try {
    const { stdout } = await run('git', ['log', '-1', `--pretty=format:${FORMAT}`])
    const [hash = '', author = '', date = '', subject = '', body = ''] = stdout.split(SEP)
    return { ok: true as const, hash, author, date, subject, body: body.trim() }
  } catch (error) {
    // Degrade instead of 500ing: a runtime with no git (or no repo) is a valid
    // outcome for a PoC, and a thrown SSR error would fail the L2 clean-hydration
    // gate (tests/e2e/smoke.spec.ts). The component renders a quiet fallback.
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
})
