import { describe, expect, it } from 'vitest'
import { safeSvg, svgHazard } from '../../app/utils/svg'

describe('svgHazard', () => {
  it.each([
    '<path d="M0 0" fill="currentColor"/>',
    '<g stroke="var(--tf-ink)"><use href="#a"/><circle r="4"/></g>',
    '<text>Metadata: ok, and an onion &amp; a &lt;tag&gt;</text>',
    '<rect fill="url(#grad)" filter="url( \'#blur\')"/>',
  ])('passes benign markup: %s', (markup) => {
    expect(svgHazard(markup)).toBeUndefined()
  })

  it.each([
    '<path onmouseover="alert(1)" d="M0 0"/>',
    '<path/onload=alert(1)>',
    '<SCRIPT>alert(1)</SCRIPT>',
    '<a href="javascript:alert(1)"><path/></a>',
    '<use xlink:href="https://evil.example/s.svg#a"/>',
    '<image href=x />',
    '<foreignObject><div>x</div></foreignObject>',
    '<iframe src="x"/>',
    '<set attributeName="href" to="#x"/>',
    '<animate attributeName="xlink:href" values="#a"/>',
    '<rect style="fill:url(data:image/svg+xml,x)"/>',
    '<rect fill="url(https://evil.example/t.svg#a)"/>',
    '<a><set attributeName="&#104;ref" to="&#106;avascript:alert(1)"/><text>x</text></a>',
    '<use href="&#35;x"/>',
    '<rect fill="&#117;rl(https://evil.example)"/>',
    '<rect style="fill:u\\72l(https://evil.example)"/>',
    '<style>@import "https://evil.example/x.css";</style>',
    '<meta http-equiv="refresh" content="0;url=https://evil.example">',
    '<form action="https://evil.example"><text>x</text></form>',
    '<base href="https://evil.example/">',
    '<link rel="stylesheet" href="https://evil.example/x.css">',
    '<text>x</text></svg><img src=x>',
  ])('rejects %s', (markup) => {
    expect(svgHazard(markup)).toBeDefined()
    expect(safeSvg.safeParse(markup).success).toBe(false)
  })

  it('admits mermaid\'s HTML labels and style only when asked, and still checks inside them', () => {
    const mermaid = '<style>.n path{stroke:url(#g)}.a&gt;*{fill:red}</style><foreignObject><p>label</p></foreignObject>'
    expect(svgHazard(mermaid, { html: true })).toBeUndefined()
    expect(svgHazard(mermaid)).toBeDefined()
    expect(svgHazard('<foreignObject><p onclick=alert(1)>x</p></foreignObject>', { html: true })).toBeDefined()
    expect(svgHazard('<style>.n{fill:url(https://evil.example)}</style>', { html: true })).toBeDefined()
    expect(svgHazard('<style>@import "https://evil.example/x.css";</style>', { html: true })).toBeDefined()
  })
})
