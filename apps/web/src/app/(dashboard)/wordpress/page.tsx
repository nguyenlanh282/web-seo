'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { wordpressApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Globe, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react'

export default function WordPressPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', siteUrl: '', username: '', applicationPassword: '' })

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['wp-sites'],
    queryFn: wordpressApi.listSites,
  })

  const addMutation = useMutation({
    mutationFn: wordpressApi.addSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wp-sites'] })
      setOpen(false)
      setForm({ name: '', siteUrl: '', username: '', applicationPassword: '' })
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.siteUrl || !form.username || !form.applicationPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }
    addMutation.mutate(form)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">WordPress</h1>
          <p className="text-sm text-slate-500 mt-1">Kết nối trang WordPress để xuất bài viết trực tiếp</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-1.5" />
              Thêm site
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Kết nối WordPress</DialogTitle>
                <DialogDescription>
                  Sử dụng Application Password để kết nối an toàn
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Tên site</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Blog chính"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>URL WordPress</Label>
                  <Input
                    value={form.siteUrl}
                    onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
                    placeholder="https://example.com"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="admin"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Application Password</Label>
                  <Input
                    type="password"
                    value={form.applicationPassword}
                    onChange={(e) => setForm({ ...form, applicationPassword: e.target.value })}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Tạo tại WordPress Dashboard → Users → Application Passwords
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  Kết nối
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : Array.isArray(sites) && sites.length > 0 ? (
        <div className="space-y-3">
          {sites.map((site: any) => (
            <Card key={site.id}>
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-slate-900">{site.name || site.siteUrl}</p>
                    <p className="text-xs text-slate-500">{site.siteUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Đã kết nối</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(site.siteUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => {
                      if (confirm('Xóa kết nối WordPress này?')) {
                        deleteMutation.mutate(site.id)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="font-medium text-slate-900 mb-1">Chưa có WordPress site nào</h3>
            <p className="text-sm text-slate-500 mb-4">
              Kết nối WordPress để xuất bài viết trực tiếp từ SEOPen
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Thêm site đầu tiên
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Hướng dẫn tạo Application Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            <li>Đăng nhập WordPress Dashboard với quyền Administrator</li>
            <li>Vào <strong>Users → Profile</strong></li>
            <li>Kéo xuống mục <strong>Application Passwords</strong></li>
            <li>Nhập tên (ví dụ: &quot;SEOPen&quot;) và nhấn <strong>Add New</strong></li>
            <li>Copy mật khẩu được tạo và dán vào trường Application Password ở trên</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
