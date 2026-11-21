import { api } from './client'

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export const Auth = {
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.user),
  logout: () => api.post('/auth/logout'),
  updatePassword: (payload) => api.put('/auth/password', payload),
}

export const Events = {
  list: (params) => api.get('/events', { params: clean(params) }).then((r) => r.data),
  show: (id) => api.get(`/events/${id}`).then((r) => r.data.data),
  availableItems: (venueId) => api.get('/events/available-items', { params: clean({ venue_id: venueId }) }).then((r) => r.data),
  create: (payload) => api.post('/events', payload).then((r) => r.data.data),
  report: (id, items, report_note) => api.put(`/events/${id}/return`, { items, report_note }).then((r) => r.data.data),
  cancel: (id) => api.post(`/events/${id}/cancel`).then((r) => r.data.data),
  // dijadwalkan owner
  schedule: (payload) => api.post('/events/schedule', payload).then((r) => r.data.data),
  updateSchedule: (id, payload) => api.put(`/events/${id}`, payload).then((r) => r.data.data),
  claim: (id) => api.post(`/events/${id}/claim`).then((r) => r.data.data),
  depart: (id, items, source_venue_id) => api.post(`/events/${id}/depart`, { items, source_venue_id }).then((r) => r.data.data),
}

export const Opnames = {
  list: (params) => api.get('/opnames', { params: clean(params) }).then((r) => r.data.data),
  show: (id) => api.get(`/opnames/${id}`).then((r) => r.data.data),
  create: (payload) => api.post('/opnames', payload).then((r) => r.data.data),
}

export const Users = {
  list: () => api.get('/users').then((r) => r.data.data),
  create: (payload) => api.post('/users', payload).then((r) => r.data.data),
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data.data),
  remove: (id) => api.delete(`/users/${id}`),
}

export const Dashboard = {
  get: (params) => api.get('/dashboard', { params: clean(params) }).then((r) => r.data),
}

export const Venues = {
  list: () => api.get('/venues').then((r) => r.data.data),
  show: (id) => api.get(`/venues/${id}`).then((r) => r.data.data),
}

export const Categories = {
  list: () => api.get('/categories').then((r) => r.data.data),
  create: (name) => api.post('/categories', { name }).then((r) => r.data.data),
  update: (id, name) => api.put(`/categories/${id}`, { name }).then((r) => r.data.data),
  remove: (id) => api.delete(`/categories/${id}`),
}

export const Items = {
  list: (params) => api.get('/items', { params: clean(params) }).then((r) => r.data.data),
  create: (payload) => api.post('/items', payload).then((r) => r.data.data),
  update: (id, payload) => api.put(`/items/${id}`, payload).then((r) => r.data.data),
  remove: (id) => api.delete(`/items/${id}`),
  archive: (id, archived) => api.patch(`/items/${id}/archive`, { archived }).then((r) => r.data.data),
  setCondition: (id, venue_id, condition) => api.put(`/items/${id}/condition`, { venue_id, condition }).then((r) => r.data.data),
  /** file (File) ATAU rows (array of array, baris pertama = judul kolom) */
  importPreview: ({ file, rows }) => {
    if (file) {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/items/import/preview', fd).then((r) => r.data)
    }
    return api.post('/items/import/preview', { rows }).then((r) => r.data)
  },
  importCommit: (payload) => api.post('/items/import', payload).then((r) => r.data),
}

export const Notifications = {
  list: () => api.get('/notifications').then((r) => r.data),
}

export const Settings = {
  createVenue: (payload) => api.post('/venues', payload).then((r) => r.data.data),
  updateVenue: (id, payload) => api.put(`/venues/${id}`, payload).then((r) => r.data.data),
  deleteVenue: (id) => api.delete(`/venues/${id}`),
  backups: () => api.get('/backups').then((r) => r.data),
  createBackup: () => api.post('/backups').then((r) => r.data.data),
  notifications: () => api.get('/settings/notifications').then((r) => r.data.data),
  updateNotifications: (payload) => api.put('/settings/notifications', payload).then((r) => r.data.data),
  testEmail: () => api.post('/settings/notifications/test').then((r) => r.data),
}

export const Transfers = {
  list: (params) => api.get('/transfers', { params: clean(params) }).then((r) => r.data.data),
  create: (payload) => api.post('/transfers', payload).then((r) => r.data.data),
}

export const Movements = {
  list: (params) => api.get('/movements', { params: clean(params) }).then((r) => r.data.data),
  create: (payload) => api.post('/movements', payload).then((r) => r.data.data),
}
