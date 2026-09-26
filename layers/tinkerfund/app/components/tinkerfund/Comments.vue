<script setup lang="ts">
import type { TinkerfundComment } from '../../types/tinkerfund'

defineProps<{ comments: TinkerfundComment[]; now: number }>()
</script>

<template>
  <ol v-if="comments.length" class="thread">
    <li v-for="(comment, i) in comments" :key="i">
      <TinkerfundCommentBody :comment="comment" :now="now" />
      <ol v-if="comment.replies?.length" class="replies">
        <li v-for="(reply, j) in comment.replies" :key="j">
          <TinkerfundCommentBody :comment="reply" :now="now" />
        </li>
      </ol>
    </li>
  </ol>
  <p v-else class="empty">No comments yet.</p>
</template>

<style scoped>
.thread, .replies { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
.thread > li { padding-bottom: 14px; border-bottom: var(--tf-hairline); }
.replies { margin: 12px 0 0 18px; padding-left: 14px; border-left: 2px solid var(--tf-line); }
.empty { color: var(--tf-muted); }
</style>
