<template>
  <div>
    <Header />
    <div class="container" style="padding-top:24px;padding-bottom:40px">

      <!-- Loading State -->
      <div v-if="loading" class="loading-box">
        <span class="spinner"></span> Memuat data...
      </div>

      <template v-else>
        <!-- Panel A: Informasi Pakar & Status Pengisian -->
        <div class="panel">
          <div class="panel-header">Panel A – Informasi Pakar &amp; Status Pengisian</div>
          <div class="panel-body">
            <div class="info-pakar">
              <div class="info-row">
                <span class="info-label">Pakar</span>
                <span class="info-val">Pakar {{ store.pakarId }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Nama</span>
                <span class="info-val">{{ store.nama }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Identitas</span>
                <span class="info-val">{{ identitasPakar }}</span>
              </div>
            </div>

            <div class="status-pengisian">
              <div class="status-judul">Status Pengisian</div>

              <!-- Status Kriteria (berdasarkan CR) -->
              <div class="status-item" :class="statusKelas(kriteriaKonsisten)">
                <span class="status-ikon">{{ kriteriaKonsisten ? '[OK]' : '[ ]' }}</span>
                Matriks Kriteria:
                <span class="status-progress">
                  {{ kriteriaKonsisten ? '✅ Konsisten' : '⏳ Belum / Tidak Konsisten' }}
                </span>
              </div>

              <!-- Status Alternatif per Kriteria (berdasarkan CR) -->
              <div
                v-for="k in kriteriaList"
                :key="k.kode"
                class="status-item"
                :class="statusKelas(alternatifKonsisten[k.kode])"
              >
                <span class="status-ikon">{{ alternatifKonsisten[k.kode] ? '[OK]' : '[ ]' }}</span>
                Alternatif {{ k.kode }}:
                <span class="status-progress">
                  <span v-if="alternatifCR[k.kode] != null">
                    CR: {{ alternatifCR[k.kode].toFixed(4) }}
                    <span v-if="alternatifKonsisten[k.kode]" class="status-badge status-ok">✅ Konsisten</span>
                    <span v-else class="status-badge status-error">❌ Tidak Konsisten</span>
                  </span>
                  <span v-else class="status-badge">⏳ Belum dinilai</span>
                </span>
              </div>
            </div>

            <p class="catatan-panduan">
              Setelah semua penilaian diisi dan konsisten, data akan diproses oleh sistem untuk agregasi serta perhitungan AHP akhir.
            </p>
          </div>
        </div>

        <!-- Panel B: Daftar Kriteria -->
        <div class="panel">
          <div class="panel-header">Panel B – Daftar Kriteria</div>
          <div class="panel-body">
            <table v-if="kriteriaList.length">
              <thead>
                <tr><th>Kode</th><th>Nama</th><th>Deskripsi</th></tr>
              </thead>
              <tbody>
                <tr v-for="k in kriteriaList" :key="k.kode">
                  <td><strong>{{ k.kode }}</strong></td>
                  <td>{{ k.nama }}</td>
                  <td class="text-sm">{{ k.deskripsi }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="teks-kosong">Belum ada data kriteria.</p>
          </div>
        </div>

        <!-- Panel C: Daftar Alternatif -->
        <div class="panel">
          <div class="panel-header">Panel C – Daftar Alternatif Kombinasi Tanaman</div>
          <div class="panel-body">
            <table v-if="alternatifList.length">
              <thead>
                <tr><th>Kode</th><th>Nama Kombinasi</th></tr>
              </thead>
              <tbody>
                <tr v-for="a in alternatifList" :key="a.kode">
                  <td><strong>{{ a.kode }}</strong></td>
                  <td>{{ a.nama }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="teks-kosong">Belum ada data alternatif.</p>
          </div>
        </div>

        <!-- Panel D: Form Perbandingan Kriteria -->
        <KriteriaForm
          :kriteria="kriteriaList"
          :pakarId="store.pakarId"
          @saved="onKriteriaSaved"
        />

        <!-- Panel E: Form Perbandingan Alternatif per Kriteria -->
        <AlternatifForm
          :kriteria="kriteriaList"
          :alternatifs="alternatifList"
          :pakarId="store.pakarId"
          @saved="onAlternatifSaved"
        />

        <!-- Panel F: Panduan Skala Saaty -->
        <div class="panel">
          <div class="panel-header">Panduan Pengisian</div>
          <div class="panel-body">
            <table class="tabel-panduan">
              <thead>
                <tr><th>Nilai</th><th>Makna</th></tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Sama penting</td></tr>
                <tr><td>3</td><td>Sedikit lebih penting</td></tr>
                <tr><td>5</td><td>Lebih penting</td></tr>
                <tr><td>7</td><td>Sangat lebih penting</td></tr>
                <tr><td>9</td><td>Mutlak lebih penting</td></tr>
                <tr><td>2,4,6,8</td><td>Nilai tengah di antara dua penilaian di atas</td></tr>
                <tr><td>1/3, 1/5, 1/7, 1/9</td><td>Kebalikan (jika elemen kanan lebih penting)</td></tr>
              </tbody>
            </table>
            <p class="teks-kecil" style="margin-top: 12px;">
              Semakin tinggi angka, semakin besar tingkat kepentingan elemen kiri dibandingkan elemen kanan dalam pasangan tersebut.
              Gunakan nilai pecahan (1/3, 1/5, dst.) jika elemen kanan yang lebih penting.
            </p>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Header from '../components/common/Header.vue'
import KriteriaForm from '../components/pakar/KriteriaForm.vue'
import AlternatifForm from '../components/pakar/AlternatifForm.vue'
import { useAuthStore } from '../store.js'
import { getKriteria, getAlternatif, getPenilaianPakar } from '../firebase.js'

const store = useAuthStore()
const loading = ref(true)
const kriteriaList = ref([])
const alternatifList = ref([])
const penilaian = ref(null)

const identitasPakar = computed(() => {
  const map = { 1: 'Penyuluh Pertanian', 2: 'Petani Berpengalaman (min. 10 tahun)', 3: 'Akademisi (Dosen Agronomi)' }
  return map[store.pakarId] ?? '-'
})

// ---- Status Kriteria (berdasarkan CR) ----
const kriteriaKonsisten = computed(() => {
  return !!penilaian.value?.kriteriaMatrix && penilaian.value?.kriteriaCR < 0.1
})

// ---- Status Alternatif per Kriteria (berdasarkan CR) ----
const alternatifCR = computed(() => {
  return penilaian.value?.alternatifCR || {}
})

const alternatifKonsisten = computed(() => {
  const status = {}
  for (const k of kriteriaList.value) {
    const cr = alternatifCR.value[k.kode]
    status[k.kode] = cr != null && cr < 0.1
  }
  return status
})

// ---- Fungsi Status ----
function statusKelas(ok) {
  return ok ? 'status-ok' : 'status-belum'
}

// ---- Reload penilaian ----
async function muatPenilaian() {
  penilaian.value = await getPenilaianPakar(store.pakarId)
}

function onKriteriaSaved() {
  muatPenilaian()
}

function onAlternatifSaved() {
  muatPenilaian()
}

// ---- Load Data ----
onMounted(async () => {
  loading.value = true
  try {
    const [k, a, p] = await Promise.all([
      getKriteria(),
      getAlternatif(),
      getPenilaianPakar(store.pakarId)
    ])
    kriteriaList.value = k || []
    alternatifList.value = a || []
    penilaian.value = p || null
  } catch (error) {
    console.error('Gagal memuat data:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.loading-box {
  padding: 40px 20px;
  text-align: center;
  font-size: 16px;
  border: 2px solid #000;
  background: #f9f9f9;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #ccc;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 12px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.teks-kosong {
  color: #666;
  font-style: italic;
}

.text-sm {
  font-size: 13px;
  color: #333;
}

.info-pakar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  max-width: 500px;
}

.info-row {
  display: flex;
  gap: 12px;
  font-size: 14px;
}

.info-label {
  min-width: 80px;
  font-weight: 600;
  color: #333;
}

.info-val {
  color: #000;
}

.status-pengisian {
  margin-bottom: 16px;
}

.status-judul {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 4px;
}

.status-item {
  font-size: 13px;
  padding: 4px 8px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-ok { color: #008000; }
.status-belum { color: #666; }

.status-ikon {
  font-size: 14px;
  font-weight: bold;
}

.status-progress {
  font-size: 13px;
  color: #333;
}

.status-badge {
  font-size: 12px;
  font-weight: bold;
  margin-left: 4px;
}

.status-error {
  color: #cc0000;
}

.catatan-panduan {
  font-size: 12px;
  color: #333;
  font-style: italic;
  margin-top: 8px;
}

/* Tabel Panduan */
.tabel-panduan {
  max-width: 500px;
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
}

.tabel-panduan th,
.tabel-panduan td {
  border: 1px solid #000;
  padding: 6px 12px;
  text-align: left;
}

.tabel-panduan th {
  background: #000;
  color: #fff;
}

.teks-kecil {
  font-size: 12px;
  color: #333;
}
</style>