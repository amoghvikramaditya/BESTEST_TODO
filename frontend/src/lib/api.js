import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL

const api = axios.create({
  baseURL,
  timeout: 10000,
})

let tokenProvider = async () => null

export function setTokenProvider(provider) {
  tokenProvider = provider
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await tokenProvider?.()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.warn('Failed to resolve auth token', error)
  }
  return config
})

export const TasksApi = {
  async list(params = {}) {
    const { data } = await api.get('/tasks', { params })
    return data
  },
  async create(payload) {
    const { data } = await api.post('/tasks', payload)
    return data
  },
  async update(taskId, payload) {
    const { data } = await api.put(`/tasks/${taskId}`, payload)
    return data
  },
  async remove(taskId) {
    const { data } = await api.delete(`/tasks/${taskId}`)
    return data
  },
}

export const ListsApi = {
  async list() {
    const { data } = await api.get('/lists')
    return data
  },
  async create(payload) {
    const { data } = await api.post('/lists', payload)
    return data
  },
  async update(listId, payload) {
    const { data } = await api.put(`/lists/${listId}`, payload)
    return data
  },
  async remove(listId) {
    const { data } = await api.delete(`/lists/${listId}`)
    return data
  },
}

export default api

