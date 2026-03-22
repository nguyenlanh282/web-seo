// Types and custom errors for the WordPress publish job pipeline

/** Job data enqueued by WordpressService before the lock is acquired */
export interface WpPublishJobData {
  articleId: string
  userId: string
  wpSiteId: string
  lockToken: string  // acquired by service before enqueue; worker releases in finally
}

/**
 * Thrown after a PARTIAL export record has been written to DB.
 * The outer catch block checks for this to avoid writing a duplicate FAILED record.
 */
export class WpPartialError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WpPartialError'
  }
}
