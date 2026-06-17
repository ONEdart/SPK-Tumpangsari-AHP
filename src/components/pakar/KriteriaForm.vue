<template>
  <div class="panel">
    <div class="panel-header">Panel B – Perbandingan Kriteria</div>
    <div class="panel-body">

      <p class="instruksi">
        Isi perbandingan berpasangan antar kriteria. Pilih nilai untuk menunjukkan arah dan tingkat kepentingan.
      </p>

      <!-- Tabel 3 kolom -->
      <table class="tabel-ahp">
        <thead>
          <tr>
            <th>Kriteria A</th>
            <th>Tingkat Kepentingan</th>
            <th>Kriteria B</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in pasangan" :key="p.key">
            <td>
              <strong>{{ p.a }}</strong>
              <div class="label-nama">{{ labelKriteria(p.a) }}</div>
            </td>
            <td>
              <select v-model="nilaiForm[p.key]" class="select-nilai" @change="onNilaiChange">
                <option v-for="s in skala" :key="s.val" :value="s.val">
                  {{ s.label }}
                </option>
              </select>
            </td>
            <td>
              <strong>{{ p.b }}</strong>
              <div class="label-nama">{{ labelKriteria(p.b) }}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Loading state -->
      <div v-if="loading" class="loading-box">Memproses...</div>

      <!-- Hasil Konsistensi -->
      <div v-if="hasilCR !== null" class="hasil-cr" :class="konsisten ? 'cr-ok' : 'cr-error'">
        <div class="cr-row">
          <span class="cr-label">CR: {{ hasilCR.toFixed(4) }}</span>
          <span class="cr-status">{{ konsisten ? '[OK] Konsisten' : '[X] Tidak Konsisten' }}</span>
        </div>
        <div v-if="konsisten && bobotKriteria.length" class="bobot-row">
          <span class="bobot-label">Bobot Kriteria:</span>
          <span v-for="b in bobotKriteria" :key="b.kode" class="bobot-item">
            {{ b.kode }} = {{ (b.bobot * 100).toFixed(1) }}%
          </span>
        </div>
        <div v-if="!konsisten && hasilCR !== null" class="peringatan">
          Mohon periksa kembali penilaian Anda. CR harus kurang dari 0.1.
        </div>
      </div>

      <!-- Aksi -->
      <div class="aksi">
        <button class="btn btn-outline" @click="hitungKonsistensi" :disabled="loading || !semuaTerisi">
          Hitung Konsistensi &amp; Bobot
        </button>
        <button class="btn" @click="simpanKriteria" :disabled="loading || !semuaTerisi || !konsisten">
          {{ loading ? 'Menyimpan...' : 'Simpan Kriteria' }}
        </button>
      </div>

      <p v-if="!semuaTerisi" class="pesan-validasi">Isi semua perbandingan sebelum menghitung.</p>
      <p v-if="semuaTerisi && !konsisten && hasilCR !== null" class="pesan-validasi">
        CR harus &lt; 0.1 sebelum menyimpan.
      </p>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { savePenilaianKriteria, getPenilaianPakar } from '../../firebase.js'
import { consistencyRatio, eigenvector } from '../../composables/useAHP.js'
import { useToast } from '../../composables/useToast.js'

const props = defineProps({
  kriteria: { type: Array, default: () => [] },
  pakarId: { type: Number, required: true },
})

const emit = defineEmits(['saved'])
const toast = useToast()
const loading = ref(false)
const hasilCR = ref(null)
const konsisten = ref(false)
const bobotKriteria = ref([])

// Skala AHP dua arah (reciprocal)
const skala = [
  { val: 1/9, label: '1/9 – Mutlak B lebih penting' },
  { val: 1/8, label: '1/8 – Antara 1/7–1/9' },
  { val: 1/7, label: '1/7 – Sangat lebih penting B' },
  { val: 1/6, label: '1/6 – Antara 1/5–1/7' },
  { val: 1/5, label: '1/5 – Lebih penting B' },
  { val: 1/4, label: '1/4 – Antara 1/3–1/5' },
  { val: 1/3, label: '1/3 – Sedikit lebih penting B' },
  { val: 1/2, label: '1/2 – Antara 1–1/3' },
  { val: 1, label: '1 – Sama penting' },
  { val: 2, label: '2 – Antara 1–3' },
  { val: 3, label: '3 – Sedikit lebih penting A' },
  { val: 4, label: '4 – Antara 3–5' },
  { val: 5, label: '5 – Lebih penting A' },
  { val: 6, label: '6 – Antara 5–7' },
  { val: 7, label: '7 – Sangat lebih penting A' },
  { val: 8, label: '8 – Antara 7–9' },
  { val: 9, label: '9 – Mutlak lebih penting A' },
]

const pasangan = computed(() => {
  const list = []
  for (let i = 0; i < props.kriteria.length; i++) {
    for (let j = i + 1; j < props.kriteria.length; j++) {
      const a = props.kriteria[i].kode
      const b = props.kriteria[j].kode
      list.push({ a, b, key: `${a}_${b}` })
    }
  }
  return list
})

const nilaiForm = ref({})

