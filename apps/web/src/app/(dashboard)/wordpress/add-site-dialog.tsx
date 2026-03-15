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
import { Plus, Loader2 } from 'lucide-react'

interface AddSiteDialogProps {
  isPending: boolean
  onSubmit: (form: { name: string; siteUrl: string; username: string; applicationPassword: string }) => void
}

const EMPTY_FORM = { name: '', siteUrl: '', username: '', applicationPassword: '' }

export function AddSiteDialog({ isPending, onSubmit }: AddSiteDialogProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setForm(EMPTY_FORM)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="nb-btn px-4 py-2 bg-nb-primary text-white flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Thêm site
        </button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Kết nối WordPress</DialogTitle>
            <DialogDescription>Sử dụng Application Password để kết nối an toàn</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="wp-name" className="font-semibold text-[#0D0D0D]">Tên site</Label>
              <Input
                id="wp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Blog chính"
                className="nb-input w-full px-3 py-2 text-sm mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="wp-url" className="font-semibold text-[#0D0D0D]">URL WordPress</Label>
              <Input
                id="wp-url"
                value={form.siteUrl}
                onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
                placeholder="https://example.com"
                className="nb-input w-full px-3 py-2 text-sm mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="wp-username" className="font-semibold text-[#0D0D0D]">Username</Label>
              <Input
                id="wp-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="admin"
                className="nb-input w-full px-3 py-2 text-sm mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="wp-app-password" className="font-semibold text-[#0D0D0D]">Application Password</Label>
              <Input
                id="wp-app-password"
                type="password"
                value={form.applicationPassword}
                onChange={(e) => setForm({ ...form, applicationPassword: e.target.value })}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                className="nb-input w-full px-3 py-2 text-sm mt-1.5"
              />
              <p className="text-xs text-[#0D0D0D]/50 mt-1">
                Tạo tại WordPress Dashboard → Users → Application Passwords
              </p>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="nb-btn px-4 py-2 bg-white text-[#0D0D0D]"
              onClick={() => handleOpenChange(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="nb-btn px-4 py-2 bg-nb-primary text-white flex items-center gap-1.5"
              disabled={isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Kết nối
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
