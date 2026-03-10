// apps/api/src/common/filters/global-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Request, Response } from 'express'
import * as Sentry from '@sentry/nestjs'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = 'Internal server error'
    // Structured error object forwarded from guards/services (e.g. PlanGuard, RateLimitGuard)
    let errorBody: Record<string, unknown> | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()

      if (typeof res === 'string') {
        message = res
      } else {
        const resObj = res as Record<string, unknown>
        message = (resObj.message as string | string[]) || message

        // Preserve the `error` envelope emitted by PlanGuard / RateLimitGuard
        // Shape: { success: false, error: { code, message, upgradeUrl, retryAfter, ... } }
        if (resObj.error && typeof resObj.error === 'object') {
          errorBody = resObj.error as Record<string, unknown>
          // Use the structured message if present and top-level message is still default
          if (!resObj.message && (errorBody.message as string)) {
            message = errorBody.message as string
          }
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT
        message = 'Resource already exists'
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND
        message = 'Resource not found'
      }
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${Array.isArray(message) ? message.join(', ') : message}`,
      exception instanceof Error ? exception.stack : String(exception),
    )

    // Capture 5xx errors in Sentry for production observability
    if (status >= 500) {
      Sentry.captureException(exception)
    }

    const body: Record<string, unknown> = {
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      path: request.url,
      timestamp: new Date().toISOString(),
    }

    // Forward structured error so frontend interceptor can read error.code / upgradeUrl
    if (errorBody) {
      body.error = errorBody
    }

    response.status(status).json(body)
  }
}