// Inisialisasi: set default ke null, bukan 1
watch(pasangan, (ps) => {
  for (const p of ps) {
    if (nilaiForm.value[p.key] == null) {
      nilaiForm.value[p.key] = null // Pakar harus memilih sendiri
    }
  }
}, { immediate: true })

// Cek semua terisi (tidak boleh null atau 0)
const semuaTerisi = computed(() => {
  return pasangan.value.every(p => {
    const val = nilaiForm.value[p.key]
    return val != null && val !== 0
  })
})

function labelKriteria(kode) {
  return props.kriteria.find(k => k.kode === kode)?.nama ?? kode
}

function buildMatrix() {
  const n = props.kriteria.length
  const kodes = props.kriteria.map(k => k.kode)
  const matrix = Array.from({ length: n }, () => Array(n).fill(1))
  for (const p of pasangan.value) {
    const i = kodes.indexOf(p.a)
    const j = kodes.indexOf(p.b)
    const val = Number(nilaiForm.value[p.key]) || 1
    matrix[i][j] = val
    matrix[j][i] = 1 / val
  }
  return matrix
}

function onNilaiChange() {
  // Reset hasil CR saat nilai diubah
  if (hasilCR.value !== null) {
    hasilCR.value = null
    konsisten.value = false
    bobotKriteria.value = []
  }
}

function hitungKonsistensi() {
  if (!semuaTerisi.value) return
  const matrix = buildMatrix()
  const cr = consistencyRatio(matrix)
  const bobot = eigenvector(matrix)
  hasilCR.value = cr.CR
  konsisten.value = cr.consistent

  const kodes = props.kriteria.map(k => k.kode)
  bobotKriteria.value = kodes.map((kode, i) => ({
    kode,
    bobot: bobot[i] || 0
  }))
}

async function simpanKriteria() {
  if (!semuaTerisi.value) return
  
  // Auto-validasi CR saat simpan
  const matrix = buildMatrix()
  const cr = consistencyRatio(matrix)
  const crValue = cr.CR
  
  // Update state
  hasilCR.value = crValue
  konsisten.value = cr.consistent
  
  // Hitung bobot untuk disimpan
  const bobot = eigenvector(matrix)
  const kodes = props.kriteria.map(k => k.kode)
  const bobotArray = kodes.map((kode, i) => ({
    kode,
    bobot: bobot[i] || 0
  }))
  bobotKriteria.value = bobotArray

  // Tolak jika tidak konsisten
  if (!cr.consistent) {
    toast.show('CR harus < 0.1 sebelum menyimpan', 'error')
    return
  }

  loading.value = true
  try {
    // Simpan matrix, CR, dan bobot
    await savePenilaianKriteria(
      props.pakarId, 
      matrix, 
      cr.CR, 
      cr.consistent,
      bobotArray
    )
    toast.show('Data kriteria berhasil disimpan', 'ok')
    emit('saved')
  } catch (e) {
    toast.show('Gagal menyimpan: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

// Muat data yang sudah tersimpan
onMounted(async () => {
  const data = await getPenilaianPakar(props.pakarId)
  if (data?.kriteriaMatrix) {
    const kodes = props.kriteria.map(k => k.kode)
    for (const p of pasangan.value) {
      const i = kodes.indexOf(p.a)
      const j = kodes.indexOf(p.b)
      if (data.kriteriaMatrix[i]?.[j] != null) {
        const val = data.kriteriaMatrix[i][j]
        // Simpan nilai asli, tidak dibulatkan
        nilaiForm.value[p.key] = val
      }
    }
    if (data.kriteriaCR != null) {
      hasilCR.value = data.kriteriaCR
      konsisten.value = data.kriteriaCR < 0.1
      // Hitung bobot dari matriks yang ada
      const matrix = buildMatrix()
      const bobot = eigenvector(matrix)
      const kodes = props.kriteria.map(k => k.kode)
      bobotKriteria.value = kodes.map((kode, i) => ({
        kode,
        bobot: bobot[i] || 0
      }))
    }
  }
  // Jika data belum ada, default ke null sudah di handle di watch
})
</script>

<style scoped>
.instruksi {
  font-size: 13px;
  color: #333;
  margin-bottom: 16px;
}

.tabel-ahp {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
}

.tabel-ahp th {
  background: #000;
  color: #fff;
  padding: 8px 12px;
  text-align: left;
  font-size: 13px;
}

.tabel-ahp td {
  padding: 8px 12px;
  border-bottom: 1px solid #ccc;
  vertical-align: middle;
}

.tabel-ahp tr:nth-child(even) td {
  background: #f5f5f5;
}

.label-nama {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.select-nilai {
  width: 100%;
  min-width: 180px;
  padding: 6px 8px;
  font-size: 12px;
  border: 1px solid #000;
  background: #fff;
}

.loading-box {
  padding: 10px 14px;
  font-size: 13px;
  color: #333;
  border: 1px solid #ccc;
  margin-top: 16px;
}

.hasil-cr {
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid;
}

.cr-ok {
  color: #008000;
  border-color: #008000;
}

.cr-error {
  color: #cc0000;
  border-color: #cc0000;
}

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
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
}

.bobot-label {
  font-weight: bold;
}

.bobot-item {
  background: #f0f0f0;
  padding: 2px 8px;
  border: 1px solid #ccc;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>