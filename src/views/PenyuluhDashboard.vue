<template>
  <div>
    <Header />
    <div class="container" style="padding-top:24px;padding-bottom:40px">

      <!-- Loading State -->
      <div v-if="loading" class="loading-box">
        <span class="spinner"></span> Memuat data...
      </div>

      <template v-else>
        <!-- Panel A: Kriteria -->
        <div class="panel">
          <div class="panel-header">Panel A – Kriteria Agronomis</div>
          <div class="panel-body">
            <table v-if="kriteria.length">
              <thead>
                <tr><th>Kode</th><th>Nama</th><th>Deskripsi</th></tr>
              </thead>
              <tbody>
                <tr v-for="k in kriteria" :key="k.kode">
                  <td><strong>{{ k.kode }}</strong></td>
                  <td>{{ k.nama }}</td>
                  <td class="text-sm">{{ k.deskripsi }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="teks-kosong">Belum ada data kriteria.</p>
          </div>
        </div>

        <!-- Panel B: Alternatif -->
        <div class="panel">
          <div class="panel-header">Panel B – Alternatif Kombinasi Tanaman</div>
          <div class="panel-body">
            <table v-if="alternatifs.length">
              <thead>
                <tr><th>Kode</th><th>Nama Kombinasi</th></tr>
              </thead>
              <tbody>
                <tr v-for="a in alternatifs" :key="a.kode">
                  <td><strong>{{ a.kode }}</strong></td>
                  <td>{{ a.nama }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="teks-kosong">Belum ada data alternatif.</p>
          </div>
        </div>

        <!-- Panel C: Bobot Kriteria Hasil AHP -->
        <div class="panel" v-if="bobotKriteria.length">
          <div class="panel-header">Panel C – Bobot Kriteria Hasil AHP</div>
          <div class="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Kriteria</th>
                  <th>Bobot</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in bobotKriteria" :key="item.kode">
                  <td><strong>{{ item.nama }}</strong></td>
                  <td>{{ item.bobot.toFixed(4) }}</td>
                </tr>
              </tbody>
            </table>
            <p class="text-sm" style="margin-top:8px;">
              Bobot dihitung dari penilaian 3 pakar menggunakan metode AHP (Analytic Hierarchy Process).
            </p>
          </div>
        </div>

        <!-- Panel D: Hasil Ranking & Rekomendasi -->
        <div class="panel" v-if="ranking.length">
          <div class="panel-header">Panel D – Hasil Ranking &amp; Rekomendasi</div>
          <div class="panel-body">
            <ol class="ranking-list">
              <li 
                v-for="(item, idx) in ranking" 
                :key="item.kode" 
                :class="{ 'ranking-terbaik': idx === 0 }"
              >
                <strong>{{ item.nama }}</strong> – Bobot Global: <strong>{{ item.bobot.toFixed(4) }}</strong>
              </li>
            </ol>
            <div class="kotak-rekomendasi">
              <div class="rek-label">REKOMENDASI UTAMA</div>
              <div class="rek-nama">{{ ranking[0]?.nama || '-' }}</div>
              <div class="rek-bobot">Bobot: {{ ranking[0]?.bobot?.toFixed(4) || '-' }}</div>
            </div>
          </div>
        </div>

        <!-- Panel Informasi jika belum ada hasil -->
        <div class="panel" v-if="!bobotKriteria.length && !ranking.length">
          <div class="panel-header">Informasi</div>
          <div class="panel-body">
            <p class="teks-kosong">
              Belum ada hasil perhitungan AHP. 
              Pastikan semua pakar telah mengisi dan menyimpan penilaian yang konsisten.
            </p>
          </div>
        </div>

        <!-- Panel E: Cetak Laporan -->
        <CetakLaporan />
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Header from '../components/common/Header.vue'
import CetakLaporan from '../components/penyuluh/CetakLaporan.vue'
import { getKriteria, getAlternatif, getHasilPerhitungan } from '../firebase.js'

const kriteria = ref([])
const alternatifs = ref([])
const ranking = ref([])
const bobotKriteria = ref([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    const [k, a, hasil] = await Promise.all([
      getKriteria(),
      getAlternatif(),
      getHasilPerhitungan()
    ])
    kriteria.value = k || []
    alternatifs.value = a || []

    // Ambil ranking
    if (hasil?.ranking) {
      ranking.value = hasil.ranking
    }

    // Ambil bobot kriteria
    if (hasil?.bobotKriteria) {
      // Jika bobotKriteria berupa object { C1: 0.35, C2: 0.28, ... }
      if (!Array.isArray(hasil.bobotKriteria)) {
        const bobotObj = hasil.bobotKriteria
        bobotKriteria.value = Object.keys(bobotObj).map(kode => {
          const krit = kriteria.value.find(k => k.kode === kode)
          return {
            kode,
            nama: krit?.nama || kode,
            bobot: bobotObj[kode] || 0
          }
        }).sort((a, b) => b.bobot - a.bobot)
      } else {
        // Jika bobotKriteria sudah berupa array [{ kode, nama, bobot }]
        bobotKriteria.value = hasil.bobotKriteria
      }
    }
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

.ranking-list {
  margin: 0 0 20px 20px;
  padding: 0;
}

.ranking-list li {
  margin-bottom: 8px;
  font-size: 14px;
}

.ranking-terbaik {
  font-size: 15px !important;
  background: #f5f5f5;
  padding: 6px 10px;
  border-left: 4px solid #000;
}

.kotak-rekomendasi {
  border: 2px solid #000;
  padding: 16px 20px;
  display: inline-block;
  margin-top: 8px;
}

.rek-label {
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #333;
  margin-bottom: 4px;
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
</style>