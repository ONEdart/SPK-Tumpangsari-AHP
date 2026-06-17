<template>
  <div>
    <Header />
    <div class="container" style="margin-top:24px">

      <!-- Grid: Alternatif + User -->
      <div class="grid-2">
        <AlternatifManager />
        <UserManager />
      </div>

      <!-- Panel C: Monitoring Penilaian Pakar -->
      <div class="panel">
        <div class="panel-header">
          <span>Monitoring Penilaian Pakar</span>
          <button class="btn btn-sm" style="background:white;color:black;" @click="loadMonitoring" :disabled="monLoading">
            <span v-if="monLoading" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else>↻ Refresh</span>
          </button>
        </div>
        <div class="panel-body">
          <div v-if="monLoading" class="flex-center" style="padding:24px"><span class="spinner"></span></div>
          <div v-else>
            <table>
              <thead>
                <tr>
                  <th>Pakar</th>
                  <th>Kriteria</th>
                  <th>CR Kriteria</th>
                  <th v-for="k in kriteriaList" :key="k.kode">Alt {{ k.kode }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pakar in pakarUsers" :key="pakar.uid">
                  <td>
                    <strong>{{ pakar.nama || 'Pakar ' + pakar.pakarId }}</strong>
                    <div class="text-muted" style="font-size:11px;font-weight:normal">
                      {{ pakar.email }}
                    </div>
                  </td>
                  <td>
                    <span v-if="penilaian[pakar.pakarId]?.kriteriaMatrix" class="badge badge-success">✓ Terisi</span>
                    <span v-else class="badge badge-pending">✗ Kosong</span>
                  </td>
                  <td>
                    <span v-if="penilaian[pakar.pakarId]?.kriteriaCR != null">
                      <span :class="penilaian[pakar.pakarId].kriteriaKonsisten ? 'text-green' : 'text-red'">
                        {{ penilaian[pakar.pakarId].kriteriaCR.toFixed(4) }}
                        {{ penilaian[pakar.pakarId].kriteriaKonsisten ? '✓' : '✗' }}
                      </span>
                    </span>
                    <span v-else class="text-muted">–</span>
                  </td>
                  <td v-for="k in kriteriaList" :key="k.kode">
                    <span v-if="penilaian[pakar.pakarId]?.alternatifMatrix?.[k.kode]" class="badge badge-success">✓</span>
                    <span v-else class="badge badge-pending">✗</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="mt-md">
              <button class="btn btn-outline btn-sm" @click="showDetail = !showDetail">
                {{ showDetail ? '▲ Sembunyikan' : '▼ Lihat Detail Matriks' }}
              </button>
            </div>

            <!-- Detail per pakar -->
            <div v-if="showDetail" class="mt-md">
              <div v-for="pakar in pakarUsers" :key="pakar.uid" style="margin-bottom:24px">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:8px;border-bottom:1px solid #ccc;padding-bottom:4px">
                  {{ pakar.nama || 'Pakar ' + pakar.pakarId }} – {{ identitasPakar(pakar.pakarId) }}
                </h4>
                <div v-if="!penilaian[pakar.pakarId]" class="text-muted">Belum ada data.</div>
                <div v-else>
                  <p class="text-muted mb-sm">Matriks Kriteria:</p>
                  <div style="overflow-x:auto">
                    <table v-if="penilaian[pakar.pakarId].kriteriaMatrix" style="width:auto">
                      <thead>
                        <tr><th></th><th v-for="k in kriteriaList" :key="k.kode">{{ k.kode }}</th></tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, i) in penilaian[pakar.pakarId].kriteriaMatrix" :key="i">
                          <td><strong>{{ kriteriaList[i]?.kode }}</strong></td>
                          <td v-for="(val, j) in row" :key="j">{{ typeof val === 'number' ? val.toFixed(3) : val }}</td>
                        </tr>
                      </tbody>
                    </table>
                    <span v-else class="text-muted">Belum diisi.</span>
                  </div>

                  <p class="text-muted mb-sm mt-md">Matriks Alternatif per Kriteria:</p>
                  <div v-if="penilaian[pakar.pakarId].alternatifMatrix">
                    <div v-for="k in kriteriaList" :key="k.kode" style="margin-bottom:12px">
                      <p style="font-size:12px;font-weight:600">{{ k.kode }} – {{ k.nama }}</p>
                      <table v-if="penilaian[pakar.pakarId].alternatifMatrix[k.kode]" style="width:auto">
                        <thead>
                          <tr><th></th><th v-for="alt in alternatifList" :key="alt.kode">{{ alt.kode }}</th></tr>
                        </thead>
                        <tbody>
                          <tr v-for="(row, i) in penilaian[pakar.pakarId].alternatifMatrix[k.kode]" :key="i">
                            <td><strong>{{ alternatifList[i]?.kode }}</strong></td>
                            <td v-for="(val, j) in row" :key="j">{{ typeof val === 'number' ? val.toFixed(3) : val }}</td>
                          </tr>
                        </tbody>
                      </table>
                      <span v-else class="text-muted">Belum diisi.</span>
                    </div>
                  </div>
                  <span v-else class="text-muted">Belum ada data alternatif.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel D: Backup & Restore -->
      <div class="panel">
        <div class="panel-header">Backup &amp; Restore Data</div>
        <div class="panel-body">
          <p class="text-muted mb-md">Ekspor semua data aplikasi ke file JSON untuk backup, atau impor dari file backup.</p>
          <div class="flex-gap">
            <button class="btn" @click="handleExport" :disabled="exporting">
              <span v-if="exporting" class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:white"></span>
              <span v-else>↓ Ekspor Data (JSON)</span>
            </button>
            <label class="btn btn-outline" style="cursor:pointer">
              ↑ Impor Data (JSON)
              <input type="file" accept=".json" @change="handleImport" style="display:none" ref="importInput" />
            </label>
          </div>
          <div v-if="importMsg" class="alert mt-md" :class="importMsg.ok ? 'alert-success' : 'alert-error'">
            {{ importMsg.text }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Header from '../components/common/Header.vue'
import AlternatifManager from '../components/admin/AlternatifManager.vue'
import UserManager from '../components/admin/UserManager.vue'
import { getAllPenilaian, getKriteria, getAlternatif, getAllUsers, exportAllData, importAllData } from '../firebase.js'
import { useToast } from '../composables/useToast.js'

const { show } = useToast()
const kriteriaList    = ref([])
const alternatifList  = ref([])
const penilaian       = ref({})
const pakarUsers      = ref([])
const monLoading      = ref(false)
const showDetail      = ref(false)
const exporting       = ref(false)
const importMsg       = ref(null)
const importInput     = ref(null)

const identitasPakar = (id) => {
  const map = { 1: 'Penyuluh Pertanian', 2: 'Petani Berpengalaman (min. 10 tahun)', 3: 'Akademisi (Dosen Agronomi)' }
  return map[id] || '-'
}

async function loadMonitoring() {
  monLoading.value = true
  try {
    const [kriteria, alternatif, users, penilaianData] = await Promise.all([
      getKriteria(),
      getAlternatif(),
      getAllUsers(),
      getAllPenilaian()
    ])
    kriteriaList.value = kriteria || []
    alternatifList.value = alternatif || []

    // Filter user dengan role pakar
    pakarUsers.value = users.filter(u => u.role === 'pakar').sort((a, b) => (a.pakarId || 0) - (b.pakarId || 0))

    // Mapping penilaian per pakarId
    const penilaianMap = {}
    for (const p of penilaianData) {
      if (p.pakarId) penilaianMap[p.pakarId] = p
    }
    penilaian.value = penilaianMap
  } catch (error) {
    console.error('Gagal load monitoring:', error)
    show('Gagal memuat data monitoring', 'error')
  } finally {
    monLoading.value = false
  }
}

onMounted(loadMonitoring)

async function handleExport() {
  exporting.value = true
  try {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `spk-tumpangsari-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    show('Data berhasil diekspor')
  } catch {
    show('Gagal mengekspor data.', 'error')
  } finally {
    exporting.value = false
  }
}

async function handleImport(e) {
  importMsg.value = null
  const file = e.target.files?.[0]
  if (!file) return
  if (!confirm('Impor data akan menimpa data yang ada. Lanjutkan?')) {
    if (importInput.value) importInput.value.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result)
      await importAllData(data)
      importMsg.value = { ok: true, text: 'Data berhasil diimpor.' }
      show('Data berhasil diimpor')
      await loadMonitoring()
    } catch (err) {
      importMsg.value = { ok: false, text: 'Gagal impor: ' + err.message }
    } finally {
      if (importInput.value) importInput.value.value = ''
    }
  }
  reader.readAsText(file)
}
</script>