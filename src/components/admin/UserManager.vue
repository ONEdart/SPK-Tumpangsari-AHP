<template>
  <div class="panel">
    <div class="panel-header">
      <span>Manajemen Pengguna</span>
      <button class="btn btn-sm" style="background:white;color:black;" @click="openAdd">+ Tambah</button>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="flex-center" style="padding:24px"><span class="spinner"></span></div>
      <table v-else>
        <thead>
          <tr><th>Email</th><th>Nama</th><th>Role</th><th>PakarId</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.uid">
            <td style="word-break:break-all">{{ u.email }}</td>
            <td>{{ u.nama }}</td>
            <td>
              <span :class="['badge', roleBadge(u.role)]">{{ u.role }}</span>
            </td>
            <td>{{ u.pakarId || '–' }}</td>
            <td>
              <div class="flex-gap">
                <button class="btn btn-sm btn-outline" @click="handleResetPw(u)" title="Kirim email reset password">Reset PW</button>
                <button
                  class="btn btn-sm btn-danger"
                  @click="confirmDelete(u)"
                  :disabled="u.uid === store.uid"
                  :title="u.uid === store.uid ? 'Tidak bisa hapus diri sendiri' : 'Hapus akun'"
                >Hapus</button>
              </div>
            </td>
          </tr>
          <tr v-if="!users.length">
            <td colspan="5" class="text-center text-muted" style="padding:20px">Belum ada pengguna.</td>
          </tr>
        </tbody>
      </table>
      <p class="text-muted mt-md" style="font-size:11px">
        ⚠ Catatan: Hapus akun menghapus data Firestore. Untuk menghapus akun Firebase Auth, lakukan manual di Firebase Console.
      </p>
    </div>
  </div>

  <!-- Modal Tambah -->
  <div v-if="modal.show" class="modal-overlay" @click.self="closeModal">
    <div class="modal">
      <div class="modal-header">
        <span>Tambah Pengguna Baru</span>
        <button @click="closeModal" style="background:none;border:none;color:white;cursor:pointer;font-size:18px">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nama Lengkap</label>
          <input v-model="modal.nama" type="text" placeholder="Nama lengkap" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="modal.email" type="email" placeholder="email@domain.com" />
        </div>
        <div class="form-group">
          <label>Password (min. 6 karakter)</label>
          <input v-model="modal.password" type="password" placeholder="Password" />
        </div>
        <div class="form-group">
          <label>Role</label>
          <select v-model="modal.role">
            <option value="">-- Pilih role --</option>
            <option value="penyuluh">Penyuluh</option>
            <option value="pakar">Pakar</option>
          </select>
        </div>
        <div v-if="modal.role === 'pakar'" class="form-group">
          <label>Nomor Pakar</label>
          <select v-model="modal.pakarId">
            <option :value="null">-- Pilih --</option>
            <option v-for="n in [1,2,3]" :key="n" :value="n">Pakar {{ n }}</option>
          </select>
        </div>
        <div v-if="modal.error" class="alert alert-error">{{ modal.error }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" @click="closeModal">Batal</button>
        <button class="btn" @click="handleCreate" :disabled="modal.saving">
          <span v-if="modal.saving" class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:white"></span>
          <span v-else>Buat Akun</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Konfirmasi Hapus -->
  <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget=null">
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <span>Konfirmasi Hapus</span>
        <button @click="deleteTarget=null" style="background:none;border:none;color:white;cursor:pointer;font-size:18px">✕</button>
      </div>
      <div class="modal-body">
        <p>Yakin hapus akun <strong>{{ deleteTarget.email }}</strong>?</p>
        <p v-if="deleteTarget.role === 'pakar'" class="alert alert-warning mt-md">
          Data penilaian Pakar {{ deleteTarget.pakarId }} juga akan dihapus.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" @click="deleteTarget=null">Batal</button>
        <button class="btn btn-danger" @click="handleDelete" :disabled="deleting">
          <span v-if="deleting" class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:white"></span>
          <span v-else>Ya, Hapus</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getAllUsers, createUser, deleteUser, resetPasswordUser } from '../../firebase.js'
import { useAuthStore } from '../../store.js'
import { useToast } from '../../composables/useToast.js'

const store = useAuthStore()
const { show } = useToast()
const users   = ref([])
const loading = ref(true)
const deleting = ref(false)
const deleteTarget = ref(null)

const modal = reactive({
  show: false, nama: '', email: '', password: '', role: '', pakarId: null, saving: false, error: ''
})

async function load() {
  loading.value = true
  users.value = await getAllUsers()
  loading.value = false
}
onMounted(load)

function roleBadge(role) {
  return { admin: 'badge-pending', penyuluh: 'badge-success', pakar: 'badge-error' }[role] || 'badge-pending'
}

function openAdd() {
  Object.assign(modal, { show: true, nama: '', email: '', password: '', role: '', pakarId: null, saving: false, error: '' })
}
function closeModal() { modal.show = false }

async function handleCreate() {
  modal.error = ''
  if (!modal.nama)     { modal.error = 'Nama wajib diisi.'; return }
  if (!modal.email)    { modal.error = 'Email wajib diisi.'; return }
  if (!modal.password || modal.password.length < 6) { modal.error = 'Password minimal 6 karakter.'; return }
  if (!modal.role)     { modal.error = 'Pilih role.'; return }
  if (modal.role === 'pakar' && !modal.pakarId) { modal.error = 'Pilih nomor pakar.'; return }
  // Cek duplikat pakarId
  if (modal.role === 'pakar') {
    const existing = users.value.find(u => u.role === 'pakar' && u.pakarId === modal.pakarId)
    if (existing) { modal.error = `Pakar ${modal.pakarId} sudah ada (${existing.email}).`; return }
  }
  modal.saving = true
  try {
    await createUser(modal.email, modal.password, {
      nama:    modal.nama,
      role:    modal.role,
      pakarId: modal.role === 'pakar' ? modal.pakarId : null
    })
    show('Akun berhasil dibuat: ' + modal.email)
    closeModal()
    await load()
  } catch (e) {
    modal.error = e.message || 'Gagal membuat akun.'
  } finally {
    modal.saving = false
  }
}

async function handleResetPw(u) {
  try {
    await resetPasswordUser(u.email)
    show('Email reset dikirim ke ' + u.email)
  } catch {
    show('Gagal mengirim email reset.', 'error')
  }
}

function confirmDelete(u) { deleteTarget.value = u }

async function handleDelete() {
  deleting.value = true
  try {
    await deleteUser(deleteTarget.value.uid, deleteTarget.value.pakarId)
    show('Akun dihapus: ' + deleteTarget.value.email)
    deleteTarget.value = null
    await load()
  } catch {
    show('Gagal menghapus akun.', 'error')
  } finally {
    deleting.value = false
  }
}
</script>