/**
 * useToast.js
 * Singleton state untuk notifikasi toast
 */
import { reactive } from 'vue'

const state = reactive({
  visible: false,
  message: '',
  type: 'ok' // 'ok' | 'error'
})

let timer = null

export function useToast() {
  function show(message, type = 'ok') {
    state.message = message
    state.type = type
    state.visible = true
    clearTimeout(timer)
    timer = setTimeout(() => { state.visible = false }, 3500)
  }

  function hide() {
    state.visible = false
    clearTimeout(timer)
  }

  return { state, show, hide }
}