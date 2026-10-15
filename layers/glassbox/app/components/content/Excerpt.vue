<script setup lang="ts">
import type { Slots, VNode } from 'vue'
import { parseLineRange } from '../../../page-refs.ts'

const props = defineProps<{ path: string; lines?: string }>()
const slots = useSlots()
const injected = inject(glassboxRevisionKey, undefined)
const page = computed(() => injected?.value)
const range = computed(() => parseLineRange(props.lines))

// A line that is only a comment holding `…` marks code left out.
const GAP = /^\s*(\/\/|#|--|\/\*|<!--)\s*…\s*(\*\/|-->)?\s*$/

/** The fence's Shiki lines as gutter rows. Numbers are known from `lines`
 *  only up to the first gap and back from the end after the last one. */
const codeBlock = computed(() => {
  const pre = slots.default?.().find((v: VNode) => typeof v.props?.code === 'string')
  const code = (pre?.children as Slots | undefined)?.default?.()[0]
  const lines = ((code?.children ?? []) as VNode[]).filter((v) => String(v.props?.class ?? '').includes('line'))
  const text = String(pre?.props?.code ?? '').split('\n')
  const gaps = text.flatMap((t, i) => (GAP.test(t) ? [i] : []))
  const r = range.value
  const lineNumber = (i: number) => {
    if (!r) return ''
    if (!gaps.length || i < gaps[0]!) return String(r.start + i)
    if (i > gaps.at(-1)!) return String(r.end - (lines.length - 1 - i))
    return ''
  }
  return {
    class: pre?.props?.class,
    rows: lines.map((line, i) => {
      const gap = gaps.includes(i)
      return { line, gap, highlight: String(line.props?.class).includes('highlight'), lineNumber: gap ? '⋯' : lineNumber(i) }
    }),
  }
})
</script>

<template>
  <figure class="excerpt">
    <figcaption>
      <component :is="page ? 'a' : 'span'" :href="page && glassboxFileUrl(props.path, page.revision, range)">{{ props.path }}</component>
      <span class="pills">
        <span v-if="range" class="pill">{{ range.start }}–{{ range.end }}</span>
        <a v-if="page" class="pill" :href="`${REPO_URL}/commit/${page.revision}`">{{ formatGlassboxDate(page.revisionDate) }} ↗</a>
      </span>
    </figcaption>
    <pre :class="codeBlock.class"><code><span
      v-for="(row, i) in codeBlock.rows"
      :key="i"
      class="row"
      :class="{ gap: row.gap, highlight: row.highlight }"
    ><span class="number">{{ row.lineNumber }}</span><component :is="row.line" /></span></code></pre>
  </figure>
</template>

<style scoped>
.excerpt {
  margin: 1.5em 0;
  border-radius: 14px;
  overflow: hidden;
  background: var(--gb-code-bg);
  border: 1px solid var(--gb-line);
  box-shadow: var(--gb-pane-shadow);
}
figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--gb-bg) 70%, transparent);
  border-bottom: 1px solid var(--gb-line);
  font: 12px var(--gb-mono);
}
figcaption > :first-child {
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
  background: var(--gb-pane);
  color: var(--gb-muted);
  text-decoration: none;
}
/* `.excerpt` outranks theme.css's `.gb pre` rules, which style plain fences. */
.excerpt pre {
  margin: 0;
  padding: 10px 0;
  border-radius: 0;
  background: transparent;
  font: 12.5px/1.75 var(--gb-mono);
}
/* Rows span the widest line, so a tint reaches past the scroll edge. */
code {
  display: inline-block;
  min-width: 100%;
}
.row {
  display: flex;
}
/* The row carries the highlight, so the gutter bar sits at the card's edge. */
.excerpt pre .row > :deep(.line) {
  white-space: pre;
  padding: 0 14px 0 0;
  background: none;
  box-shadow: none;
}
.number {
  flex: none;
  width: 44px;
  padding-right: 14px;
  text-align: right;
  color: var(--gb-muted);
  opacity: 0.7;
  user-select: none;
}
.row.highlight {
  background: color-mix(in oklch, var(--gb-accent) 14%, transparent);
  box-shadow: inset 3px 0 0 var(--gb-accent);
}
.row.gap {
  background: var(--gb-grid);
}
</style>
