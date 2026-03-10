// Article State Machine (for Prisma)
export enum ArticleState {
  DRAFT = 'DRAFT',
  KEYWORD_ANALYZED = 'KEYWORD_ANALYZED',
  OUTLINED = 'OUTLINED',
  CONTENT_WRITTEN = 'CONTENT_WRITTEN',
  SEO_CHECKED = 'SEO_CHECKED',
  EXPORTED = 'EXPORTED',
  PUBLISHED = 'PUBLISHED',
}

// Article Status (frontend display - can be extended)
export enum ArticleStatus {
  DRAFT = 'DRAFT',
  KEYWORD_ANALYZED = 'KEYWORD_ANALYZED',
  OUTLINED = 'OUTLINED',
  CONTENT_WRITTEN = 'CONTENT_WRITTEN',
  SEO_CHECKED = 'SEO_CHECKED',
  EXPORTED = 'EXPORTED',
  PUBLISHED = 'PUBLISHED',
}

// SaaS Plans
export enum PlanType {
  STARTER = 'STARTER',
  PRO = 'PRO',
  AGENCY = 'AGENCY',
}

// Checklist Item Types
export enum ChecklistType {
  HEADLINE_KEYWORD = 'HEADLINE_KEYWORD',
  META_DESCRIPTION = 'META_DESCRIPTION',
  HEADING_STRUCTURE = 'HEADING_STRUCTURE',
  IMAGE_ALT = 'IMAGE_ALT',
  IMAGE_FILENAME = 'IMAGE_FILENAME',
  KEYWORD_COVERAGE = 'KEYWORD_COVERAGE',
  TAGS = 'TAGS',
  INTERNAL_EXTERNAL_LINKS = 'INTERNAL_EXTERNAL_LINKS',
  ANCHOR_TEXT = 'ANCHOR_TEXT',
  CONTENT_LENGTH = 'CONTENT_LENGTH',
  READABILITY = 'READABILITY',
  CONTENT_GAP_COVERAGE = 'CONTENT_GAP_COVERAGE',
}

// Job Status
export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
}

// AI Actions
export enum AIEditorAction {
  REWRITE = 'rewrite',
  EXPAND = 'expand',
  SIMPLIFY = 'simplify',
  HUMANIZE = 'humanize',
}

// SSE Event Types
export type SSEEvent = {
  jobId: string
  type: 'PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL_CONTENT'
  progress: number // 0-100
  message: string
  data?: unknown
}

// API Response Envelope
export type ApiResponse<T> = {
  success: true
  data: T
} | {
  success: false
  error: {
    code: string
    message: string
  }
}

// Plan Limits
export type PlanLimits = {
  articlesPerMonth: number
  maxProjects: number
  maxWpSites: number
  aiReqPerMin: number
  aiReqPerDay: number
  hasContentGap: boolean
  hasFullAIActions: boolean
  wpExport: 'html_only' | 'single_site' | 'unlimited'
  internalLinks: 'manual' | 'suggest' | 'auto'
}

export * from './outline'
