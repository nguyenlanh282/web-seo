import axios from 'axios'
import { track } from './analytics'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true, // for refresh token cookie
})

// Request interceptor — access_token is sent automatically via HttpOnly cookie (withCredentials: true)
api.interceptors.request.use((config) => {
  return config
})

// Response interceptor - handle 401 and refresh
let isRefreshing = false
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = []

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(null)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Refresh token is in HttpOnly cookie — sent automatically
        await axios.post(`${API_BASE}/api/v1/auth/refresh`, {}, { withCredentials: true })
        // New access_token is set as HttpOnly cookie by the server
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// ============================================================================
// Plan/Rate Limit Error Event Bus (subscribe from components)
// ============================================================================

type PlanErrorHandler = (error: {
  code: string
  message: string
  upgradeUrl?: string
  retryAfter?: number
}) => void

let _planErrorHandler: PlanErrorHandler | null = null

export function onPlanError(handler: PlanErrorHandler) {
  _planErrorHandler = handler
  return () => { _planErrorHandler = null }
}

// Intercept 403 (plan limit) and 429 (rate limit) errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const errorData = error.response?.data?.error || error.response?.data

    if ((status === 403 || status === 429) && errorData?.code && _planErrorHandler) {
      _planErrorHandler({
        code: errorData.code,
        message: errorData.message,
        upgradeUrl: errorData.upgradeUrl,
        retryAfter: errorData.retryAfter,
      })
    }

    return Promise.reject(error)
  },
)

// Helper to extract data from wrapped response { data: { ... } }
function extractData(response: any) {
  return response.data?.data ?? response.data
}

// ============================================================================
// Auth API
// ============================================================================
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data).then(extractData),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(extractData),
  logout: () => api.post('/auth/logout').then(extractData),
  me: () => api.get('/auth/me').then(extractData),
}

// ============================================================================
// Projects API
// ============================================================================
export const projectsApi = {
  list: () => api.get('/projects').then(extractData),
  get: (id: string) => api.get(`/projects/${id}`).then(extractData),
  create: (data: { name: string; description?: string; domain?: string; language?: string }) =>
    api.post('/projects', data).then(extractData),
  update: (id: string, data: Partial<{ name: string; description: string; domain: string; language: string }>) =>
    api.patch(`/projects/${id}`, data).then(extractData),
  delete: (id: string) => api.delete(`/projects/${id}`).then(extractData),
}

