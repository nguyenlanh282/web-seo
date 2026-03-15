'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'

interface CreateProjectDialogProps {
  isPending: boolean
  onSubmit: (data: { name: string; domain?: string; language: string }) => void
}

export function CreateProjectDialog({ isPending, onSubmit }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [language, setLanguage] = useState('vi')

  const reset = () => {
    setName('')
    setDomain('')
    setLanguage('vi')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name: name.trim(), domain: domain.trim() || undefined, language })
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  // Expose open setter so parent can trigger from empty-state button
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="nb-btn px-4 py-2 bg-nb-primary text-white flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Tạo dự án mới
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tạo dự án mới</DialogTitle>
          <DialogDescription>Tạo dự án để tổ chức các bài viết SEO của bạn</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="project-name" className="text-[13px] font-semibold">
              Tên dự án <span className="text-nb-red">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="VD: Blog Marketing 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              autoFocus
              required
              className="nb-input w-full px-3 py-2 text-sm mt-1.5"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-domain" className="text-[13px] font-semibold">Domain</Label>
            <Input
              id="project-domain"
              placeholder="VD: blog.example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isPending}
              className="nb-input w-full px-3 py-2 text-sm mt-1.5"
            />
            <p className="text-xs text-[#0D0D0D]/40">Domain website để tối ưu SEO (không bắt buộc)</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">Ngôn ngữ</Label>
            <Select value={language} onValueChange={setLanguage} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn ngôn ngữ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                <SelectItem value="en">🇺🇸 English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              className="nb-btn px-4 py-2 bg-white text-[#0D0D0D]"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="nb-btn px-4 py-2 bg-nb-primary text-white flex items-center gap-2"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isPending ? 'Đang tạo...' : 'Tạo dự án'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
