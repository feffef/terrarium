import { describe, expect, it } from 'vitest'
import { safeSvg, svgHazard } from '../../shared/svg'

describe('svgHazard', () => {
  it.each([
    '<path d="M0 0" fill="currentColor"/>',
    '<g stroke="var(--tf-ink)"><use href="#a"/><circle r="4"/></g>',
    '<text>Metadata: ok, and an onion</text>',
  ])('passes benign markup: %s', (markup) => {
    expect(svgHazard(markup)).toBeUndefined()
  })

  it.each([
    '<path onmouseover="alert(1)" d="M0 0"/>',
    '<path/onload=alert(1)>',
    '<SCRIPT>alert(1)</SCRIPT>',
    '<a href="javascript:alert(1)"><path/></a>',
    '<a xlink:href="https://evil.example"><path/></a>',
    '<image href=x />',
    '<foreignObject><div>x</div></foreignObject>',
    '<iframe src="x"/>',
    '<set attributeName="href" to="#x"/>',
    '<animate attributeName="xlink:href" values="#a"/>',
    '<rect style="fill:url(data:image/svg+xml,x)"/>',
  ])('rejects %s', (markup) => {
    expect(svgHazard(markup)).toBeDefined()
    expect(safeSvg.safeParse(markup).success).toBe(false)
  })

  it('admits foreignObject only when asked, and still rejects handlers inside it', () => {
    expect(svgHazard('<foreignObject><p>label</p></foreignObject>', { html: true })).toBeUndefined()
    expect(svgHazard('<foreignObject><img src=x onerror=alert(1)></foreignObject>', { html: true })).toBeDefined()
  })
})
