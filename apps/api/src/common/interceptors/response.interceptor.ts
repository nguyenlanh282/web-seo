import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Reflector } from '@nestjs/core'

export const SKIP_RESPONSE_WRAPPER = 'skipResponseWrapper'

/**
 * Wraps all successful responses in a consistent { data, meta } format.
 *
 * Responses that are already objects with a `data` key or raw strings/buffers
 * are passed through unchanged. SSE endpoints should use @SkipResponseWrapper().
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Allow handlers to opt-out via @SetMetadata(SKIP_RESPONSE_WRAPPER, true)
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAPPER, [
      context.getHandler(),
      context.getClass(),
    ])

    if (skip) return next.handle()

    const response = context.switchToHttp().getResponse()

    return next.handle().pipe(
      map((body) => {
        // Don't wrap if body is null/undefined (e.g., 204 No Content)
        if (body === null || body === undefined) return body

        // Don't wrap if it's a redirect (3xx) or already wrapped
        const statusCode = response.statusCode
        if (statusCode >= 300 && statusCode < 400) return body

        // Don't wrap raw strings or buffers (e.g., file downloads)
        if (typeof body === 'string' || Buffer.isBuffer(body)) return body

        // Don't double-wrap if body already has { data } shape
        if (body?.data !== undefined && body?.meta !== undefined) return body

        // Wrap in standard { data, meta } format
        return {
          data: body,
          meta: {
            timestamp: new Date().toISOString(),
            ...(Array.isArray(body) ? { count: body.length } : {}),
          },
        }
      }),
    )
  }
}
