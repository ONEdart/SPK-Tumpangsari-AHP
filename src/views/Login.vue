<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <div class="login-logo">🌿</div>
        <h1>SPK Tumpangsari AHP</h1>
        <p>Sistem Pendukung Keputusan Pemilihan Kombinasi Tanaman Tumpangsari</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="email@domain.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" placeholder="Password" required autocomplete="current-password" />
        </div>

        <div v-if="error" class="alert alert-error mb-md">{{ error }}</div>

        <button class="btn" type="submit" style="width:100%" :disabled="loading">
          <span v-if="loading" class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:white"></span>
          <span v-else>Masuk</span>
        </button>
      </form>

      <div class="login-footer">
        <button class="btn-link" @click="handleReset" :disabled="loading">Lupa password?</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginUser, resetPasswordUser, getUser } from '../firebase.js'
import { useAuthStore } from '../store.js'
import { useToast } from '../composables/useToast.js'

const router  = useRouter()
const store   = useAuthStore()
const { show } = useToast()

const form    = reactive({ email: '', password: '' })
const loading = ref(false)
const error   = ref('')

const ROLE_PATHS = { admin: '/admin', penyuluh: '/penyuluh', pakar: '/pakar' }

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const cred = await loginUser(form.email, form.password)
    const userData = await getUser(cred.user.uid)
    if (!userData) throw new Error('Akun tidak terdaftar dalam sistem.')
    store.setUser(userData)
    router.push(ROLE_PATHS[userData.role] || '/login')
  } catch (e) {
    const msg = e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found'
      ? 'Email atau password salah.'
      : e.message || 'Login gagal.'
    error.value = msg
  } finally {
    loading.value = false
  }
}

async function handleReset() {
  if (!form.email) { error.value = 'Isi email terlebih dahulu.'; return }
  loading.value = true
  try {
    await resetPasswordUser(form.email)
    show('Email reset password telah dikirim ke ' + form.email)
  } catch {
    show('Gagal mengirim email reset. Periksa kembali email Anda.', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--color-gray-light);
}
.login-box {
  width: 100%;
  max-width: 400px;
  border: var(--border-thick);
  background: var(--color-white);
  padding: 32px 28px;
}
.login-header { text-align: center; margin-bottom: 28px; }
.login-logo { font-size: 40px; margin-bottom: 8px; }
.login-header h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
.login-header p  { font-size: 12px; color: var(--color-gray-dark); }
.login-footer {
  margin-top: 16px;
  text-align: center;
}
.btn-link {
  background: none;
  border: none;
  color: var(--color-black);
  cursor: pointer;
  text-decoration: underline;
  font-size: 13px;
  font-family: var(--font-primary);
  padding: 0;
}
.btn-link:hover { opacity: 0.7; }
</style>