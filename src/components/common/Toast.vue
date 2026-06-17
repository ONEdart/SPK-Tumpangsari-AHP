<template>
  <Transition name="toast">
    <div v-if="state.visible" :class="['toast', state.type === 'error' ? 'error' : '']">
      {{ state.message }}
    </div>
  </Transition>
</template>

<script setup>
import { useToast } from '../../composables/useToast.js'
const { state } = useToast()
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px); }
</style>