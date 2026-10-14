<script setup lang="ts">
import type { Slots, VNode } from 'vue'
import { parseLineRange } from '../../../page-refs.ts'

const props = defineProps<{ path: string; lines?: string }>()
const slots = useSlots()
const page = inject(glassboxRevisionKey)!
const range = computed(() => parseLineRange(props.lines))

// A line that is only a comment holding `…` marks code left out.
const GAP = /^\s*(\/\/|#|--|\/\*|<!--)\s*…\s*(\*\/|-->)?\s*$/

/** The fence's Shiki lines as gutter rows. Numbers are known from `lines`
 *  only up to the first gap and back from the end after the last one. */
function codeBlock() {
  const pre = slots.default?.().find((v: VNode) => typeof v.props?.code === 'string')
  const code = (pre?.children as Slots | undefined)?.default?.()[0]
  const lines = ((code?.children ?? []) as VNode[]).filter((v) => String(v.props?.class ?? '').includes('line'))
  const text = String(pre?.props?.code ?? '').split('\n')
  const gaps = text.flatMap((t, i) => (GAP.test(t) ? [i] : []))
  const r = range.value
  const number = (i: number) => {
    if (!r) return ''
    if (!gaps.length || i < gaps[0]!) return String(r.start + i)
    if (i > gaps.at(-1)!) return String(r.end - (lines.length - 1 - i))
    return ''
  }
  return {
    class: pre?.props?.class,
    rows: lines.map((line, i) => ({
      line,
      gap: gaps.includes(i),
      highlight: String(line.props?.class).includes('highlight'),
      number: gaps.includes(i) ? '⋯' : number(i),
    })),
  }
}
</script>

<template>
  <figure class="excerpt">
    <figcaption>
      <a :href="glassboxFileUrl(props.path, page?.revision ?? '', range)">{{ props.path }}</a>
      <span class="pills">
        <span v-if="range" class="pill">{{ range.start }}–{{ range.end }}</span>
        <a v-if="page" class="pill" :href="`${REPO_URL}/commit/${page.revision}`">{{ formatGlassboxDate(page.revisionDate) }} ↗</a>
      </span>
    </figcaption>
    <pre v-for="block in [codeBlock()]" :key="props.path" :class="block.class"><code><span
      v-for="(row, i) in block.rows"
      :key="i"
      class="row"
      :class="{ gap: row.gap, highlight: row.highlight }"
    ><span class="number">{{ row.number }}</span><component :is="row.line" /></span></code></pre>
  </figure>
</template>

<style scoped>
.excerpt {
  margin: 1.5em 0;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(15, 40, 55, 0.08);
  box-shadow: 0 10px 30px rgba(15, 40, 55, 0.1);
}
figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--gb-bg) 70%, transparent);
  border-bottom: 1px solid rgba(15, 40, 55, 0.08);
  font: 12px "JetBrains Mono", monospace;
}
figcaption > a {
  color: var(--gb-ink);
  font-weight: 500;
  text-decoration: none;
}
.pills {
  display: flex;
  gap: 6px;
}
.pill {
  padding: 2px 8px;
  border-radius: 99px;
  background: #fff;
  color: var(--gb-muted);
  text-decoration: none;
}
pre {
  margin: 0;
  padding: 10px 0;
  overflow-x: auto;
  background: transparent;
  font: 12.5px/1.75 "JetBrains Mono", monospace;
}
/* Rows span the widest line, so a tint reaches past the scroll edge. */
code {
  display: inline-block;
  min-width: 100%;
}
.row {
  display: flex;
}
.row > :deep(.line) {
  white-space: pre;
  padding-right: 14px;
}
.number {
  flex: none;
  width: 44px;
  padding-right: 14px;
  text-align: right;
  color: #9aa8b0;
  user-select: none;
}
.row.highlight {
  background: color-mix(in oklch, var(--gb-accent) 14%, transparent);
  box-shadow: inset 3px 0 0 var(--gb-accent);
}
.row.gap {
  background: rgba(0, 0, 0, 0.035);
}

@media (prefers-color-scheme: dark) {
  .excerpt {
    background: #0d1117;
    border: none;
    box-shadow: 0 10px 30px rgba(15, 40, 55, 0.2);
  }
  figcaption {
    background: rgba(255, 255, 255, 0.05);
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }
  .pill {
    background: rgba(255, 255, 255, 0.08);
  }
  .number {
    color: #6e7681;
  }
  .row.highlight {
    background: color-mix(in oklch, var(--gb-accent) 18%, transparent);
  }
  .row.gap {
    background: rgba(255, 255, 255, 0.04);
  }
}
</style>
