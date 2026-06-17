<template>
  <div class="panel">
    <div class="panel-header">Panel C – Matriks Perbandingan Alternatif per Kriteria</div>
    <div class="panel-body">

      <p class="instruksi">
        Isi perbandingan berpasangan antar alternatif untuk setiap kriteria. Pilih tab kriteria di bawah.
      </p>

      <!-- Tab kriteria -->
      <div class="tab-bar">
        <button
          v-for="k in kriteria"
          :key="k.kode"
          class="tab-btn"
          :class="{ 'tab-aktif': tabAktif === k.kode }"
          @click="tabAktif = k.kode"
        >
          {{ k.kode }}
          <span class="tab-status" :class="statusAlt[k.kode] ? 'status-ok' : 'status-kosong'">
            {{ statusAlt[k.kode] ? ' ✓' : ' ○' }}
          </span>
        </button>
      </div>

      <!-- Progress -->
      <div class="progress-box" v-if="kriteria.length > 0">
        Progress Pengisian: {{ progress }}%
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <!-- Konten per kriteria -->
      <div v-if="tabAktif" class="tab-konten">
        <p class="tab-sub-judul">
          Kriteria <strong>{{ tabAktif }}</strong>: {{ labelKriteria(tabAktif) }}
          <span v-if="crAlt[tabAktif] != null" :class="crAlt[tabAktif] < 0.1 ? 'cr-ok' : 'cr-error'">
            | CR: {{ crAlt[tabAktif]?.toFixed(4) }}
            {{ crAlt[tabAktif] < 0.1 ? '✓ Konsisten' : '✗ Tidak Konsisten' }}
          </span>
          <span v-else class="cr-empty">| CR: Belum dihitung</span>
        </p>

        <table>
          <thead>
            <tr>
              <th>Alternatif Kiri</th>
              <th>Skala AHP</th>
              <th>Alternatif Kanan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pasanganAlt" :key="p.key">
              <td>
                <strong>{{ p.a }}</strong>
                <div class="label-alt">{{ labelAlternatif(p.a) }}</div>
              </td>
              <td>
                <select v-model="nilaiFormAlt[tabAktif][p.key]" class="select-nilai">
                  <option v-for="n in skalaAHP" :key="n.val" :value="n.val">
                    {{ n.label }}
                  </option>
                </select>
              </td>
              <td>
                <strong>{{ p.b }}</strong>
                <div class="label-alt">{{ labelAlternatif(p.b) }}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Hasil CR & Bobot -->
        <div v-if="crAlt[tabAktif] != null" class="hasil-cr" :class="crAlt[tabAktif] < 0.1 ? 'cr-ok-box' : 'cr-error-box'">
          <div class="cr-row">
            <span class="cr-label">CR: {{ crAlt[tabAktif].toFixed(4) }}</span>
            <span class="cr-status">
              {{ crAlt[tabAktif] < 0.1 ? '✓ Konsisten' : '✗ Tidak Konsisten' }}
            </span>
          </div>
          <div v-if="crAlt[tabAktif] < 0.1 && bobotAlt[tabAktif]?.length" class="bobot-row">
            <span class="bobot-label">Bobot Alternatif:</span>
            <span v-for="b in bobotAlt[tabAktif]" :key="b.kode" class="bobot-item">
              {{ b.kode }} = {{ (b.bobot * 100).toFixed(1) }}%
            </span>
          </div>
          <div v-if="crAlt[tabAktif] >= 0.1" class="peringatan">
            CR harus &lt; 0.1. Perbaiki penilaian Anda.
          </div>
        </div>

        <div class="aksi">
          <button class="btn btn-outline" @click="hitungKonsistensiAlt" :disabled="loading || !semuaTerisi">
            Hitung Konsistensi
          </button>
          <button class="btn" @click="simpanAlternatif" :disabled="loading || !semuaTerisi || !isKonsisten">
            {{ loading ? 'Menyimpan...' : `Simpan ${tabAktif}` }}
          </button>
        </div>

        <p v-if="!semuaTerisi" class="pesan-validasi">Isi semua perbandingan sebelum menghitung.</p>
        <p v-if="semuaTerisi && !isKonsisten && crAlt[tabAktif] != null" class="pesan-validasi">
          CR lebih dari 0.1. Perbaiki penilaian terlebih dahulu.
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { savePenilaianAlternatif, getPenilaianPakar } from '../../firebase.js'
import { consistencyRatio, eigenvector } from '../../composables/useAHP.js'
import { useToast } from '../../composables/useToast.js'

const props = defineProps({
  kriteria: { type: Array, default: () => [] },
  alternatifs: { type: Array, default: () => [] },
  pakarId: { type: Number, required: true },
})

const emit = defineEmits(['saved'])
const toast = useToast()
const loading = ref(false)
const tabAktif = ref('')
const crAlt = ref({})
const bobotAlt = ref({})
const statusAlt = ref({})
const isLoaded = ref(false)

