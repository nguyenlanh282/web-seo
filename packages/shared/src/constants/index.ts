import { PlanType, PlanLimits, ChecklistType } from '../types'

// Plan Limits
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PlanType.STARTER]: {
    articlesPerMonth: 30,
    maxProjects: 2,
    maxWpSites: 0,
    aiReqPerMin: 10,
    aiReqPerDay: 200,
    hasContentGap: false,
    hasFullAIActions: false,
    wpExport: 'html_only',
    internalLinks: 'manual',
  },
  [PlanType.PRO]: {
    articlesPerMonth: 100,
    maxProjects: 10,
    maxWpSites: 1,
    aiReqPerMin: 20,
    aiReqPerDay: 1000,
    hasContentGap: true,
    hasFullAIActions: true,
    wpExport: 'single_site',
    internalLinks: 'suggest',
  },
  [PlanType.AGENCY]: {
    articlesPerMonth: 500,
    maxProjects: 999,
    maxWpSites: 50,
    aiReqPerMin: 30,
    aiReqPerDay: 5000,
    hasContentGap: true,
    hasFullAIActions: true,
    wpExport: 'unlimited',
    internalLinks: 'auto',
  },
}

// SEO Checklist Weights (total = 100)
export const CHECKLIST_WEIGHTS: Record<ChecklistType, number> = {
  [ChecklistType.HEADLINE_KEYWORD]: 12,
  [ChecklistType.META_DESCRIPTION]: 10,
  [ChecklistType.HEADING_STRUCTURE]: 12,
  [ChecklistType.IMAGE_ALT]: 6,
  [ChecklistType.IMAGE_FILENAME]: 4,
  [ChecklistType.KEYWORD_COVERAGE]: 15,
  [ChecklistType.TAGS]: 4,
  [ChecklistType.INTERNAL_EXTERNAL_LINKS]: 12,
  [ChecklistType.ANCHOR_TEXT]: 5,
  [ChecklistType.CONTENT_LENGTH]: 5,
  [ChecklistType.READABILITY]: 10,
  [ChecklistType.CONTENT_GAP_COVERAGE]: 5,
}

// Article minimum SEO score for WordPress publish
export const MIN_SEO_SCORE_FOR_PUBLISH = 60

// AI Models
export const AI_MODELS = {
  SONNET: 'claude-sonnet-4-5-20250929',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const

// Redis Key Prefixes
export const REDIS_KEYS = {
  RATE_LIMIT: (userId: string) => `rate_limit:${userId}`,
  AI_QUOTA: (userId: string, date: string) => `ai_quota:${userId}:${date}`,
  JOB_IDEMPOTENCY: (articleId: string, step: string) => `job:idempotency:${articleId}:${step}`,
  PUBLISH_LOCK: (articleId: string) => `publish:lock:${articleId}`,
  SERP_CACHE: (keyword: string) => `serp:cache:${keyword}`,
  USER_SESSION: (userId: string) => `session:${userId}`,
} as const

// Job Queue Names
export const QUEUE_NAMES = {
  KEYWORD_ANALYSIS: 'keyword-analysis',
  OUTLINE_GENERATION: 'outline-generation',
  CONTENT_WRITING: 'content-writing',
  WORDPRESS_PUBLISH: 'wordpress-publish',
  ONE_CLICK_PUBLISH: 'one-click-publish',
} as const
