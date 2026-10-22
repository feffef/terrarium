<script setup lang="ts">
// `::routine-weekly-table` — every Routine's chosen metric summed per seven-day
// window, with row and column totals.
const routines = useRoutineData()
const metric = useRoutineMetric()

const table = computed(() => routineWeekTable(routines.value, metric.value))
const fmt = (v: number) => formatRoutineMetric(metric.value, v)
</script>

<template>
  <div v-if="table.weeks.length" class="jd-table-scroll rw">
    <table>
      <caption class="rw-cap">Seven days ending (UTC)</caption>
      <thead>
        <tr>
          <th scope="col">Routine</th>
          <th v-for="w in table.weeks" :key="w" scope="col" class="num">{{ w.slice(5) }}</th>
          <th scope="col" class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in table.rows" :key="row.name">
          <th scope="row">{{ row.name }}</th>
          <td v-for="(c, i) in row.cells" :key="table.weeks[i]" class="num">{{ c > 0 ? fmt(c) : '–' }}</td>
          <td class="num">{{ fmt(row.total) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">All Routines</th>
          <td v-for="(t, i) in table.totals" :key="table.weeks[i]" class="num">{{ fmt(t) }}</td>
          <td class="num">{{ fmt(table.grandTotal) }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
.rw { margin-top: 1.2rem; }
.rw table { width: 100%; }
.rw-cap { caption-side: top; text-align: left; font-family: var(--jd-mono); font-size: 0.7rem; color: var(--jd-faint); padding-bottom: 0.3rem; }
.rw .num { text-align: right; font-family: var(--jd-mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
.rw tfoot th, .rw tfoot td { border-top: 2px solid var(--jd-line); font-weight: 600; color: var(--jd-ink); }
.rw tbody th { font-family: var(--jd-mono); font-size: 0.8rem; color: var(--jd-ink); font-weight: 500; }
@media (max-width: 600px) {
  .rw table { font-size: 0.7rem; }
  .rw th, .rw td { padding: 0.35rem 0.2rem; }
  .rw tbody th { font-size: 0.68rem; }
}
</style>
