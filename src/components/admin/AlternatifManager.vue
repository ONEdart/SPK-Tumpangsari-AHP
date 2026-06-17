<template>
  <div class="panel">
    <div class="panel-header">
      <span>Manajemen Alternatif</span>
      <button class="btn btn-sm" style="background:white;color:black;" @click="openAdd" :disabled="alternatifs.length >= 7">
        + Tambah
      </button>
    </div>
    <div class="panel-body">
      <p class="text-muted mb-md">Sumber data: BPS Kabupaten Probolinggo. Maksimal 7 alternatif.</p>

      <div v-if="loading" class="flex-center" style="padding:24px"><span class="spinner"></span></div>
      <table v-else>
        <thead>
          <tr><th>Kode</th><th>Nama Kombinasi</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-for="a in alternatifs" :key="a.kode">
            <td><strong>{{ a.kode }}</strong></td>
            <td>{{ a.nama }}</td>
            <td>
              <div class="flex-gap">
                <button class="btn btn-sm btn-outline" @click="openEdit(a)">Edit</button>
                <button class="btn btn-sm btn-danger" @click="confirmDelete(a)">Hapus</button>
              </div>
            </td>
          </tr>
          <tr v-if="!alternatifs.length">
            <td colspan="3" class="text-center text-muted" style="padding:20px">Belum ada alternatif.</td>
          </tr>
        </tbody>
      </table>

      <div class="flex-gap mt-md">
        <button class="btn btn-outline btn-sm" @click="handleReset" :disabled="resetting">
          <span v-if="resetting" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          <span v-else>↻ Reset ke Default</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Modal Add/Edit -->
  <div v-if="modal.show" class="modal-overlay" @click.self="closeModal">
    <div class="modal">
      <div class="modal-header">
        <span>{{ modal.editKode ? 'Edit Alternatif' : 'Tambah Alternatif Baru' }}</span>
        <button @click="closeModal" style="background:none;border:none;color:white;cursor:pointer;font-size:18px">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Kode</label>
          <input v-model="modal.kode" type="text" :disabled="!!modal.editKode" placeholder="A6" />
        </div>
        <div class="form-group">
          <label>Nama Kombinasi</label>
          <input v-model="modal.nama" type="text" placeholder="Jagung + Kacang Tanah" />
        </div>
        <div v-if="modal.error" class="alert alert-error">{{ modal.error }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" @click="closeModal">Batal</button>
        <button class="btn" @click="handleSave" :disabled="modal.saving">
          <span v-if="modal.saving" class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:white"></span>
          <span v-else>Simpan</span>
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
        <p>Yakin hapus alternatif <strong>{{ deleteTarget.kode }} – {{ deleteTarget.nama }}</strong>?</p>
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
import { getAlternatif, addAlternatif, updateAlternatif, deleteAlternatif, resetAlternatifDefault } from '../../firebase.js'
import { useToast } from '../../composables/useToast.js'

const { show } = useToast()
const alternatifs = ref([])
const loading  = ref(true)
const resetting = ref(false)
const deleting  = ref(false)
const deleteTarget = ref(null)

const modal = reactive({ show: false, kode: '', nama: '', editKode: null, saving: false, error: '' })

async function load() {
  loading.value = true
  alternatifs.value = await getAlternatif()
  loading.value = false
}

onMounted(load)

function openAdd() {
  const nextNum = alternatifs.value.length + 1
  Object.assign(modal, { show: true, kode: `A${nextNum}`, nama: '', editKode: null, saving: false, error: '' })
}

function openEdit(a) {
  Object.assign(modal, { show: true, kode: a.kode, nama: a.nama, editKode: a.kode, saving: false, error: '' })
}

function closeModal() { modal.show = false }

async function handleSave() {
  modal.error = ''
  if (!modal.kode.trim()) { modal.error = 'Kode wajib diisi.'; return }
  if (!modal.nama.trim()) { modal.error = 'Nama wajib diisi.'; return }
  if (!modal.editKode && alternatifs.value.find(a => a.kode === modal.kode)) {
    modal.error = 'Kode sudah ada.'; return
  }
  modal.saving = true
  try {
    if (modal.editKode) {
      await updateAlternatif(modal.editKode, { nama: modal.nama.trim() })
      show('Alternatif diperbarui')
    } else {
      await addAlternatif({ kode: modal.kode.trim().toUpperCase(), nama: modal.nama.trim() })
      show('Alternatif ditambahkan')
    }
    closeModal()
    await load()
  } catch (e) {
    modal.error = e.message || 'Gagal menyimpan.'
  } finally {
    modal.saving = false
  }
}

function confirmDelete(a) { deleteTarget.value = a }

async function handleDelete() {
  deleting.value = true
  try {
    await deleteAlternatif(deleteTarget.value.kode)
    show('Alternatif dihapus')
    deleteTarget.value = null
    await load()
  } catch {
    show('Gagal menghapus.', 'error')
  } finally {
    deleting.value = false
  }
}

async function handleReset() {
  if (!confirm('Reset akan menghapus semua alternatif dan mengembalikan ke 5 data default. Lanjutkan?')) return
  resetting.value = true
  try {
    await resetAlternatifDefault()
    show('Alternatif berhasil direset ke default')
    await load()
  } catch {
    show('Gagal reset alternatif.', 'error')
  } finally {
    resetting.value = false
  }
}
</script>