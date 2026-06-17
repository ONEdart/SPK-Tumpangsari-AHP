/**
 * firebase.js
 * Semua operasi Firebase: Auth + Firestore
 */
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const logoutUser = () => signOut(auth)

export const onAuth = (cb) => onAuthStateChanged(auth, cb)

export const resetPasswordUser = (email) =>
  sendPasswordResetEmail(auth, email)

/**
 * Buat akun baru via Firebase REST API (agar admin tidak ter-logout)
 * Mengembalikan UID user baru
 */
export async function createUser(email, password, userData) {
  // Gunakan REST API agar sesi admin tetap aktif
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false })
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const uid = data.localId
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    nama:      userData.nama,
    role:      userData.role,
    pakarId:   userData.pakarId ?? null,
    createdAt: serverTimestamp()
  })
  return uid
}

/**
 * Hapus akun user (hanya Firestore – Auth memerlukan Admin SDK / Cloud Function)
 * User yang dihapus dari Firestore tidak dapat login (akan ditolak di route guard)
 */
export async function deleteUser(uid, pakarId) {
  // Hapus dokumen user di Firestore
  await deleteDoc(doc(db, 'users', uid))
  // Hapus data penilaian jika role pakar
  if (pakarId) {
    await deleteDoc(doc(db, 'penilaianPakar', `pakar${pakarId}`))
  }
  // Catatan: akun Firebase Auth perlu dihapus manual di Firebase Console
  // atau via Cloud Function menggunakan Admin SDK
}

/* ══════════════════════════════════════
   USERS
══════════════════════════════════════ */
export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => d.data())
}

/* ══════════════════════════════════════
   KRITERIA
══════════════════════════════════════ */
export async function getKriteria() {
  const q = query(collection(db, 'kriteria'), orderBy('urutan'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Seed data kriteria default (4 kriteria)
 */
export async function seedKriteria() {
  const batch = writeBatch(db)
  const data = [
    { kode: 'C1', nama: 'Perbedaan tinggi tanaman',      deskripsi: 'Selisih tinggi maksimal antara tanaman utama dan tanaman sela',               urutan: 1 },
    { kode: 'C2', nama: 'Perbedaan kebutuhan nutrisi',   deskripsi: 'Tingkat perbedaan jenis unsur hara yang dibutuhkan (N, P, K, mikro)',           urutan: 2 },
    { kode: 'C3', nama: 'Kesamaan kebutuhan air',        deskripsi: 'Kesesuaian kebutuhan air antar tanaman (mm/hari)',                               urutan: 3 },
    { kode: 'C4', nama: 'Perbedaan jenis hama & penyakit', deskripsi: 'Tingkat perbedaan famili hama/penyakit utama',                               urutan: 4 }
  ]
  for (const k of data) batch.set(doc(db, 'kriteria', k.kode), k)
  await batch.commit()
}

/* ══════════════════════════════════════
   ALTERNATIF
══════════════════════════════════════ */
export async function getAlternatif() {
  const q = query(collection(db, 'alternatifs'), orderBy('kode'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addAlternatif(data) {
  await setDoc(doc(db, 'alternatifs', data.kode), {
    ...data,
    createdAt: serverTimestamp()
  })
}

export async function updateAlternatif(kode, data) {
  await updateDoc(doc(db, 'alternatifs', kode), data)
}

export async function deleteAlternatif(kode) {
  await deleteDoc(doc(db, 'alternatifs', kode))
}

const DEFAULT_ALTERNATIF = [
  { kode: 'A1', nama: 'Jagung + Kacang Tanah' },
  { kode: 'A2', nama: 'Jagung + Kacang Hijau' },
  { kode: 'A3', nama: 'Jagung + Ubi Kayu' },
  { kode: 'A4', nama: 'Sorghum + Kacang Tunggak' },
  { kode: 'A5', nama: 'Jagung + Kedelai' }
]

export async function resetAlternatifDefault() {
  // Hapus semua alternatif yang ada
  const existing = await getAlternatif()
  const batch = writeBatch(db)
  for (const a of existing) batch.delete(doc(db, 'alternatifs', a.kode))
  for (const a of DEFAULT_ALTERNATIF) {
    batch.set(doc(db, 'alternatifs', a.kode), { ...a, createdAt: serverTimestamp() })
  }
  await batch.commit()
}

/* ══════════════════════════════════════
   PENILAIAN PAKAR
══════════════════════════════════════ */
export async function getPenilaianPakar(pakarId) {
  const snap = await getDoc(doc(db, 'penilaianPakar', `pakar${pakarId}`))
  return snap.exists() ? snap.data() : null
}

export async function getAllPenilaian() {
  const result = {}
  for (const id of [1, 2, 3]) {
    result[id] = await getPenilaianPakar(id)
  }
  return result
}

export async function savePenilaianKriteria(pakarId, uid, matrix, cr, konsisten) {
  const ref = doc(db, 'penilaianPakar', `pakar${pakarId}`)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? snap.data() : {}
  await setDoc(ref, {
    ...existing,
    pakarId,
    uid,
    kriteriaMatrix: matrix,
    kriteriaCR: cr,
    kriteriaKonsisten: konsisten,
    updatedAt: serverTimestamp()
  })
}

export async function savePenilaianAlternatif(pakarId, uid, kriteriaKode, matrix, cr, konsisten) {
  const ref = doc(db, 'penilaianPakar', `pakar${pakarId}`)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? snap.data() : {}
  const altMatrix = existing.alternatifMatrix || {}
  const altCR     = existing.alternatifCR     || {}
  altMatrix[kriteriaKode] = matrix
  altCR[kriteriaKode]     = cr
  await setDoc(ref, {
    ...existing,
    pakarId,
    uid,
    alternatifMatrix: altMatrix,
    alternatifCR: altCR,
    updatedAt: serverTimestamp()
  })
}

/* ══════════════════════════════════════
   HASIL PERHITUNGAN
══════════════════════════════════════ */
export async function getHasilPerhitungan() {
  const snap = await getDoc(doc(db, 'hasilPerhitungan', 'hasil'))
  return snap.exists() ? snap.data() : null
}

export async function saveHasilPerhitungan(data) {
  await setDoc(doc(db, 'hasilPerhitungan', 'hasil'), {
    ...data,
    updatedAt: serverTimestamp()
  })
}

/* ══════════════════════════════════════
   BACKUP / RESTORE
══════════════════════════════════════ */
export async function exportAllData() {
  const [kriteria, alternatifs, users, penilaian, hasil] = await Promise.all([
    getKriteria(),
    getAlternatif(),
    getAllUsers(),
    getAllPenilaian(),
    getHasilPerhitungan()
  ])
  return { kriteria, alternatifs, users, penilaian, hasil, exportedAt: new Date().toISOString() }
}

export async function importAllData(data) {
  const batch = writeBatch(db)
  if (data.alternatifs) {
    const existing = await getAlternatif()
    for (const a of existing) batch.delete(doc(db, 'alternatifs', a.kode))
    for (const a of data.alternatifs) batch.set(doc(db, 'alternatifs', a.kode || a.id), a)
  }
  if (data.penilaian) {
    for (const [id, val] of Object.entries(data.penilaian)) {
      if (val) batch.set(doc(db, 'penilaianPakar', `pakar${id}`), val)
    }
  }
  if (data.hasil) {
    batch.set(doc(db, 'hasilPerhitungan', 'hasil'), data.hasil)
  }
  await batch.commit()
}