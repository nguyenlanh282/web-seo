'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articlesApi, wordpressApi, jobsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Download,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WpSite {
  id: string
  name: string
  url: string
  username: string
  isActive: boolean
}

interface PublishState {
  phase: 'idle' | 'pending' | 'publishing' | 'done' | 'failed'
  progress: number
  message: string
  wpPostUrl?: string
  error?: string
}

interface ExportTabProps {
  articleId: string
  articleTitle: string
  seoScore?: number
  status: string
  /** HTML string returned by step5 export */
  exportedHtml?: string
  /** WP post ID saved after a previous publish (present on PARTIAL state) */
  wpPostId?: number | null
  /** WP post URL saved after a previous publish (present on PARTIAL state) */
  wpPostUrl?: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExportTab({
  articleId,
  articleTitle,
  seoScore,
  status,
  exportedHtml: initialHtml,
  wpPostId,
  wpPostUrl: initialWpPostUrl,
}: ExportTabProps) {
  const queryClient = useQueryClient()
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [publish, setPublish] = useState<PublishState>({
    phase: 'idle',
    progress: 0,
    message: '',
  })
  const eventSourceRef = useRef<EventSource | null>(null)

  // ── WP sites ─────────────────────────────────────────────────────────────
  const { data: sites = [], isLoading: sitesLoading } = useQuery<WpSite[]>({
    queryKey: ['wp-sites'],
    queryFn: wordpressApi.listSites,
  })

  // ── Export HTML ───────────────────────────────────────────────────────────
  const exportMutation = useMutation({
    mutationFn: () => articlesApi.step5Export(articleId),
    onSuccess: (data) => {
      // Trigger browser download
      const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${data.title || articleTitle}.html`
      a.click()
      URL.revokeObjectURL(url)
      queryClient.invalidateQueries({ queryKey: ['article', articleId] })
      toast.success('Đã xuất HTML thành công')
    },
    onError: () => toast.error('Xuất HTML thất bại. Thử lại sau.'),
  })

  // ── Publish WP ────────────────────────────────────────────────────────────
  const publishMutation = useMutation({
    mutationFn: () => articlesApi.publishWp(articleId, selectedSiteId),
    onSuccess: () => {
      setPublish({ phase: 'publishing', progress: 5, message: 'Đang khởi động...' })
      void startSseListener()
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        'Không thể bắt đầu publish'
      setPublish({ phase: 'failed', progress: 0, message: msg, error: msg })
      toast.error(msg)
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => articlesApi.retryPublish(articleId, selectedSiteId || undefined),
    onSuccess: () => {
      setPublish({ phase: 'publishing', progress: 5, message: 'Đang thử lại...' })
      void startSseListener()
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        'Không thể thử lại publish'
      setPublish({ phase: 'failed', progress: 0, message: msg, error: msg })
      toast.error(msg)
    },
  })

  const startSseListener = async () => {
    eventSourceRef.current?.close()
    const es = await jobsApi.createEventSource(articleId)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const evt = JSON.parse(event.data)

        if (evt.type === 'PROGRESS') {
          setPublish({
            phase: 'publishing',
            progress: evt.progress,
            message: evt.message,
          })
        } else if (evt.type === 'COMPLETED') {
          setPublish({
            phase: 'done',
            progress: 100,
            message: 'Đăng bài thành công!',
            wpPostUrl: evt.data?.wpPostUrl,
          })
          queryClient.invalidateQueries({ queryKey: ['article', articleId] })
          es.close()
        } else if (evt.type === 'FAILED') {
          setPublish({
            phase: 'failed',
            progress: 0,
            message: evt.message,
            error: evt.message,
          })
          es.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      // Use functional update to avoid stale closure on `publish` state
      setPublish((prev) => {
        if (prev.phase === 'publishing') {
          return {
            ...prev,
            phase: 'failed',
            error: 'Mất kết nối SSE. Hãy kiểm tra lại trạng thái bài viết.',
          }
        }
        return prev
      })
      es.close()
    }
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const canExport =
    status === 'SEO_CHECKED' || status === 'EXPORTED' || status === 'PUBLISHED'
  const canPublish = canExport && !!selectedSiteId && publish.phase !== 'publishing'

  // PARTIAL: article is PUBLISHED in DB but WP URL was never saved (publish job crashed after WP call)
  const isPartialPublish = status === 'PUBLISHED' && !initialWpPostUrl && publish.phase === 'idle'

  const resetPublish = () =>
    setPublish({ phase: 'idle', progress: 0, message: '' })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── SEO Score Gate ─── */}
      {(seoScore ?? 0) < 60 && canExport && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            SEO score <strong>{seoScore ?? 0}/100</strong> — cần ≥ 60 để publish lên WordPress.
            HTML export vẫn hoạt động bình thường.
          </span>
        </div>
      )}

      {/* ─── HTML Export ─── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Tải xuống HTML</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                File HTML đầy đủ, sẵn sàng upload lên bất kỳ CMS nào
              </p>
            </div>
            <Button
              onClick={() => exportMutation.mutate()}
              disabled={!canExport || exportMutation.isPending}
              variant={canExport ? 'default' : 'outline'}
            >
              {exportMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Tải HTML
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── WordPress Publish ─── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-slate-900">1-Click Publish to WordPress</h3>
            <Badge variant="outline" className="ml-auto text-xs">
              PRO/AGENCY
            </Badge>
          </div>

          {sitesLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải danh sách site...
            </div>
          ) : sites.length === 0 ? (
            <p className="text-sm text-slate-500">
              Chưa kết nối WordPress site nào.{' '}
              <Link href="/wordpress" className="text-blue-600 hover:underline">
                Thêm site tại đây →
              </Link>
            </p>
          ) : (
            <>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn WordPress site..." />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-medium">{s.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{s.url}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* PARTIAL publish warning: status=PUBLISHED but no WP URL saved */}
              {isPartialPublish && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Bài viết đã được đăng nhưng chưa lưu được URL</p>
                    <p className="text-xs mt-0.5 opacity-80">
                      Job publish trước đó bị gián đoạn. Chọn site và nhấn "Thử lại publish" để đồng bộ lại.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 gap-1"
                    disabled={!selectedSiteId || retryMutation.isPending}
                    onClick={() => retryMutation.mutate()}
                  >
                    {retryMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Thử lại publish
                  </Button>
                </div>
              )}

              {/* Publish progress */}
              {publish.phase !== 'idle' && (
                <div className="space-y-2 rounded-lg border bg-slate-50 p-4">
                  {publish.phase === 'publishing' && (
                    <>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        {publish.message}
                      </div>
                      <Progress value={publish.progress} className="h-2" />
                      <p className="text-xs text-slate-400">{publish.progress}%</p>
                    </>
                  )}

                  {publish.phase === 'done' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Đăng bài thành công!
                      </div>
                      {publish.wpPostUrl && (
                        <a
                          href={publish.wpPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          Xem bài viết
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {publish.phase === 'failed' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                        <XCircle className="h-5 w-5 text-red-500" />
                        Đăng bài thất bại
                      </div>
                      {publish.error && (
                        <p className="text-xs text-red-600">{publish.error}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={resetPublish}
                          className="gap-1"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Đặt lại
                        </Button>
                        {selectedSiteId && (
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1 bg-blue-600 hover:bg-blue-700"
                            disabled={retryMutation.isPending}
                            onClick={() => retryMutation.mutate()}
                          >
                            {retryMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Thử lại publish
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={() => publishMutation.mutate()}
                disabled={!canPublish || publishMutation.isPending || (seoScore ?? 0) < 60}
                className="w-full"
              >
                {publishMutation.isPending || publish.phase === 'publishing' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                Đăng lên WordPress
              </Button>

              {(seoScore ?? 0) < 60 && (
                <p className="text-center text-xs text-slate-400">
                  Cần SEO score ≥ 60 để publish
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
