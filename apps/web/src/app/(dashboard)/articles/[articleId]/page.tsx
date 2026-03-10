'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articlesApi, wordpressApi, jobsApi } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { ArticleEditorRef } from '@/components/editor/article-editor';
import ExportTab from '@/components/editor/ExportTab';
import InternalLinksPanel from '@/components/editor/InternalLinksPanel';

// Lazy load TipTap editor (heavy component, SSR not needed)
const ArticleEditor = dynamic(() => import('@/components/editor/article-editor'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-muted/30 rounded-lg min-h-[400px] flex items-center justify-center">
      <span className="text-sm text-muted-foreground">Đang tải editor...</span>
    </div>
  ),
});
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  FileText,
  ListTree,
  PenTool,
  CheckCircle2,
  Upload,
  Globe,
  ChevronRight,
  Loader2,
  Check,
  X,
  Copy,
  Zap,
  TrendingUp,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface SeoCheckItem {
  id: string;
  label: string;
  passed: boolean;
  suggestion?: string;
}

interface OutlineSection {
  tag: string;
  text: string;
  children?: OutlineSection[];
}

interface Article {
  id: string;
  title: string;
  targetKeyword: string;
  status: string;
  projectId: string;
  content?: string;
  htmlContent?: string;
  seoScore?: number;
  wordCount?: number;
  keywordAnalysis?: {
    serpResults?: Array<{ title: string; url: string; position: number }>;
    contentGaps?: string[];
    searchIntent?: string;
    relatedKeywords?: string[];
    difficulty?: number;
    searchVolume?: number;
  };
  outline?: OutlineSection[];
  seoChecklist?: SeoCheckItem[];
  exportedHtml?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_STEPS = [
  { key: 'DRAFT', label: 'Nháp', icon: FileText, step: 1 },
  { key: 'KEYWORD_ANALYZED', label: 'Từ khóa', icon: Search, step: 2 },
  { key: 'OUTLINED', label: 'Dàn ý', icon: ListTree, step: 3 },
  { key: 'CONTENT_WRITTEN', label: 'Nội dung', icon: PenTool, step: 4 },
  { key: 'SEO_CHECKED', label: 'SEO', icon: TrendingUp, step: 5 },
  { key: 'EXPORTED', label: 'Xuất bài', icon: Upload, step: 6 },
  { key: 'PUBLISHED', label: 'Đã đăng', icon: Globe, step: 7 },
] as const;

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'ai' | 'outline' }> = {
  DRAFT: { label: 'Nháp', variant: 'secondary' },
  KEYWORD_ANALYZED: { label: 'Đã phân tích', variant: 'default' },
  OUTLINED: { label: 'Có dàn ý', variant: 'ai' },
  CONTENT_WRITTEN: { label: 'Đã viết', variant: 'warning' },
  SEO_CHECKED: { label: 'Đã kiểm tra', variant: 'default' },
  EXPORTED: { label: 'Đã xuất', variant: 'success' },
  PUBLISHED: { label: 'Đã đăng', variant: 'success' },
};

function getStatusStepIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function getSeoScoreColor(score: number): string {
  if (score >= 90) return '#22C55E';
  if (score >= 70) return '#3B82F6';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

// ============================================================================
// SEO Score Gauge Component
// ============================================================================

function SeoScoreGauge({ score }: { score: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);
  const color = getSeoScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
          className="transition-all duration-700 ease-out"
        />
        <text
          x="60"
          y="55"
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={color}
          style={{ fontSize: '28px', fontWeight: 700 }}
        >
          {score}
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          fill="#64748B"
          style={{ fontSize: '11px' }}
        >
          /100
        </text>
      </svg>
      <span
        className="mt-1 text-xs font-semibold"
        style={{ color }}
      >
        {score >= 90
          ? 'Tuyệt vời'
          : score >= 70
            ? 'Tốt'
            : score >= 50
              ? 'Cần cải thiện'
              : 'Yếu'}
      </span>
    </div>
  );
}

// ============================================================================
// Outline Tree Component
// ============================================================================

