import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { Accept: 'application/json' },
})

/* ---------------- Token storage ----------------
 * "Ingat saya" -> localStorage (tetap login setelah browser ditutup)
 * selain itu   -> sessionStorage (hilang saat tab/browser ditutup)
 */
const KEY = 'poonya_token'
let memoryToken = null

const safe = (fn) => { try { return fn() } catch { return null } }

export const tokenStore = {
  get: () => memoryToken ?? safe(() => localStorage.getItem(KEY)) ?? safe(() => sessionStorage.getItem(KEY)),
  set: (token, remember) => {
    memoryToken = token
    safe(() => (remember ? localStorage : sessionStorage).setItem(KEY, token))
  },
  clear: () => {
    memoryToken = null
    safe(() => localStorage.removeItem(KEY))
    safe(() => sessionStorage.removeItem(KEY))
  },
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* Dipanggil saat server membalas 401 (token salah / kedaluwarsa). Diisi oleh AuthContext. */
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLogin = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLogin) onUnauthorized()
    return Promise.reject(err)
  },
)

/**
 * Unduh file dari API (butuh token login, jadi tidak bisa pakai <a href> biasa).
 * Nama file diambil dari header Content-Disposition kalau ada.
 */
export async function downloadFile(path, params, fallbackName = 'download') {
  const res = await api.get(path, { params, responseType: 'blob' })
  const cd = res.headers['content-disposition'] || ''
  const name = decodeURIComponent((cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i) || [])[1] || fallbackName)
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return name
}

/** Error dari request blob (download) berbentuk Blob — ubah dulu jadi JSON supaya pesannya terbaca */
export async function blobErrorMessage(err) {
  const data = err?.response?.data
  if (data instanceof Blob) {
    try { err.response.data = JSON.parse(await data.text()) } catch { /* biarkan */ }
  }
  return errorMessage(err)
}

/** Ambil pesan error yang enak dibaca dari response Laravel */
export function errorMessage(err) {
  const res = err?.response?.data
  if (err?.response?.status === 429) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  if (res?.errors) return Object.values(res.errors).flat()[0]
  if (res?.message) return res.message
  if (err?.code === 'ERR_NETWORK' || (err?.response?.status >= 500 && !res?.message))
    return 'Tidak bisa terhubung ke server API.'
  return err?.message || 'Terjadi kesalahan.'
}
