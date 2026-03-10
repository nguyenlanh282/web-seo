import { SetMetadata } from '@nestjs/common'

export const PLAN_CHECK_KEY = 'plan_check_meta'

export type PlanCheckType = 'project' | 'article' | 'wp_site'

/**
 * Decorator to enforce plan limits on creation endpoints.
 *
 * @example
 * // Enforce project limit
 * @PlanCheck('project')
 * @Post()
 * async createProject() { ... }
 *
 * // Enforce article credit deduction
 * @PlanCheck('article')
 * @Post()
 * async createArticle() { ... }
 */
export const PlanCheck = (checkType: PlanCheckType) =>
  SetMetadata(PLAN_CHECK_KEY, checkType)