// nilaiFormAlt[kriteriaKode][pasanganKey] = nilai (default null)
const nilaiFormAlt = ref({})

// Skala AHP dua arah (1/9 sampai 9) – label singkat
const skalaAHP = [
  { val: 1/9, label: '1/9 – Kanan mutlak' },
  { val: 1/8, label: '1/8 – Kanan sangat dominan' },
  { val: 1/7, label: '1/7 – Kanan sangat lebih' },
  { val: 1/6, label: '1/6 – Kanan 5-7' },
  { val: 1/5, label: '1/5 – Kanan lebih' },
  { val: 1/4, label: '1/4 – Kanan 3-5' },
  { val: 1/3, label: '1/3 – Kanan sedikit lebih' },
  { val: 1/2, label: '1/2 – Kanan 1-3' },
  { val: 1, label: '1 – Sama penting' },
  { val: 2, label: '2 – Kiri 1-3' },
  { val: 3, label: '3 – Kiri sedikit lebih' },
  { val: 4, label: '4 – Kiri 3-5' },
  { val: 5, label: '5 – Kiri lebih' },
  { val: 6, label: '6 – Kiri 5-7' },
  { val: 7, label: '7 – Kiri sangat lebih' },
  { val: 8, label: '8 – Kiri sangat dominan' },
  { val: 9, label: '9 – Kiri mutlak' }
]

// ---- Helper ----
function buatPasangan() {
  const list = []
  for (let i = 0; i < props.alternatifs.length; i++) {
    for (let j = i + 1; j < props.alternatifs.length; j++) {
      const a = props.alternatifs[i].kode
      const b = props.alternatifs[j].kode
      list.push({ a, b, key: `${a}_${b}` })
    }
  }
  return list
}

const pasanganAlt = computed(() => buatPasangan())

function labelKriteria(kode) {
  return props.kriteria.find(k => k.kode === kode)?.nama ?? kode
}

function labelAlternatif(kode) {
  return props.alternatifs.find(a => a.kode === kode)?.nama ?? kode
}

function buildMatrixAlt(kriteriaKode) {
  const n = props.alternatifs.length
  const kodes = props.alternatifs.map(a => a.kode)
  const matrix = Array.from({ length: n }, () => Array(n).fill(1))
  for (const p of pasanganAlt.value) {
    const i = kodes.indexOf(p.a)
    const j = kodes.indexOf(p.b)
    const val = nilaiFormAlt.value[kriteriaKode]?.[p.key] ?? 1
    matrix[i][j] = val
    matrix[j][i] = 1 / val
  }
  return matrix
}

// ---- Computed ----
const semuaTerisi = computed(() => {
  if (!tabAktif.value) return false
  return pasanganAlt.value.every(p => 
    nilaiFormAlt.value[tabAktif.value]?.[p.key] != null &&
    nilaiFormAlt.value[tabAktif.value][p.key] !== 0
  )
})

const isKonsisten = computed(() => {
  if (crAlt.value[tabAktif.value] == null) return false
  return crAlt.value[tabAktif.value] < 0.1
})

// Progress: hanya menghitung nilai yang benar-benar diisi (bukan default 1)
const progress = computed(() => {
  const total = props.kriteria.length * pasanganAlt.value.length
  if (total === 0) return 0
  let terisi = 0
  for (const k of props.kriteria) {
    for (const p of pasanganAlt.value) {
      const val = nilaiFormAlt.value[k.kode]?.[p.key]
      if (val != null && val !== 0) {
        terisi++
      }
    }
  }
  return Math.round((terisi / total) * 100)
})

// Status tab berdasarkan CR (bukan status simpan)
const statusAltComputed = computed(() => {
  const status = {}
  for (const k of props.kriteria) {
    const cr = crAlt.value[k.kode]
    status[k.kode] = cr != null && cr < 0.1
  }
  return status
})

// ---- Methods ----
function initForm() {
  for (const k of props.kriteria) {
    if (!nilaiFormAlt.value[k.kode]) {
      nilaiFormAlt.value[k.kode] = {}
    }
    // Default = null (belum diisi)
    for (const p of pasanganAlt.value) {
      if (nilaiFormAlt.value[k.kode][p.key] == null) {
        nilaiFormAlt.value[k.kode][p.key] = null
      }
    }
  }
}

function hitungKonsistensiAlt() {
  if (!semuaTerisi.value) {
    toast.show('Isi semua perbandingan terlebih dahulu.', 'error')
    return
  }
  const matrix = buildMatrixAlt(tabAktif.value)
  const result = consistencyRatio(matrix)
  crAlt.value = { ...crAlt.value, [tabAktif.value]: result.CR }
  
  // Hitung bobot
  const bobot = eigenvector(matrix)
  const kodes = props.alternatifs.map(a => a.kode)
  bobotAlt.value = {
    ...bobotAlt.value,
    [tabAktif.value]: kodes.map((kode, i) => ({
      kode,
      bobot: bobot[i] || 0
    }))
  }
  
  if (result.CR >= 0.1) {
    toast.show('CR lebih dari 0.1. Perbaiki penilaian Anda.', 'error')
  } else {
    toast.show('Konsisten (CR: ' + result.CR.toFixed(4) + ')', 'ok')
  }
}

