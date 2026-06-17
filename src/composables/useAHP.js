/**
 * useAHP.js
 * Logika perhitungan AHP (Analytic Hierarchy Process)
 * Saaty's method: eigenvector, CR, geometric mean, global weights
 */

// Random Index (RI) berdasarkan n (indeks = n)
const RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45]

/**
 * Membangun matriks n×n dari nilai segitiga atas (comparisons)
 * comparisons: array of [n*(n-1)/2] values for pairs [0,1],[0,2],...
 */
export function buildMatrix(comparisons, n) {
  const matrix = Array.from({ length: n }, () => Array(n).fill(1))
  let idx = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const val = Number(comparisons[idx]) || 1
      matrix[i][j] = val
      matrix[j][i] = parseFloat((1 / val).toFixed(6))
      idx++
    }
  }
  return matrix
}

/**
 * Mengekstrak nilai segitiga atas dari matriks n×n
 */
export function matrixToPairs(matrix) {
  const pairs = []
  const n = matrix.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push(matrix[i][j])
    }
  }
  return pairs
}

/**
 * Normalisasi matriks: bagi setiap elemen dengan jumlah kolomnya
 */
export function normalizeMatrix(matrix) {
  const n = matrix.length
  const colSums = Array(n).fill(0)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j]
    }
  }
  return matrix.map(row => row.map((val, j) => colSums[j] ? val / colSums[j] : 0))
}

/**
 * Eigenvector: rata-rata baris dari matriks ternormalisasi
 * Output: array bobot [n]
 */
export function eigenvector(matrix) {
  const normalized = normalizeMatrix(matrix)
  return normalized.map(row => row.reduce((a, b) => a + b, 0) / row.length)
}

/**
 * Lambda max untuk hitung CI
 */
function lambdaMax(matrix, weights) {
  const n = matrix.length
  let lambda = 0
  for (let j = 0; j < n; j++) {
    let colSum = 0
    for (let i = 0; i < n; i++) colSum += matrix[i][j]
    lambda += colSum * weights[j]
  }
  return lambda
}

/**
 * Hitung Consistency Ratio
 * Return: { CR, CI, lambdaMax, consistent }
 */
export function consistencyRatio(matrix) {
  const n = matrix.length
  if (n <= 1) return { CR: 0, CI: 0, lambdaMax: 1, consistent: true }
  const w = eigenvector(matrix)
  const lMax = lambdaMax(matrix, w)
  const CI = (lMax - n) / (n - 1)
  const ri = RI[n] || 1
  const CR = ri === 0 ? 0 : CI / ri
  return {
    CR: parseFloat(CR.toFixed(4)),
    CI: parseFloat(CI.toFixed(4)),
    lambdaMax: parseFloat(lMax.toFixed(4)),
    consistent: CR < 0.1
  }
}

/**
 * Geometric mean elemen-per-elemen dari beberapa matriks
 * matrices: array of n×n matrices
 */
export function geometricMean(matrices) {
  const n = matrices[0].length
  const k = matrices.length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let product = 1
      for (const m of matrices) product *= (m[i][j] || 1)
      return parseFloat(Math.pow(product, 1 / k).toFixed(6))
    })
  )
}

/**
 * Hitung bobot global alternatif
 * kriteriaBobot: { C1: 0.35, C2: 0.28, ... }  (dari kode kriteria)
 * alternatifBobotPerKriteria: { C1: [w_A1, w_A2, ...], ... }
 * alternatifsKode: ['A1', 'A2', ...]
 */
export function computeGlobalWeights(kriteriaBobot, alternatifBobotPerKriteria, alternatifsKode) {
  return alternatifsKode.map(kode => {
    let total = 0
    for (const [cKode, cBobot] of Object.entries(kriteriaBobot)) {
      const altBobotArr = alternatifBobotPerKriteria[cKode]
      if (!altBobotArr) continue
      const idx = alternatifsKode.indexOf(kode)
      total += cBobot * (altBobotArr[idx] || 0)
    }
    return { kode, bobot: parseFloat(total.toFixed(6)) }
  })
}

/**
 * Format angka desimal untuk tampilan
 */
export function fmt(val, dec = 4) {
  return typeof val === 'number' ? val.toFixed(dec) : '-'
}