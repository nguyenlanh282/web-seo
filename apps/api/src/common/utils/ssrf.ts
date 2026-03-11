import { BadRequestException } from '@nestjs/common'

/**
 * Validates that a WordPress URL is safe to contact (SSRF protection).
 * Blocks private/internal addresses including IPv4 RFC-1918, IPv6 ULA/link-local,
 * and known loopback addresses.
 *
 * NOTE: DNS rebinding is partially mitigated by calling this at both registration
 * AND publish time. Full protection requires an SSRF-aware HTTP wrapper that
 * validates the resolved IP at connect time (e.g. ssrf-req-filter).
 *
 * Throws BadRequestException for invalid, non-http(s), or private/internal URLs.
 */
export function validateWpUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new BadRequestException('Invalid WordPress URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('WordPress URL must use http or https protocol')
  }

  const hostname = parsed.hostname

  const blockedPatterns = [
    // IPv4 private / loopback
    /^127\./,
    /^localhost$/i,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,   // link-local / APIPA
    /^0\./,          // 0.0.0.0/8

    // IPv6 loopback
    /^::1$/,
    // IPv6 ULA (fc00::/7)
    /^f[cd][0-9a-f]{2}:/i,
    // IPv6 link-local (fe80::/10)
    /^fe[89ab][0-9a-f]:/i,
    // IPv4-mapped IPv6 (::ffff:127.x.x.x, etc.)
    /^::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i,
  ]

  for (const pattern of blockedPatterns) {
    if (pattern.test(hostname)) {
      throw new BadRequestException('WordPress URL must not point to a private or internal address')
    }
  }
}