async function simpanAlternatif() {
  if (!semuaTerisi.value) return
  
  // Auto-validasi CR saat simpan
  const matrix = buildMatrixAlt(tabAktif.value)
  const result = consistencyRatio(matrix)
  const cr = result.CR
  
  // Simpan CR ke state
  crAlt.value = { ...crAlt.value, [tabAktif.value]: cr }
  
  // Hitung bobot
  const bobot = eigenvector(matrix)
  const kodes = props.alternatifs.map(a => a.kode)
  const bobotArray = kodes.map((kode, i) => ({
    kode,
    bobot: bobot[i] || 0
  }))
  bobotAlt.value = {
    ...bobotAlt.value,
    [tabAktif.value]: bobotArray
  }
  
  // Tolak jika tidak konsisten
  if (cr >= 0.1) {
    toast.show('CR masih lebih dari 0.1. Perbaiki penilaian terlebih dahulu.', 'error')
    return
  }
  
  // Simpan
  loading.value = true
  try {
    await savePenilaianAlternatif(
      props.pakarId,
      tabAktif.value,
      matrix,
      cr,
      bobotArray
    )
    // Status diambil dari computed, tidak perlu set manual
    toast.show(`Alternatif ${tabAktif.value} berhasil disimpan`, 'ok')
    emit('saved')
  } catch (e) {
    toast.show('Gagal menyimpan: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

// ---- Load data ----
async function loadData() {
  const data = await getPenilaianPakar(props.pakarId)
  if (!data?.alternatifMatrix) return

  const kodes = props.alternatifs.map(a => a.kode)
  for (const kKode of Object.keys(data.alternatifMatrix)) {
    const matrix = data.alternatifMatrix[kKode]
    if (!nilaiFormAlt.value[kKode]) nilaiFormAlt.value[kKode] = {}

    for (const p of pasanganAlt.value) {
      const i = kodes.indexOf(p.a)
      const j = kodes.indexOf(p.b)
      if (matrix[i]?.[j] != null) {
        const val = matrix[i][j]
        // Simpan nilai asli, tidak diubah
        nilaiFormAlt.value[kKode][p.key] = val
      }
    }
  }

  // Load CR dan bobot dari Firestore
  if (data.alternatifCR) {
    crAlt.value = { ...data.alternatifCR }
  }
  if (data.alternatifBobot) {
    bobotAlt.value = { ...data.alternatifBobot }
  }
  
  isLoaded.value = true
}

// ---- Lifecycle ----
onMounted(async () => {
  // Inisialisasi form dengan null
  initForm()
  
  // Set tab pertama
  if (props.kriteria.length && !tabAktif.value) {
    tabAktif.value = props.kriteria[0].kode
  }
  
  await loadData()
})
</script>

<style scoped>
.instruksi {
  font-size: 13px;
  color: #333;
  margin-bottom: 16px;
}

.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 0;
  border-bottom: 2px solid #000;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #000;
  border-bottom: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.tab-aktif {
  background: #000;
  color: #fff;
}

.tab-status {
  font-size: 11px;
  margin-left: 2px;
}

.status-ok { color: #008000; }
.status-kosong { color: #999; }

.tab-konten {
  border: 1px solid #000;
  border-top: none;
  padding: 16px;
  overflow-x: auto;
}

.tab-sub-judul {
  font-size: 13px;
  color: #333;
  margin-bottom: 16px;
}

.cr-empty {
  color: #999;
  font-weight: normal;
}

.label-alt {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.select-nilai {
  width: auto;
  min-width: 120px;
  padding: 6px 8px;
  font-size: 13px;
  border: 1px solid #000;
  background: #fff;
}

.hasil-cr {
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid;
}

.cr-ok-box { color: #008000; border-color: #008000; }
.cr-error-box { color: #cc0000; border-color: #cc0000; }
.cr-ok { color: #008000; font-weight: bold; }
.cr-error { color: #cc0000; font-weight: bold; }

.cr-row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.cr-label {
  font-weight: bold;
  font-size: 14px;
}

.cr-status {
  font-size: 14px;
}

.bobot-row {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
}

.bobot-label {
  font-weight: bold;
}

.bobot-item {
  background: #f0f0f0;
  padding: 2px 10px;
  border: 1px solid #ccc;
  border-radius: 0;
}

.peringatan {
  margin-top: 6px;
  font-size: 12px;
  color: #cc0000;
}

.aksi {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.pesan-validasi {
  font-size: 12px;
  color: #cc0000;
  margin-top: 8px;
}

.progress-box {
  margin-top: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 600;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #ddd;
  margin-top: 4px;
  border: 1px solid #000;
}

.progress-fill {
  height: 100%;
  background: #000;
  transition: width 0.3s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>