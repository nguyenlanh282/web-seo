'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { wordpressApi } from '@/lib/api'
import { toast } from 'sonner'
import { Globe, Trash2, ExternalLink, Loader2, Plus } from 'lucide-react'
import { AddSiteDialog } from './add-site-dialog'

export default function WordPressPage() {
  const queryClient = useQueryClient()

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['wp-sites'],
    queryFn: wordpressApi.listSites,
  })

  const addMutation = useMutation({
    mutationFn: wordpressApi.addSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wp-sites'] })
      toast.success('Đã kết nối WordPress site')
    },
    onError: () => toast.error('Không thể kết nối. Kiểm tra lại thông tin.'),
  })

  const deleteMutation = useMutation({
    mutationFn: wordpressApi.removeSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wp-sites'] })
      toast.success('Đã xóa kết nối')
    },
  })

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[#0D0D0D]"
            style={{ fontFamily: 'var(--nb-font-heading)' }}
          >
            WordPress
          </h1>
          <p className="text-sm text-[#0D0D0D]/60 mt-1">
            Kết nối trang WordPress để xuất bài viết trực tiếp
          </p>
        </div>
        <AddSiteDialog isPending={addMutation.isPending} onSubmit={(form) => addMutation.mutate(form)} />
      </div>

      {/* Site list / empty / loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-nb-primary" />
        </div>
      ) : Array.isArray(sites) && sites.length > 0 ? (
        <div className="space-y-3">
          {sites.map((site: any) => (
            <div key={site.id} className="nb-card p-5 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-nb-primary" />
                <div>
                  <p className="font-medium text-[#0D0D0D]">{site.name || site.siteUrl}</p>
                  <p className="text-xs text-[#0D0D0D]/50">{site.siteUrl}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="nb-badge bg-green-300 text-[#0D0D0D]">Đã kết nối</span>
                <button
                  className="nb-btn p-2 bg-white text-[#0D0D0D]"
                  onClick={() => window.open(site.siteUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  className="nb-btn p-2 bg-nb-red text-white"
                  onClick={() => {
                    if (confirm('Xóa kết nối WordPress này?')) {
                      deleteMutation.mutate(site.id)
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="nb-card bg-nb-bg py-12 flex flex-col items-center gap-3">
          <Globe className="w-12 h-12 text-[#0D0D0D]/30" />
          <h3 className="font-medium text-[#0D0D0D]">Chưa có WordPress site nào</h3>
          <p className="text-sm text-[#0D0D0D]/60">
            Kết nối WordPress để xuất bài viết trực tiếp từ SEOPen
          </p>
          <AddSiteDialog isPending={addMutation.isPending} onSubmit={(form) => addMutation.mutate(form)} />
        </div>
      )}

      {/* Instructions */}
      <div className="nb-card mt-8 p-6 bg-white">
        <h2
          className="text-base font-bold text-[#0D0D0D] mb-4"
          style={{ fontFamily: 'var(--nb-font-heading)' }}
        >
          Hướng dẫn tạo Application Password
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-[#0D0D0D]/70">
          <li>Đăng nhập WordPress Dashboard với quyền Administrator</li>
          <li>Vào <strong>Users → Profile</strong></li>
          <li>Kéo xuống mục <strong>Application Passwords</strong></li>
          <li>Nhập tên (ví dụ: &quot;SEOPen&quot;) và nhấn <strong>Add New</strong></li>
          <li>Copy mật khẩu được tạo và dán vào trường Application Password ở trên</li>
        </ol>
      </div>
    </div>
  )
}
