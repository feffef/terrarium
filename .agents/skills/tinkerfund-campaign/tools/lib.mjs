// Helpers for hand-authoring Tinkerfund figures: a 400x300 canvas coloured only by
// theme tokens. Built by the illustrator agents that drew the launch catalog; a
// figure module composes these into { style, caption, svg } entries.
export const r1 = (n) => { const v = Math.round(n * 10) / 10; return Object.is(v, -0) ? 0 : v }
export const f = (n) => String(r1(n))

// ---- colour tokens: a1-a3 accent faces, k1-k3 ink faces, w/l/g warn/link/good ----
export const C = {
  a1: 'var(--tf-accent)',
  a2: 'color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))',
  a3: 'color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))',
  k1: 'var(--tf-ink)',
  k2: 'color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))',
  k3: 'color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))',
  sf: 'var(--tf-surface)',
  ln: 'var(--tf-line)',
  mu: 'var(--tf-muted)',
  good: 'var(--tf-good)',
  link: 'var(--tf-link)',
  warn: 'var(--tf-warn)',
  w2: 'color-mix(in srgb, var(--tf-warn) 72%, var(--tf-ink))',
  w3: 'color-mix(in srgb, var(--tf-warn) 45%, var(--tf-surface))',
  g2: 'color-mix(in srgb, var(--tf-good) 70%, var(--tf-ink))',
  l2: 'color-mix(in srgb, var(--tf-link) 72%, var(--tf-ink))',
  l3: 'color-mix(in srgb, var(--tf-link) 45%, var(--tf-surface))',
  bad: 'var(--tf-bad)',
}
export const fill = (c) => `style="fill:${C[c] ?? c}"`
export const P = (d, c, extra = '') => `<path d="${d}" ${fill(c)}${extra} />`
export const poly = (pts, c) => P('M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z', c)
export const ell = (cx, cy, rx, ry, c) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" ${fill(c)} />`
export const circ = (cx, cy, r, c) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" ${fill(c)} />`

// ---- isometric projection (30 deg): x runs down-right, y runs down-left, z up ----
const K = Math.cos(Math.PI / 6), H = 0.5
export const iso = (x, y, z, ox = 200, oy = 150) => [ox + (x - y) * K, oy + (x + y) * H - z]
export const ip = (x, y, z, o) => { const [X, Y] = iso(x, y, z, ...(o ?? [])); return `${f(X)} ${f(Y)}` }

/** An iso box with corner (x,y,z), size w (along x), d (along y), h (up). Faces: top a3-ish, left(x-front) a1, right(y-front) a2 by default. */
export function box(x, y, z, w, d, h, [top, left, right] = ['a3', 'a1', 'a2'], o) {
  const p = (a, b, c) => iso(a, b, c, ...(o ?? []))
  const out = []
  if (top) out.push(poly([p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)], top))
  if (left) out.push(poly([p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)], left))
  if (right) out.push(poly([p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)], right))
  return out.join('\n')
}

/** Iso cylinder (vertical axis) at screen centre (cx, cy of the TOP ellipse), radius r (screen rx), height h screen px. */
export function cyl(cx, cy, r, h, [top, left, right] = ['a3', 'a1', 'a2'], ry = r * 0.577) {
  const R = f(r), RY = f(ry)
  const out = []
  out.push(P(`M${f(cx - r)} ${f(cy)}V${f(cy + h)}A${R} ${RY} 0 0 0 ${f(cx)} ${f(cy + h + ry)}V${f(cy + ry)}A${R} ${RY} 0 0 1 ${f(cx - r)} ${f(cy)}Z`, left))
  out.push(P(`M${f(cx)} ${f(cy + ry)}V${f(cy + h + ry)}A${R} ${RY} 0 0 0 ${f(cx + r)} ${f(cy + h)}V${f(cy)}A${R} ${RY} 0 0 1 ${f(cx)} ${f(cy + ry)}Z`, right))
  if (top) out.push(ell(cx, cy, r, ry, top))
  return out.join('\n')
}

// ---- patent style ----
export const G0 = '<g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">'
export const L = (d, sw) => `<path d="${d}"${sw ? ` style="stroke-width:${sw}"` : ''} />`
export const K24 = (d) => L(d, 2.4)
export const T9 = (d) => L(d, '.9')
export const HID = (d) => `<path d="${d}" style="stroke-width:1;stroke-dasharray:5 3.5" />`
export const HATCH = (d) => `<path d="${d}" style="stroke-width:.8" />`
/** A leader: quadratic from (x1,y1) to (x2,y2), bowed sideways. */
export const leader = (x1, y1, x2, y2, bow = 0.25) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1
  return `M${f(x1)} ${f(y1)}Q${f(mx - dy * bow)} ${f(my + dx * bow)} ${f(x2)} ${f(y2)}`
}
export const leaders = (arr) => T9(arr.map((a) => leader(...a)).join(''))
export const nums = (arr, size = 12) => `<g style="fill:var(--tf-ink);font:500 ${size}px var(--tf-mono)">` + arr.map(([x, y, t]) => `<text x="${f(x)}" y="${f(y)}">${t}</text>`).join('') + '</g>'
export const title = (x, t) => `<g style="fill:var(--tf-ink);font:500 11px var(--tf-mono)"><text x="${x}" y="290">${t}</text></g>`

