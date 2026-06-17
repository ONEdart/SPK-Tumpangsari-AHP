<template>
  <div class="panel">
    <div class="panel-header">Panel E – Cetak Laporan &amp; Ekspor</div>
    <div class="panel-body">

      <!-- Area cetak -->
      <div id="area-cetak">
        <div class="cetak-header">
          <h1 class="cetak-judul">SISTEM PENDUKUNG KEPUTUSAN</h1>
          <h2 class="cetak-subjudul">Pemilihan Kombinasi Tanaman Tumpangsari – Metode AHP</h2>
          <div class="cetak-meta">
            <span>Dicetak oleh: {{ userNama }}</span>
            <span>Tanggal: {{ tanggalCetak }}</span>
          </div>
          <hr class="cetak-divider" />
        </div>

        <div v-if="!hasil" class="cetak-kosong">
          <p>Belum ada data hasil perhitungan. Silakan tunggu hingga proses perhitungan selesai.</p>
        </div>

        <template v-else>
          <!-- Kriteria -->
          <section class="cetak-section">
            <h3 class="cetak-section-title">1. Kriteria Agronomis</h3>
            <table class="cetak-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Kriteria</th>
                  <th>Bobot</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="k in kriteriaList" :key="k.kode">
                  <td>{{ k.kode }}</td>
                  <td>{{ k.nama }}</td>
                  <td>{{ bobotKriteria(k.kode) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Bobot Alternatif per Kriteria -->
          <section class="cetak-section">
            <h3 class="cetak-section-title">2. Bobot Alternatif per Kriteria</h3>
            <table class="cetak-table">
              <thead>
                <tr>
                  <th>Alternatif</th>
                  <th v-for="k in kriteriaList" :key="k.kode">{{ k.kode }}</th>
                  <th>Bobot Global</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="alt in alternatifList" :key="alt.kode">
                  <td>{{ alt.kode }} – {{ alt.nama }}</td>
                  <td v-for="k in kriteriaList" :key="k.kode">
                    {{ bobotAltKriteria(k.kode, alt.kode) }}
                  </td>
                  <td><strong>{{ bobotGlobal(alt.kode) }}</strong></td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Konsistensi Agregat -->
          <section class="cetak-section">
            <h3 class="cetak-section-title">3. Uji Konsistensi Agregat</h3>
            <p>
              Consistency Ratio (CR) Kriteria:
              <strong>{{ hasil.agregatKriteriaCR?.toFixed(4) ?? '-' }}</strong>
              <span v-if="hasil.agregatKriteriaKonsisten" class="badge-ok">[OK] Konsisten</span>
              <span v-else class="badge-error">[X] Tidak Konsisten</span>
            </p>
          </section>

          <!-- Ranking -->
          <section class="cetak-section">
            <h3 class="cetak-section-title">4. Peringkat Alternatif</h3>
            <table class="cetak-table">
              <thead>
                <tr>
                  <th>Peringkat</th>
                  <th>Kombinasi Tanaman</th>
                  <th>Bobot Global</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in rankingList" :key="item.kode" :class="{ 'row-terbaik': idx === 0 }">
                  <td>{{ idx + 1 }}</td>
                  <td>{{ item.kode }} – {{ item.nama }}</td>
                  <td>{{ item.bobot.toFixed(4) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Rekomendasi -->
          <section class="cetak-section">
            <h3 class="cetak-section-title">5. Rekomendasi</h3>
            <div class="kotak-rekomendasi">
              <div class="rek-label">REKOMENDASI TERBAIK</div>
              <div class="rek-nama">{{ rankingList[0]?.nama ?? '-' }}</div>
              <div class="rek-bobot">Bobot Global: {{ rankingList[0]?.bobot?.toFixed(4) ?? '-' }}</div>
            </div>
          </section>

          <div class="cetak-footer">
            <p>Dokumen ini dihasilkan oleh Sistem Pendukung Keputusan SPK Tumpangsari AHP.</p>
          </div>
        </template>
      </div>

      <!-- Tombol aksi (disembunyikan saat cetak) -->
      <div class="aksi-cetak no-print">
        <button class="btn" @click="cetakPDF" :disabled="!hasil">Cetak Rekomendasi (PDF)</button>
        <button class="btn btn-outline" @click="eksporJSON" :disabled="!hasil">Ekspor Data Hasil (JSON)</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '../../store.js'
import { getHasilPerhitungan, getKriteria, getAlternatif } from '../../firebase.js'

const store = useAuthStore()
const userNama = computed(() => store.nama || 'Penyuluh')
const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

const hasil = ref(null)
const kriteriaList = ref([])
const alternatifList = ref([])
const rankingList = ref([])

async function loadData() {
  try {
    const [kriteria, alternatif, hasilData] = await Promise.all([
      getKriteria(),
      getAlternatif(),
      getHasilPerhitungan()
    ])
    kriteriaList.value = kriteria || []
    alternatifList.value = alternatif || []
    hasil.value = hasilData || null
    if (hasilData?.ranking) {
      rankingList.value = hasilData.ranking
    }
  } catch (error) {
    console.error('Gagal memuat data cetak:', error)
  }
}

onMounted(() => {
  loadData()
})

function bobotKriteria(kode) {
  const val = hasil.value?.bobotKriteria?.[kode]
  return val != null ? (val * 100).toFixed(2) + '%' : '-'
}

function bobotAltKriteria(kriteriaKode, altKode) {
  const val = hasil.value?.bobotAlternatifPerKriteria?.[kriteriaKode]?.[altKode]
  return val != null ? val.toFixed(4) : '-'
}

function bobotGlobal(altKode) {
  const val = hasil.value?.bobotGlobalAlternatif?.[altKode]
  return val != null ? val.toFixed(4) : '-'
}

function cetakPDF() {
  window.print()
}

function eksporJSON() {
  const data = {
    tanggalEkspor: new Date().toISOString(),
    kriteria: kriteriaList.value,
    alternatifs: alternatifList.value,
    hasil: hasil.value,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spk-tumpangsari-hasil-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.aksi-cetak {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.cetak-header {
  margin-bottom: 20px;
}

.cetak-judul {
  font-size: 18px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cetak-subjudul {
  font-size: 14px;
  font-weight: normal;
  margin-top: 4px;
}

.cetak-meta {
  font-size: 13px;
  color: #333;
  margin-top: 8px;
  display: flex;
  gap: 24px;
}

.cetak-divider {
  border: none;
  border-top: 2px solid #000;
  margin: 16px 0;
}

.cetak-section {
  margin-bottom: 24px;
}

.cetak-section-title {
  font-size: 14px;
  font-weight: bold;
  border-bottom: 1px solid #000;
  padding-bottom: 4px;
  margin-bottom: 12px;
}

.cetak-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  font-size: 13px;
}

.cetak-table th {
  background: #000;
  color: #fff;
  padding: 6px 10px;
  text-align: left;
}

.cetak-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #ccc;
}

.cetak-table tr:nth-child(even) td {
  background: #f5f5f5;
}

.row-terbaik td {
  font-weight: bold;
  background: #f0f0f0 !important;
}

.kotak-rekomendasi {
  border: 2px solid #000;
  padding: 16px 20px;
  display: inline-block;
  min-width: 280px;
}

.rek-label {
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1.5px;
  color: #333;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.rek-nama {
  font-size: 20px;
  font-weight: bold;
}

.rek-bobot {
  font-size: 13px;
  color: #333;
  margin-top: 4px;
}

.cetak-footer {
  font-size: 11px;
  color: #666;
  border-top: 1px solid #ccc;
  padding-top: 12px;
  margin-top: 24px;
}

.cetak-kosong {
  color: #666;
  font-style: italic;
  padding: 16px 0;
}

.badge-ok {
  color: #008000;
  font-weight: bold;
}

.badge-error {
  color: #cc0000;
  font-weight: bold;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media print {
  .no-print {
    display: none !important;
  }

  .panel {
    border: 1px solid #000 !important;
    break-inside: avoid;
  }

  .panel-header {
    background: #000 !important;
    color: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .cetak-table th {
    background: #000 !important;
    color: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .row-terbaik td {
    background: #f0f0f0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .badge-ok {
    color: #008000 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .badge-error {
    color: #cc0000 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>