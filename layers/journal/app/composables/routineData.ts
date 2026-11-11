// State shared by the Routine runs page and the MDC blocks in its body. The page
// loads the `routines` collection once and provides it; the blocks cannot take it
// as props, since a Markdown body names only a Routine. The chosen metric is one
// value, so switching it redraws every chart and the table together.
import type { InjectionKey, Ref } from 'vue'
import type { RoutineDoc } from '../types/journal'
import type { RoutineMetric } from '../utils/routineRuns'

// A Routine runs the Skill of the same name; `gist` is that Skill's Inventory
// gist, so newcomers see what the Routine does, not only its name.
export type RoutineView = RoutineDoc & { gist?: string }

const ROUTINE_DATA: InjectionKey<Ref<RoutineView[]>> = Symbol('journal-routine-data')

export function provideRoutineData(routines: Ref<RoutineView[]>) {
  provide(ROUTINE_DATA, routines)
}

export function useRoutineData(): Ref<RoutineView[]> {
  return inject(ROUTINE_DATA, ref([]))
}

export function useRoutineMetric() {
  return useState<RoutineMetric>('journal-routine-metric', () => 'costUsd')
}
