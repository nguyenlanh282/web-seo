import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Subject, Observable } from 'rxjs'
import { MessageEvent } from '@nestjs/common'
import { SSEEvent } from '@seopen/shared'

// Streams older than 10 minutes with no terminal event are considered stale
const STREAM_TTL_MS = 10 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 1000

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SseService.name)
  private readonly streams = new Map<string, Subject<SSEEvent>>()
  private readonly streamCreatedAt = new Map<string, number>()
  private cleanupTimer: ReturnType<typeof setInterval>

  onModuleInit() {
    this.cleanupTimer = setInterval(() => this.cleanupStaleStreams(), CLEANUP_INTERVAL_MS)
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer)
    // Complete all remaining streams gracefully on shutdown
    for (const [key, subject] of this.streams.entries()) {
      subject.complete()
      this.streams.delete(key)
      this.streamCreatedAt.delete(key)
    }
  }

  private cleanupStaleStreams(): void {
    const now = Date.now()
    for (const [key, createdAt] of this.streamCreatedAt.entries()) {
      if (now - createdAt > STREAM_TTL_MS) {
        const subject = this.streams.get(key)
        if (subject) {
          this.logger.warn(`Cleaning up stale SSE stream: ${key}`)
          subject.complete() // graceful completion rather than error()
          this.streams.delete(key)
          this.streamCreatedAt.delete(key)
        }
      }
    }
  }

  getStream(articleId: string, userId: string): Observable<MessageEvent> {
    const key = `${userId}:${articleId}`

    if (!this.streams.has(key)) {
      this.streams.set(key, new Subject<SSEEvent>())
      this.streamCreatedAt.set(key, Date.now())
    }

    const subject = this.streams.get(key)!

    return new Observable(observer => {
      const sub = subject.subscribe({
        next: (event) => {
          observer.next({ data: JSON.stringify(event) } as MessageEvent)
        },
        error: (err) => observer.error(err),
        complete: () => {
          observer.complete()
          this.streams.delete(key)
          this.streamCreatedAt.delete(key)
        },
      })

      // Cleanup on disconnect
      return () => {
        sub.unsubscribe()
        this.logger.log(`SSE stream closed for article ${articleId}`)
      }
    })
  }

  emit(articleId: string, userId: string, event: SSEEvent): void {
    const key = `${userId}:${articleId}`
    const subject = this.streams.get(key)
    if (subject) {
      subject.next(event)
      if (event.type === 'COMPLETED' || event.type === 'FAILED') {
        subject.complete()
        this.streams.delete(key)
        this.streamCreatedAt.delete(key)
      }
    }
  }

  emitProgress(articleId: string, userId: string, progress: number, message: string): void {
    this.emit(articleId, userId, {
      jobId: articleId,
      type: 'PROGRESS',
      progress,
      message,
    })
  }

  emitCompleted(articleId: string, userId: string, data?: unknown): void {
    this.emit(articleId, userId, {
      jobId: articleId,
      type: 'COMPLETED',
      progress: 100,
      message: 'Hoàn thành',
      data,
    })
  }

  emitFailed(articleId: string, userId: string, message: string): void {
    this.emit(articleId, userId, {
      jobId: articleId,
      type: 'FAILED',
      progress: 0,
      message,
    })
  }
}