/** Hatch lines clipped (even-odd) to one or more polygons. angle in degrees, spacing px. Returns a d string. */
export function hatch(polys, spacing = 5, angle = 45) {
  if (typeof polys[0][0] === 'number') polys = [polys]
  const a = (angle * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx
  const edges = []
  let minO = Infinity, maxO = -Infinity
  for (const pg of polys) {
    for (let i = 0; i < pg.length; i++) {
      const p = pg[i], q = pg[(i + 1) % pg.length]
      edges.push([p, q])
      for (const [x, y] of [p, q]) { const o = x * nx + y * ny; minO = Math.min(minO, o); maxO = Math.max(maxO, o) }
    }
  }
  const segs = []
  for (let o = Math.ceil(minO / spacing) * spacing + spacing / 2; o < maxO; o += spacing) {
    // line: points P with P.n = o; param t along direction d
    const ts = []
    for (const [[x1, y1], [x2, y2]] of edges) {
      const o1 = x1 * nx + y1 * ny - o, o2 = x2 * nx + y2 * ny - o
      if ((o1 > 0) === (o2 > 0)) continue
      const u = o1 / (o1 - o2)
      const x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u
      ts.push(x * dx + y * dy)
    }
    ts.sort((p, q) => p - q)
    for (let i = 0; i + 1 < ts.length; i += 2) {
      const t1 = ts[i], t2 = ts[i + 1]
      if (t2 - t1 < 1) continue
      const bx = o * nx, by = o * ny
      segs.push(`M${f(bx + t1 * dx)} ${f(by + t1 * dy)}L${f(bx + t2 * dx)} ${f(by + t2 * dy)}`)
    }
  }
  return segs.join('')
}
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
export const circlePoly = (cx, cy, r, n = 36) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)])
export const ellPoly = (cx, cy, rx, ry, n = 36) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * 2 * Math.PI), cy + ry * Math.sin((i / n) * 2 * Math.PI)])
export const rectD = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`
export const circD = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`
export const ellD = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0`
export const join = (...parts) => parts.filter(Boolean).join('\n')

// ---- ground-plane drawing, strokes, dimensions, labels ----
/** Group whose contents are drawn in plan coordinates on the iso ground plane centred at screen (ox, oy). */
export const TOP = (ox, oy, inner) => `<g transform="matrix(.866 .5 -.866 .5 ${f(ox)} ${f(oy)})">${inner}</g>`
export const stroke = (d, c, w, extra = '') => `<path d="${d}" style="fill:none;stroke:${C[c] ?? c};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round${extra}" />`
/** Horizontal dimension with arrowheads; label centred above. */
export const dimH = (x1, x2, y, label, size = 9) => T9(`M${f(x1)} ${f(y)}H${f(x2)}M${f(x1 + 6)} ${f(y - 2.5)}l-6 2.5 6 2.5M${f(x2 - 6)} ${f(y - 2.5)}l6 2.5-6 2.5`) + (label ? `<text x="${f((x1 + x2) / 2)}" y="${f(y - 4)}" style="fill:var(--tf-ink);stroke:none;font:500 ${size}px var(--tf-mono);text-anchor:middle">${label}</text>` : '')
/** Vertical dimension with arrowheads; label to the right. */
export const dimV = (y1, y2, x, label, size = 9) => T9(`M${f(x)} ${f(y1)}V${f(y2)}M${f(x - 2.5)} ${f(y1 + 6)}l2.5-6 2.5 6M${f(x - 2.5)} ${f(y2 - 6)}l2.5 6 2.5-6`) + (label ? `<text x="${f(x + 5)}" y="${f((y1 + y2) / 2 + 3)}" style="fill:var(--tf-ink);stroke:none;font:500 ${size}px var(--tf-mono)">${label}</text>` : '')
export const txt = (x, y, t, size = 9, extra = '') => `<text x="${f(x)}" y="${f(y)}" style="fill:var(--tf-ink);stroke:none;font:500 ${size}px var(--tf-mono)${extra}">${t}</text>`

// ---- a fast local copy of the schema's svg() rule in tenant.config.ts; validate:content is the authority ----
const TOKEN = String.raw`var\(--tf-[a-z-]+\)`
const THEME_COLOUR = new RegExp(String.raw`^(?:none|currentColor|${TOKEN}|color-mix\(in srgb, *${TOKEN}(?: \d+%)?, *${TOKEN}(?: \d+%)?\))$`)
const COLOUR_VALUE = /\b(?:fill|stroke|color)\s*(?:=\s*["']?|:)\s*([^"';]+)/g
export function check(markup, maxBytes = 4096) {
  const problems = []
  for (const [, value] of markup.matchAll(COLOUR_VALUE)) {
    const colour = value.trim()
    if (!THEME_COLOUR.test(colour)) problems.push(`colour "${colour}" is not a theme token`)
  }
  if (/\sid\s*=/.test(markup)) problems.push('must not set an id')
  const bytes = new TextEncoder().encode(markup).length
  if (bytes > maxBytes) problems.push(`is ${bytes} bytes, over ${maxBytes}`)
  return { bytes, problems }
}