// ============================================================================
// Articles API
// ============================================================================
export const articlesApi = {
  list: (projectId?: string) =>
    api.get('/articles', { params: projectId ? { projectId } : {} }).then(extractData),
  get: (id: string) => api.get(`/articles/${id}`).then(extractData),
  create: (data: { title: string; targetKeyword: string; projectId?: string }) =>
    api.post('/articles', data).then(extractData).then((res: any) => {
      track('article_created', { keyword: data.targetKeyword, projectId: data.projectId })
      return res
    }),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/articles/${id}`, data).then(extractData),
  delete: (id: string) => api.delete(`/articles/${id}`).then(extractData),

  // Step 1: Keyword Analysis
  step1: (articleId: string, data: { keyword: string; language?: string; country?: string }) =>
    api.post(`/articles/${articleId}/step1/analyze`, data).then(extractData).then((res: any) => {
      track('step_completed', { step: 1, articleId, keyword: data.keyword })
      return res
    }),

  // Step 2: Generate Outline
  step2: (articleId: string, data?: { targetLength?: number }) =>
    api.post(`/articles/${articleId}/step2`, data || {}).then(extractData).then((res: any) => {
      track('step_completed', { step: 2, articleId })
      return res
    }),

  // Step 3: Write Content
  step3: (articleId: string, data?: { sections?: string[] }) =>
    api.post(`/articles/${articleId}/step3`, data || {}).then(extractData).then((res: any) => {
      track('step_completed', { step: 3, articleId })
      return res
    }),

  // Step 4: SEO Check
  step4: (articleId: string) =>
    api.post(`/articles/${articleId}/step4`).then(extractData).then((res: any) => {
      track('step_completed', { step: 4, articleId })
      return res
    }),

  // Step 5: Export HTML
  step5Export: (articleId: string) =>
    api.post(`/articles/${articleId}/step5/export`).then(extractData).then((res: any) => {
      track('export_html', { articleId, wordCount: res?.wordCount, seoScore: res?.seoScore })
      track('step_completed', { step: 5, articleId })
      return res
    }),

  // Step 5b: Async WordPress Publish
  publishWp: (articleId: string, wpSiteId: string) =>
    api.post(`/articles/${articleId}/publish-wp`, { wpSiteId }).then(extractData).then((res: any) => {
      track('article_published', { articleId, wpSiteId })
      return res
    }),

  // Internal Link Suggestions
  internalLinks: (articleId: string) =>
    api.get(`/articles/${articleId}/internal-links`).then(extractData),

  // AI Editor Action (sync)
  aiAction: (articleId: string, data: { action: string; selectedText: string; context?: string }) =>
    api.post(`/articles/${articleId}/ai-action`, data).then(extractData).then((res: any) => {
      track('ai_action', { action: data.action, articleId })
      return res
    }),

  // Status transition
  updateStatus: (id: string, status: string) =>
    api.patch(`/articles/${id}/status`, { status }).then(extractData),

  // Retry publish (re-enqueue BullMQ job after PARTIAL/FAILED)
  retryPublish: (articleId: string, wpSiteId?: string) =>
    api.post(`/articles/${articleId}/retry-publish`, wpSiteId ? { wpSiteId } : {}).then(extractData).then((res: any) => {
      track('article_retry_publish', { articleId, wpSiteId })
      return res
    }),
}

// ============================================================================
// Users API
// ============================================================================
export const usersApi = {
  me: () => api.get('/users/me').then(extractData),
  stats: () => api.get('/users/me/stats').then(extractData),
  update: (data: Partial<{ name: string }>) =>
    api.patch('/users/me', data).then(extractData),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/users/me/change-password', data).then(extractData),
  saveApiKeys: (data: { anthropicKey?: string; serpApiKey?: string }) =>
    api.post('/users/me/api-keys', data).then(extractData),
  getApiKeyStatus: () =>
    api.get('/users/me/api-keys').then(extractData),
}

// ============================================================================
// WordPress API
// ============================================================================
export const wordpressApi = {
  listSites: () => api.get('/wordpress/sites').then(extractData),
  addSite: (data: { name: string; siteUrl: string; username: string; applicationPassword: string }) =>
    api.post('/wordpress/sites', data).then(extractData).then((res: any) => {
      // userId is available in PostHog session via identifyUser — no need to pass here
      track('wp_site_added', { userId: res?.userId ?? '' })
      return res
    }),
  removeSite: (id: string) => api.delete(`/wordpress/sites/${id}`).then(extractData),
  publish: (articleId: string, wpSiteId: string) =>
    api.post(`/wordpress/publish/${articleId}`, { wpSiteId }).then(extractData),
}

// ============================================================================
// SEO API
// ============================================================================
export const seoApi = {
  check: (articleId: string) =>
    api.post(`/seo/check/${articleId}`).then(extractData),
}

// ============================================================================
// Jobs / SSE API
// ============================================================================
export const jobsApi = {
  getStatus: (queue: string, jobId: string) =>
    api.get(`/jobs/${queue}/${jobId}`).then(extractData),

  // SSE stream for article progress — uses a short-lived ticket instead of token in URL
  createEventSource: async (articleId: string): Promise<EventSource> => {
    const { ticket } = await api.post('/jobs/sse-ticket').then(r => r.data?.data ?? r.data)
    return new EventSource(`${API_BASE}/api/v1/jobs/stream/${articleId}?ticket=${ticket}`)
  },
}

export default api
