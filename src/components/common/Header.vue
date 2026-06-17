<template>
  <header class="app-header no-print">
    <div class="container">
      <div class="header-inner">
        <div class="header-logo">
          <span class="logo-text">SPK Tumpangsari AHP</span>
        </div>
        <div class="header-user">
          <div class="user-info">
            <span class="user-name">{{ store.nama || store.email }}</span>
            <span class="user-role">{{ roleLabel }}</span>
          </div>
          <button class="btn btn-sm" @click="handleLogout" :disabled="loggingOut">
            <span v-if="loggingOut" class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:white"></span>
            <span v-else>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store.js'
import { useToast } from '../../composables/useToast.js'

const store = useAuthStore()
const router = useRouter()
const { show } = useToast()
const loggingOut = ref(false)

async function handleLogout() {
  loggingOut.value = true
  try {
    await store.logout()
    router.push('/login')
  } catch {
    show('Gagal logout', 'error')
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
.app-header {
  border-bottom: 2px solid var(--color-black);
  background: var(--color-white);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
}
.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
}
.logo-icon { font-size: 20px; }
.header-user {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-info {
  text-align: right;
}
.user-name { display: block; font-weight: 600; font-size: 14px; }
.user-role { font-size: 12px; color: var(--color-gray-dark); }

@media (max-width: 480px) {
  .logo-text { display: none; }
  .user-info { display: none; }
}
</style>