function OutlineTree({ sections }: { sections: OutlineSection[] }) {
  return (
    <div className="space-y-1">
      {sections.map((section, i) => (
        <div key={i}>
          <div
            className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm ${
              section.tag === 'H2'
                ? 'font-semibold text-[#0F172A]'
                : 'pl-6 text-[#64748B]'
            }`}
          >
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-[#64748B]">
              {section.tag}
            </span>
            <span>{section.text}</span>
          </div>
          {section.children && section.children.length > 0 && (
            <div className="ml-4 border-l-2 border-purple-100">
              <OutlineTree sections={section.children} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Components
// ============================================================================

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-4 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-pulse ${className}`}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      <header className="bg-white border-b border-[#E2E8F0] px-8 py-3 flex items-center gap-4">
        <SkeletonLine className="w-20 h-5" />
        <SkeletonLine className="w-64 h-6" />
        <SkeletonLine className="w-20 h-5 ml-auto" />
      </header>
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-3">
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonLine key={i} className="w-24 h-8" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex">
        <div className="flex-1 p-8">
          <div className="max-w-[800px] mx-auto bg-white rounded-xl border border-[#E2E8F0] p-8 space-y-4">
            <SkeletonLine className="w-3/4 h-8" />
            <SkeletonLine className="w-full h-4" />
            <SkeletonLine className="w-full h-4" />
            <SkeletonLine className="w-2/3 h-4" />
            <SkeletonLine className="w-full h-4 mt-6" />
            <SkeletonLine className="w-full h-4" />
            <SkeletonLine className="w-1/2 h-4" />
          </div>
        </div>
        <div className="w-[320px] bg-white border-l border-[#E2E8F0] p-5 space-y-4">
          <SkeletonLine className="w-32 h-6" />
          <SkeletonLine className="w-full h-10" />
          <SkeletonLine className="w-full h-32" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step Progress Bar Component
// ============================================================================

function StepProgressBar({
  currentStepIndex,
  activePanel,
  onStepClick,
}: {
  currentStepIndex: number;
  activePanel: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <TooltipProvider>
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-3">
        <div className="flex items-center gap-0 overflow-x-auto">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isActive = idx === activePanel;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onStepClick(idx)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap
                        transition-all duration-200 cursor-pointer
                        ${isActive
                          ? 'bg-[#F5F3FF] text-[#6D28D9] ring-1 ring-[#8B5CF6]/30'
                          : isCurrent
                            ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                            : isCompleted
                              ? 'text-[#22C55E] hover:bg-green-50'
                              : 'text-[#94A3B8] hover:bg-gray-50'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                      <span>{step.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Bước {step.step}: {step.label}</p>
                  </TooltipContent>
                </Tooltip>
                {idx < STATUS_STEPS.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 mx-1 text-[#E2E8F0] flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Sidebar Panels
// ============================================================================

// Panel 1: Keyword Analysis
function KeywordPanel({
  article,
  articleId,
  onComplete,
}: {
  article: Article;
  articleId: string;
  onComplete: () => void;
}) {
  const [keyword, setKeyword] = useState(article.targetKeyword || '');
  const [progress, setProgress] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const mutation = useMutation({
    mutationFn: (kw: string) =>
      articlesApi.step1(articleId, { keyword: kw, language: 'vi', country: 'VN' }),
    onMutate: () => {
      setProgress(10);
    },
    onSuccess: () => {
      setProgress(100);
      toast.success('Phân tích từ khóa hoàn tất!');
      onComplete();
    },
    onError: (err: any) => {
      setProgress(0);
      toast.error(err?.response?.data?.message || 'Lỗi phân tích từ khóa');
    },
  });

  useEffect(() => {
    if (!mutation.isPending) return;

    let cancelled = false;
    jobsApi.createEventSource(articleId).then((es) => {
      if (cancelled) { es.close(); return; }
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress) {
            setProgress(Math.min(data.progress, 95));
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
      };
    });

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
    };
  }, [mutation.isPending, articleId]);

  const analysis = article.keywordAnalysis;
  const isAnalyzed = !!analysis && article.status !== 'DRAFT';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-md bg-[#EFF6FF]">
          <Search className="h-4 w-4 text-[#3B82F6]" />
        </div>
        <h3 className="font-semibold text-sm text-[#0F172A]">Phân tích từ khóa</h3>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-[#64748B]">Từ khóa mục tiêu</Label>
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="VD: chiến lược content marketing 2024"
          disabled={mutation.isPending}
        />
      </div>

      <Button
        className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
        disabled={!keyword.trim() || mutation.isPending}
        onClick={() => mutation.mutate(keyword.trim())}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang phân tích SERP...
          </>
        ) : isAnalyzed ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Phân tích lại
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Phân tích từ khóa
          </>
        )}
      </Button>

      {mutation.isPending && (
        <div className="space-y-1">
          <Progress value={progress} indicatorClassName="bg-[#3B82F6]" />
          <p className="text-[10px] text-[#64748B]">Đang phân tích SERP... (~20 giây)</p>
        </div>
      )}

      {isAnalyzed && analysis && (
        <div className="space-y-3 pt-2 animate-in fade-in duration-300">
          {analysis.searchIntent && (
            <Card className="border-[#E2E8F0]">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-1">
                  Ý định tìm kiếm
                </p>
                <Badge variant="ai">{analysis.searchIntent}</Badge>
              </CardContent>
            </Card>
          )}

          {analysis.searchVolume !== undefined && (
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-[#E2E8F0]">
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-1">
                    Lượt tìm
                  </p>
                  <p className="text-lg font-bold text-[#0F172A]">
                    {(analysis.searchVolume || 0).toLocaleString('vi-VN')}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-[#E2E8F0]">
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-1">
                    Độ khó
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: getSeoScoreColor(100 - (analysis.difficulty || 0)) }}
                  >
                    {analysis.difficulty ?? '—'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {analysis.serpResults && analysis.serpResults.length > 0 && (
            <Card className="border-[#E2E8F0]">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-2">
                  Kết quả SERP hàng đầu
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {analysis.serpResults.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-[#64748B]">
                        {r.position}
                      </span>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3B82F6] hover:underline line-clamp-2 leading-snug"
                      >
                        {r.title}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysis.contentGaps && analysis.contentGaps.length > 0 && (
            <Card className="border-l-[3px] border-l-[#8B5CF6] border-[#E2E8F0]">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-2">
                  Khoảng trống nội dung
                </p>
                <div className="space-y-1">
                  {analysis.contentGaps.map((gap, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#0F172A]">
                      <AlertTriangle className="h-3 w-3 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysis.relatedKeywords && analysis.relatedKeywords.length > 0 && (
            <Card className="border-[#E2E8F0]">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-2">
                  Từ khóa liên quan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.relatedKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Panel 2: Outline
function OutlinePanel({
  article,
  articleId,
  onComplete,
}: {
  article: Article;
  articleId: string;
  onComplete: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => articlesApi.step2(articleId),
    onSuccess: () => {
      toast.success('Tạo dàn ý hoàn tất!');
      onComplete();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Lỗi tạo dàn ý');
    },
  });

  const hasOutline = article.outline && article.outline.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-md bg-[#F5F3FF]">
          <ListTree className="h-4 w-4 text-[#8B5CF6]" />
        </div>
        <h3 className="font-semibold text-sm text-[#0F172A]">Tạo dàn ý bài viết</h3>
      </div>

      <p className="text-xs text-[#64748B]">
        AI sẽ phân tích kết quả SERP và tạo cấu trúc bài viết tối ưu theo chuẩn SEO/AEO.
      </p>

      <Button
        className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            AI đang tạo đề cương...
          </>
        ) : hasOutline ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Tạo lại dàn ý
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Tạo dàn ý
          </>
        )}
      </Button>

      {mutation.isPending && (
        <div className="space-y-1">
          <Progress value={undefined} className="animate-pulse" indicatorClassName="bg-[#8B5CF6]" />
          <p className="text-[10px] text-[#64748B]">AI đang tạo đề cương... (~15 giây)</p>
        </div>
      )}

      {hasOutline && article.outline && (
        <Card className="border-[#E2E8F0] animate-in fade-in duration-300">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-2">
              Cấu trúc bài viết
            </p>
            <OutlineTree sections={article.outline} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Panel 3: Content Writing
function ContentPanel({
  article,
  articleId,
  onComplete,
}: {
  article: Article;
  articleId: string;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  const mutation = useMutation({
    mutationFn: () => articlesApi.step3(articleId),
    onMutate: () => {
      setProgress(5);
      setStatusMsg('Đang khởi tạo...');
    },
    onSuccess: () => {
      setProgress(100);
      setStatusMsg('Hoàn tất!');
      toast.success('Viết bài hoàn tất!');
      onComplete();
    },
    onError: (err: any) => {
      setProgress(0);
      setStatusMsg('');
      toast.error(err?.response?.data?.message || 'Lỗi viết bài');
    },
  });

  useEffect(() => {
    if (!mutation.isPending) return;

    let cancelled = false;
    jobsApi.createEventSource(articleId).then((es) => {
      if (cancelled) { es.close(); return; }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress) setProgress(Math.min(data.progress, 95));
          if (data.message) setStatusMsg(data.message);
        } catch {}
      };

      es.onerror = () => es.close();
    });

    return () => {
      cancelled = true;
    };
  }, [mutation.isPending, articleId]);

  const hasContent = !!article.content;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-md bg-[#FFFBEB]">
          <PenTool className="h-4 w-4 text-[#F59E0B]" />
        </div>
        <h3 className="font-semibold text-sm text-[#0F172A]">Viết nội dung bài</h3>
      </div>

      <p className="text-xs text-[#64748B]">
        AI sẽ viết toàn bộ bài viết dựa trên dàn ý đã tạo, tối ưu cho SEO và AEO.
      </p>

      <Button
        className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            AI đang viết nội dung...
          </>
        ) : hasContent ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Viết lại bài
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Viết bài
          </>
        )}
      </Button>

      {mutation.isPending && (
        <div className="space-y-2">
          <Progress value={progress} indicatorClassName="bg-[#8B5CF6]" />
          <div className="flex items-center justify-between text-[10px] text-[#64748B]">
            <span>{statusMsg || 'AI đang viết nội dung... (~30 giây)'}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {hasContent && (
        <Card className="border-[#E2E8F0] animate-in fade-in duration-300">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider">
                Trạng thái
              </p>
              <Badge variant="success">Hoàn tất</Badge>
            </div>
            {article.wordCount && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748B]">Số từ</span>
                <span className="font-semibold text-[#0F172A]">
                  {article.wordCount.toLocaleString('vi-VN')} từ
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Panel 4: SEO Check
function SeoCheckPanel({
  article,
  articleId,
  onComplete,
}: {
  article: Article;
  articleId: string;
  onComplete: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => articlesApi.step4(articleId),
    onSuccess: () => {
      toast.success('Kiểm tra SEO hoàn tất!');
      onComplete();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Lỗi kiểm tra SEO');
    },
  });

  const hasSeo = article.seoScore !== undefined && article.seoScore !== null;
  const checklist = article.seoChecklist || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-md bg-[#EFF6FF]">
          <TrendingUp className="h-4 w-4 text-[#3B82F6]" />
        </div>
        <h3 className="font-semibold text-sm text-[#0F172A]">Kiểm tra SEO</h3>
      </div>

      <p className="text-xs text-[#64748B]">
        Kiểm tra 12 tiêu chí SEO quan trọng và đề xuất cải thiện.
      </p>

      <Button
        className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang tính điểm SEO...
          </>
        ) : hasSeo ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Kiểm tra lại
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4 mr-2" />
            Kiểm tra SEO
          </>
        )}
      </Button>

      {mutation.isPending && (
        <div className="space-y-1">
          <Progress value={undefined} className="animate-pulse" indicatorClassName="bg-[#3B82F6]" />
          <p className="text-[10px] text-[#64748B]">Đang tính điểm SEO...</p>
        </div>
      )}

      {hasSeo && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <SeoScoreGauge score={article.seoScore!} />

          {checklist.length > 0 && (
            <Card className="border-[#E2E8F0]">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-2">
                  Checklist SEO ({checklist.filter((c) => c.passed).length}/{checklist.length})
                </p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {checklist.map((item) => (
                    <div key={item.id} className="group">
                      <div className="flex items-start gap-2 text-xs">
                        {item.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E] flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span
                            className={`${
                              item.passed ? 'text-[#0F172A]' : 'text-[#EF4444] font-medium'
                            }`}
                          >
                            {item.label}
                          </span>
                          {!item.passed && item.suggestion && (
                            <p className="text-[10px] text-[#64748B] mt-0.5">
                              💡 {item.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Panel 5: Export
function ExportPanel({
  article,
  articleId,
  onComplete,
}: {
  article: Article;
  articleId: string;
  onComplete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [wpSiteId, setWpSiteId] = useState('');

  const { data: wpSites } = useQuery({
    queryKey: ['wordpress-sites'],
    queryFn: () => wordpressApi.listSites(),
  });

  const exportMutation = useMutation({
    mutationFn: () => articlesApi.step5Export(articleId),
    onSuccess: () => {
      toast.success('Xuất HTML hoàn tất!');
      onComplete();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Lỗi xuất HTML');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (siteId: string) => wordpressApi.publish(articleId, siteId),
    onSuccess: () => {
      toast.success('Đăng lên WordPress thành công!');
      onComplete();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Lỗi đăng bài lên WordPress');
    },
  });

  const handleCopyHtml = useCallback(async () => {
    if (article.exportedHtml) {
      await navigator.clipboard.writeText(article.exportedHtml);
      setCopied(true);
      toast.success('Đã sao chép HTML!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [article.exportedHtml]);

  const hasExport = !!article.exportedHtml;
  const sites = Array.isArray(wpSites) ? wpSites : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-md bg-[#F0FDF4]">
          <Upload className="h-4 w-4 text-[#22C55E]" />
        </div>
        <h3 className="font-semibold text-sm text-[#0F172A]">Xuất & Đăng bài</h3>
      </div>

      <Button
        className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
        disabled={exportMutation.isPending}
        onClick={() => exportMutation.mutate()}
      >
        {exportMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang xuất HTML...
          </>
        ) : hasExport ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Xuất lại HTML
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Xuất HTML
          </>
        )}
      </Button>

      {hasExport && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <Card className="border-[#E2E8F0]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider">
                  HTML Preview
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCopyHtml}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Sao chép
                    </>
                  )}
                </Button>
              </div>
              <pre className="text-[10px] bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0] max-h-48 overflow-auto font-mono text-[#64748B] whitespace-pre-wrap break-all">
                {article.exportedHtml?.substring(0, 1000)}
                {(article.exportedHtml?.length || 0) > 1000 && '...'}
              </pre>
            </CardContent>
          </Card>

          {sites.length > 0 && (
            <Card className="border-[#E2E8F0]">
              <CardContent className="p-3 space-y-2">
                <p className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider">
                  Đăng lên WordPress
                </p>
                <select
                  value={wpSiteId}
                  onChange={(e) => setWpSiteId(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="">Chọn site WordPress...</option>
                  {sites.map((site: any) => (
                    <option key={site.id} value={site.id}>
                      {site.name || site.siteUrl}
                    </option>
                  ))}
                </select>
                <Button
                  className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white"
                  disabled={!wpSiteId || publishMutation.isPending}
                  onClick={() => publishMutation.mutate(wpSiteId)}
                >
                  {publishMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang đồng bộ với WordPress...
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      Đăng bài
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Content Area Components
// ============================================================================

function EmptyContentState({ status }: { status: string }) {
  const stepIndex = getStatusStepIndex(status);
  const messages: Record<number, { title: string; desc: string }> = {
    0: {
      title: 'Bắt đầu phân tích từ khóa',
      desc: 'Nhập từ khóa mục tiêu ở panel bên phải để AI phân tích SERP và đề xuất chiến lược nội dung.',
    },
    1: {
      title: 'Sẵn sàng tạo dàn ý',
      desc: 'Bấm "Tạo dàn ý" ở panel bên phải để AI tạo cấu trúc bài viết tối ưu.',
    },
    2: {
      title: 'Sẵn sàng viết bài',
      desc: 'Dàn ý đã sẵn sàng. Bấm "Viết bài" ở panel bên phải để AI viết toàn bộ nội dung.',
    },
  };

  const msg = messages[stepIndex] || messages[0];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F5F3FF] flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-[#8B5CF6]" />
      </div>
      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{msg.title}</h3>
      <p className="text-sm text-[#64748B] max-w-sm">{msg.desc}</p>
    </div>
  );
}

function KeywordSummaryView({ analysis }: { analysis: Article['keywordAnalysis'] }) {
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#0F172A]">Kết quả phân tích từ khóa</h2>

      <div className="grid grid-cols-3 gap-4">
        {analysis.searchVolume !== undefined && (
          <Card className="border-t-[3px] border-t-[#3B82F6] border-[#E2E8F0]">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-[#64748B] mb-1">Lượt tìm kiếm</p>
              <p className="text-2xl font-bold text-[#0F172A]">
                {analysis.searchVolume.toLocaleString('vi-VN')}
              </p>
            </CardContent>
          </Card>
        )}
        {analysis.difficulty !== undefined && (
          <Card className="border-t-[3px] border-t-[#F59E0B] border-[#E2E8F0]">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-[#64748B] mb-1">Độ khó</p>
              <p
                className="text-2xl font-bold"
                style={{ color: getSeoScoreColor(100 - analysis.difficulty) }}
              >
                {analysis.difficulty}/100
              </p>
            </CardContent>
          </Card>
        )}
        {analysis.searchIntent && (
          <Card className="border-t-[3px] border-t-[#8B5CF6] border-[#E2E8F0]">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-[#64748B] mb-1">Ý định</p>
              <Badge variant="ai" className="text-sm">{analysis.searchIntent}</Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {analysis.serpResults && analysis.serpResults.length > 0 && (
        <Card className="border-[#E2E8F0]">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">
              Top kết quả SERP
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-3">
              {analysis.serpResults.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 border-b border-[#F1F5F9] last:border-0"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-md bg-[#F8FAFC] flex items-center justify-center text-xs font-bold text-[#64748B]">
                    {r.position}
                  </span>
                  <div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#3B82F6] hover:underline font-medium"
                    >
                      {r.title}
                    </a>
                    <p className="text-xs text-[#94A3B8] mt-0.5 truncate max-w-lg">{r.url}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.contentGaps && analysis.contentGaps.length > 0 && (
        <Card className="border-l-[3px] border-l-[#8B5CF6] border-[#E2E8F0]">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">
              Khoảng trống nội dung cần bổ sung
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              {analysis.contentGaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Zap className="h-4 w-4 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                  <span className="text-[#0F172A]">{gap}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OutlineContentView({ outline }: { outline: OutlineSection[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#0F172A]">Dàn ý bài viết</h2>
      <Card className="border-[#E2E8F0]">
        <CardContent className="p-6">
          <OutlineTree sections={outline} />
        </CardContent>
      </Card>
    </div>
  );
}

function ArticleContentView({
  article,
  articleId,
  editorRef,
}: {
  article: Article;
  articleId: string;
  editorRef: React.RefObject<ArticleEditorRef>;
}) {
  const queryClient = useQueryClient();
  const htmlContent = article.htmlContent || article.content;

  // Auto-save debounced content changes
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMutation = useMutation({
    mutationFn: (data: { content: string; contentHtml: string; wordCount: number }) =>
      articlesApi.update(articleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
    },
  });

  const handleContentChange = useCallback(
    (html: string, text: string, wordCount: number) => {
      // Debounce auto-save (2 seconds after last edit)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveMutation.mutate({ content: text, contentHtml: html, wordCount });
      }, 2000);
    },
    [saveMutation]
  );

  // AI action handler
  const handleAIAction = useCallback(
    async (action: string, selectedText: string): Promise<string | null> => {
      try {
        const result = await articlesApi.aiAction(articleId, {
          action,
          selectedText,
          context: article.targetKeyword,
        });
        toast.success(`AI ${action} hoàn tất!`);
        return result?.data?.result || result?.result || null;
      } catch (err) {
        toast.error('Lỗi AI action');
        return null;
      }
    },
    [articleId, article.targetKeyword]
  );

  return (
    <div className="space-y-4">
      <ArticleEditor
        ref={editorRef}
        content={htmlContent || ''}
        keyword={article.targetKeyword}
        articleId={articleId}
        editable={article.status !== 'PUBLISHED'}
        onContentChange={handleContentChange}
        onAIAction={handleAIAction}
      />
      {saveMutation.isPending && (
        <p className="text-xs text-[#94A3B8] text-right">Đang lưu...</p>
      )}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ArticleEditorPage() {
  const params = useParams();
  const articleId = params.articleId as string;
  const queryClient = useQueryClient();
  const editorRef = useRef<ArticleEditorRef | null>(null);

  const [title, setTitle] = useState('');
  const [activePanel, setActivePanel] = useState<number | null>(null);

  const {
    data: article,
    isLoading,
    isError,
    error,
  } = useQuery<Article>({
    queryKey: ['article', articleId],
    queryFn: () => articlesApi.get(articleId),
  });

  useEffect(() => {
    if (article?.title) {
      setTitle(article.title);
    }
  }, [article?.title]);

  useEffect(() => {
    if (article && activePanel === null) {
      setActivePanel(getStatusStepIndex(article.status));
    }
  }, [article, activePanel]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, any>) => articlesApi.update(articleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      toast.success('Đã lưu thành công!');
    },
    onError: () => {
      toast.error('Lỗi lưu tiêu đề');
    },
  });

  const handleTitleBlur = () => {
    if (title.trim() && title !== article?.title) {
      saveMutation.mutate({ title: title.trim() });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleStepComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['article', articleId] });
  }, [queryClient, articleId]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError || !article) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[#F8FAFC]">
        <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] flex items-center justify-center">
          <XCircle className="h-8 w-8 text-[#EF4444]" />
        </div>
        <p className="text-[#64748B] font-medium">
          {(error as any)?.response?.status === 404
            ? 'Không tìm thấy bài viết'
            : 'Lỗi tải bài viết'}
        </p>
        <Link href="/articles">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  const currentStepIndex = getStatusStepIndex(article.status);
  const currentPanel = activePanel ?? currentStepIndex;
  const statusBadge = STATUS_BADGE_MAP[article.status] || STATUS_BADGE_MAP.DRAFT;

  // Determine main content to show
  const renderMainContent = () => {
    const hasContent = !!article.content || !!article.htmlContent;
    const hasOutline = article.outline && article.outline.length > 0;
    const hasAnalysis = !!article.keywordAnalysis;
    const showInternalLinks = hasContent && ['SEO_CHECKED', 'EXPORTED', 'PUBLISHED'].includes(article.status);

    if (hasContent) {
      return (
        <div className="space-y-8">
          <ArticleContentView article={article} articleId={articleId} editorRef={editorRef} />
          {showInternalLinks && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                Gợi ý Internal Links
              </h3>
              <InternalLinksPanel
                articleId={articleId}
                onInsert={(anchorText, path) => {
                  navigator.clipboard.writeText(`<a href="${path}">${anchorText}</a>`)
                  toast.success('Đã copy HTML link vào clipboard')
                }}
              />
            </div>
          )}
        </div>
      );
    }

    if (hasOutline && article.outline) {
      return <OutlineContentView outline={article.outline} />;
    }

    if (hasAnalysis) {
      return <KeywordSummaryView analysis={article.keywordAnalysis} />;
    }

    return <EmptyContentState status={article.status} />;
  };

  // Determine sidebar panel
  const renderSidebarPanel = () => {
    switch (currentPanel) {
      case 0:
        return (
          <KeywordPanel
            article={article}
            articleId={articleId}
            onComplete={handleStepComplete}
          />
        );
      case 1:
        return (
          <KeywordPanel
            article={article}
            articleId={articleId}
            onComplete={handleStepComplete}
          />
        );
      case 2:
        return (
          <OutlinePanel
            article={article}
            articleId={articleId}
            onComplete={handleStepComplete}
          />
        );
      case 3:
        return (
          <ContentPanel
            article={article}
            articleId={articleId}
            onComplete={handleStepComplete}
          />
        );
      case 4:
        return (
          <SeoCheckPanel
            article={article}
            articleId={articleId}
            onComplete={handleStepComplete}
          />
        );
      case 5:
      case 6:
        return (
          <ExportTab
            articleId={articleId}
            articleTitle={article.title}
            seoScore={article.seoScore}
            status={article.status}
            exportedHtml={article.exportedHtml}
          />
        );
      default:
        return (
          <KeywordPanel
            article={article}
            articleId={articleId}
            onComplete={handleStepComplete}
          />
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      {/* ==================== Top Header ==================== */}
      <header className="bg-white border-b border-[#E2E8F0] px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Breadcrumb */}
          <Link
            href={article.projectId ? `/projects/${article.projectId}/articles` : '/articles'}
            className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#3B82F6] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Bài viết</span>
          </Link>

          <ChevronRight className="h-3.5 w-3.5 text-[#E2E8F0] flex-shrink-0" />

          {/* Editable title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="text-lg font-semibold text-[#0F172A] bg-transparent border-none outline-none
              focus:bg-[#F8FAFC] px-2 py-1 rounded-md min-w-[200px] flex-1 max-w-[500px]
              transition-colors duration-150 hover:bg-[#F8FAFC]"
            placeholder="Tiêu đề bài viết..."
          />

          {/* Status badge */}
          <Badge variant={statusBadge.variant} className="flex-shrink-0">
            {statusBadge.label}
          </Badge>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-[#94A3B8]">
            {saveMutation.isPending ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang lưu...
              </span>
            ) : (
              'Đã lưu'
            )}
          </span>
        </div>
      </header>

      {/* ==================== Step Progress Bar ==================== */}
      <StepProgressBar
        currentStepIndex={currentStepIndex}
        activePanel={currentPanel}
        onStepClick={setActivePanel}
      />

      {/* ==================== Main Layout ==================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Main Content Area (70%) */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-[800px] mx-auto bg-white rounded-xl border border-[#E2E8F0] min-h-[500px] p-8 shadow-sm">
            {/* Article meta */}
            <div className="mb-6 pb-6 border-b border-[#F1F5F9]">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-[#64748B]" />
                  <span className="text-[#64748B]">Từ khóa:</span>
                  <span className="font-medium text-[#0F172A]">
                    {article.targetKeyword || '—'}
                  </span>
                </div>
                {article.seoScore !== undefined && article.seoScore !== null && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-[#64748B]" />
                    <span className="text-[#64748B]">SEO:</span>
                    <span
                      className="font-semibold"
                      style={{ color: getSeoScoreColor(article.seoScore) }}
                    >
                      {article.seoScore}/100
                    </span>
                  </div>
                )}
                {article.wordCount && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-[#64748B]" />
                    <span className="text-[#64748B]">
                      {article.wordCount.toLocaleString('vi-VN')} từ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Main content */}
            {renderMainContent()}
          </div>
        </div>

        {/* Right: Action Sidebar (320px) */}
        <div className="w-[320px] bg-white border-l border-[#E2E8F0] p-5 overflow-y-auto flex-shrink-0 shadow-sm">
          <div className="animate-in fade-in duration-200">
            {renderSidebarPanel()}
          </div>
        </div>
      </div>
    </div>
  );
}
