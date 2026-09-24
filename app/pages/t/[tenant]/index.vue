<script setup lang="ts">
// A Tenant with no front door of its own (a layer's static `/t/<tenant>` route
// wins over this one) redirects to its first routable Space.
import { routingMap } from '#routing'
import type { RoutingMap } from '#shared/routing'

const tenant = String(useRoute().params.tenant)
const first = Object.entries((routingMap as RoutingMap)[tenant] ?? {}).find(([, c]) => c.pages)?.[0]
if (!first) throw createError({ statusCode: 404, statusMessage: `Unknown Tenant: ${tenant}` })
await navigateTo(`/t/${tenant}/${first}`, { redirectCode: 302 })
</script>

<template>
  <div />
</template>
