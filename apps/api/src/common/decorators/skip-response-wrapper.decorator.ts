import { SetMetadata } from '@nestjs/common'
import { SKIP_RESPONSE_WRAPPER } from '../interceptors/response.interceptor'

/**
 * Decorator to skip the ResponseInterceptor wrapper.
 * Use on SSE endpoints, file downloads, or any endpoint that
 * needs to return raw responses.
 */
export const SkipResponseWrapper = () => SetMetadata(SKIP_RESPONSE_WRAPPER, true)
