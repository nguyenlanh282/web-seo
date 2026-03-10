import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PLAN_LIMITS } from '@seopen/shared'
import { UserPlan } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreditService } from '../../users/credit.service'
import { PLAN_CHECK_KEY, PlanCheckType } from '../decorators/plan-check.decorator'

/**
 * Guard enforcing plan-based limits on creation endpoints.
 *
 * - project: checks user's project count vs plan limit
 * - article: atomically deducts 1 article credit via CreditService
 * - wp_site: checks user's WP site count vs plan limit
 *
 * Also checks feature gates (content_gap, full_ai_actions, wp_publish)
 * via PLAN_FEATURES_KEY metadata.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const checkType = this.reflector.get<PlanCheckType>(PLAN_CHECK_KEY, context.getHandler())
    if (!checkType) return true // No @PlanCheck decorator — allow

    const request = context.switchToHttp().getRequest()
    const user = request.user
    if (!user) return false

    const plan = user.plan as UserPlan
    const limits = PLAN_LIMITS[plan]

    switch (checkType) {
      case 'project': {
        const count = await this.prisma.project.count({ where: { userId: user.id } })
        if (count >= limits.maxProjects) {
          throw new ForbiddenException({
            success: false,
            error: {
              code: 'PROJECT_LIMIT_REACHED',
              message: `Gói ${plan} cho phép tối đa ${limits.maxProjects} dự án. Nâng cấp để tạo thêm.`,
              upgradeUrl: '/pricing',
              current: count,
              limit: limits.maxProjects,
              plan,
            },
          })
        }
        break
      }

      case 'article': {
        // Atomically deduct credit (throws ForbiddenException if exhausted)
        const remaining = await this.creditService.deductCredit(user.id, plan)
        // Attach remaining credits to request for response
        request.creditsRemaining = remaining
        break
      }

      case 'wp_site': {
        const count = await this.prisma.wpSite.count({ where: { userId: user.id } })
        if (count >= limits.maxWpSites) {
          throw new ForbiddenException({
            success: false,
            error: {
              code: 'WP_SITE_LIMIT_REACHED',
              message: `Gói ${plan} cho phép tối đa ${limits.maxWpSites} WordPress site. Nâng cấp để thêm.`,
              upgradeUrl: '/pricing',
              current: count,
              limit: limits.maxWpSites,
              plan,
            },
          })
        }
        break
      }
    }

    return true
  }
}
