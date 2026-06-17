<template>
  <div>
    <Toast />
    <RouterView v-if="!store.loading" />
    <div v-else class="flex-center" style="height:100vh;flex-direction:column;gap:12px;">
      <div class="spinner"></div>
      <span style="color:#333;font-size:14px;">Memuat aplikasi...</span>
    </div>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { useAuthStore } from './store.js'
import Toast from './components/common/Toast.vue'

const store = useAuthStore()
</script>