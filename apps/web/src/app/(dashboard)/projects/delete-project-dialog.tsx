'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteProjectDialogProps {
  open: boolean
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteProjectDialog({ open, isPending, onConfirm, onCancel }: DeleteProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa dự án</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn xóa dự án này? Hành động này không thể hoàn tác và tất cả bài viết trong dự án sẽ bị xóa.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <button
            className="nb-btn px-4 py-2 bg-white text-[#0D0D0D]"
            onClick={onCancel}
            disabled={isPending}
          >
            Hủy
          </button>
          <button
            className="nb-btn px-4 py-2 bg-nb-red text-white flex items-center gap-2"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isPending ? 'Đang xóa...' : 'Xóa dự án'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
