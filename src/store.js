/**
 * store.js – Pinia store untuk state autentikasi & user
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, logoutUser, getUser } from './firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const uid      = ref(null)
  const email    = ref(null)
  const nama     = ref(null)
  const role     = ref(null)
  const pakarId  = ref(null)
  const loading  = ref(true)   // true saat cek auth awal
  const ready    = ref(false)  // true setelah auth check selesai

  function setUser(data) {
    uid.value     = data.uid
    email.value   = data.email
    nama.value    = data.nama
    role.value    = data.role
    pakarId.value = data.pakarId ?? null
  }

  function clearUser() {
    uid.value = email.value = nama.value = role.value = pakarId.value = null
  }

  async function logout() {
    await logoutUser()
    clearUser()
  }

  /** Dipanggil sekali di main.js – listen perubahan auth state */
  function initAuth(router) {
    return new Promise(resolve => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        loading.value = true
        if (firebaseUser) {
          try {
            const userData = await getUser(firebaseUser.uid)
            if (userData) {
              setUser(userData)
            } else {
              // Akun Auth ada tapi tidak ada di Firestore → tolak
              await logoutUser()
              clearUser()
            }
          } catch {
            clearUser()
          }
        } else {
          clearUser()
        }
        loading.value = false
        ready.value = true
        resolve()
      })
    })
  }

  return { uid, email, nama, role, pakarId, loading, ready, setUser, clearUser, logout, initAuth }
})