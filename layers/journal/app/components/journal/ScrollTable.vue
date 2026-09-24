<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div class="jd-table-scroll">
    <table v-bind="$attrs"><slot /></table>
  </div>
</template>
