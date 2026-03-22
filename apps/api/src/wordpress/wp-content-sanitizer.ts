import * as sanitizeHtml from 'sanitize-html'

/**
 * Sanitize raw article HTML/markdown before sending to the WordPress REST API.
 * Allows a safe subset of HTML tags + attributes; strips scripts, iframes, etc.
 * Always called at publish time — do not assume prior sanitization.
 */
export function sanitizeWpContent(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'figure', 'figcaption', 'img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height'],
      '*': ['class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
}
