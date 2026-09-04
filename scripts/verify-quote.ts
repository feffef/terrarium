// Mechanical text-match check for a quote lifted from source material (session
// logs, PR bodies, commit messages) into a new document — issue #1126. Plain
// `grep -F` both under- and over-reports: markdown line-wrapping breaks a quote
// across lines grep treats as separate, and `[text](url)` link syntax puts
// characters between words that the human-readable quote never had. Normalizing
// both before substring-matching fixes that class of false mismatch.
//
// This checks the TEXT only. It cannot and does not check that the quote is
// used in a way that preserves the source's MEANING — a verbatim quote can
// still misrepresent its source in context (e.g. crediting the wrong party for
// something the source actually says the opposite of). That still needs
// human/agent judgment; a PASS here is not a meaning check.
//
// Usage:  tsx scripts/verify-quote.ts <source-file> <quote-text-or-file>
//   Exits 0 and prints PASS if the normalized quote is found in the normalized
//   source; exits 1 and prints FAIL otherwise. The second argument is read as
//   a file if it names an existing path, otherwise treated as literal quote text.
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Collapse markdown links to their visible text and fold all whitespace runs
 *  (including line breaks, so line-wrapped source text reads as one line)
 *  before substring matching. */
export function normalize(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function verifyQuote(quote: string, source: string): boolean {
  return normalize(source).includes(normalize(quote))
}

function fail(msg: string): never {
  console.error(`verify-quote: ${msg}`)
  process.exit(1)
}

function main(): void {
  const [sourcePath, quoteArg] = process.argv.slice(2)
  if (!sourcePath || !quoteArg) {
    fail('usage: tsx scripts/verify-quote.ts <source-file> <quote-text-or-file>')
  }
  if (!existsSync(sourcePath)) fail(`source file not found: ${sourcePath}`)

  const source = readFileSync(sourcePath, 'utf8')
  const quote = existsSync(quoteArg) ? readFileSync(quoteArg, 'utf8') : quoteArg

  if (verifyQuote(quote, source)) {
    console.log('verify-quote: PASS — quote text found in source (text match only, not a meaning check)')
    return
  }
  console.error('verify-quote: FAIL — quote text not found in source after normalization')
  process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
