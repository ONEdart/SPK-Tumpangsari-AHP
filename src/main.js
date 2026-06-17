import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router.js'
import { useAuthStore } from './store.js'
import './styles.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Inisialisasi auth listener sebelum mount
const store = useAuthStore()
store.initAuth(router).then(() => {
  app.mount('#app')
})