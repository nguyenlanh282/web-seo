'use client'

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Minus,
  Sparkles,
  Loader2,
  WrapText,
  Shrink,
  Expand,
  User,
  type LucideIcon,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ArticleEditorProps {
  content?: string
  placeholder?: string
  editable?: boolean
  articleId?: string
  keyword?: string
  onContentChange?: (html: string, text: string, wordCount: number) => void
  onAIAction?: (action: string, selectedText: string) => Promise<string | null>
  className?: string
}

export interface ArticleEditorRef {
  getHTML: () => string
  getText: () => string
  getWordCount: () => number
  setContent: (html: string) => void
  focus: () => void
}

// ============================================================================
// Toolbar Button
// ============================================================================

function ToolbarButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`p-1.5 rounded-md transition-colors ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />
}

// ============================================================================
// AI Bubble Menu
// ============================================================================

function AIBubbleActions({
  onAction,
  isLoading,
}: {
  onAction: (action: string) => void
  isLoading: boolean
}) {
  const actions = [
    { key: 'rewrite', label: 'Viết lại', icon: WrapText },
    { key: 'expand', label: 'Mở rộng', icon: Expand },
    { key: 'simplify', label: 'Đơn giản', icon: Shrink },
    { key: 'humanize', label: 'Tự nhiên hơn', icon: User },
  ]

  return (
    <div className="flex items-center gap-0.5 bg-popover border shadow-lg rounded-lg p-1">
      <div className="flex items-center gap-0.5 pr-1 mr-1 border-r">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-[10px] font-medium text-muted-foreground">AI</span>
      </div>
      {actions.map(({ key, label, icon: Icon }) => (
        <TooltipProvider key={key} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onAction(key)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  )
}

// ============================================================================
// Link Input Dialog (inline)
// ============================================================================

function LinkInput({
  onSubmit,
  onCancel,
  initialUrl,
}: {
  onSubmit: (url: string) => void
  onCancel: () => void
  initialUrl?: string
}) {
  const [url, setUrl] = useState(initialUrl || '')

  return (
    <div className="flex items-center gap-2 p-2 bg-popover border shadow-lg rounded-lg">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="h-7 text-xs w-60"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(url)
          if (e.key === 'Escape') onCancel()
        }}
      />
      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onSubmit(url)}>
        OK
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
        Hủy
      </Button>
    </div>
  )
}

// ============================================================================
// Main Editor Component
// ============================================================================

const ArticleEditor = forwardRef<ArticleEditorRef, ArticleEditorProps>(
  (
    {
      content = '',
      placeholder = 'Bắt đầu viết nội dung bài viết...',
      editable = true,
      articleId,
      keyword = '',
      onContentChange,
      onAIAction,
      className = '',
    },
    ref
  ) => {
    const [aiLoading, setAiLoading] = useState(false)
    const [showLinkInput, setShowLinkInput] = useState(false)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3, 4] },
          codeBlock: { HTMLAttributes: { class: 'bg-muted rounded-md p-4 my-3 font-mono text-sm' } },
          blockquote: { HTMLAttributes: { class: 'border-l-4 border-primary/30 pl-4 italic my-3' } },
          horizontalRule: { HTMLAttributes: { class: 'border-border my-6' } },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-primary underline underline-offset-2 hover:text-primary/80',
            rel: 'noopener noreferrer',
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class: 'rounded-lg max-w-full h-auto my-4',
          },
        }),
        Underline,
        Placeholder.configure({ placeholder }),
        CharacterCount,
      ],
      content,
      editable,
      editorProps: {
        attributes: {
          class:
            'prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-6 py-4',
        },
      },
      onUpdate: ({ editor }) => {
        if (onContentChange) {
          const html = editor.getHTML()
          const text = editor.getText()
          const wordCount = text.trim().split(/\s+/).filter(Boolean).length
          onContentChange(html, text, wordCount)
        }
      },
    })

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      getWordCount: () => {
        const text = editor?.getText() || ''
        return text.trim().split(/\s+/).filter(Boolean).length
      },
      setContent: (html: string) => editor?.commands.setContent(html),
      focus: () => editor?.commands.focus(),
    }))

    // Update content when prop changes (but only if different)
    useEffect(() => {
      if (editor && content && editor.getHTML() !== content) {
        editor.commands.setContent(content)
      }
    }, [content, editor])

    // Handle AI action
    const handleAIAction = useCallback(
      async (action: string) => {
        if (!editor || !onAIAction) return

        const { from, to } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(from, to, ' ')

        if (!selectedText.trim()) return

        setAiLoading(true)
        try {
          const result = await onAIAction(action, selectedText)
          if (result) {
            // Replace the selected text with AI result
            editor
              .chain()
              .focus()
              .deleteRange({ from, to })
              .insertContent(result)
              .run()
          }
        } finally {
          setAiLoading(false)
        }
      },
      [editor, onAIAction]
    )

    // Handle link insertion
    const handleLinkSubmit = useCallback(
      (url: string) => {
        if (!editor) return
        setShowLinkInput(false)

        if (!url) {
          editor.chain().focus().unsetLink().run()
          return
        }

        // Ensure URL has protocol
        const finalUrl = url.startsWith('http') ? url : `https://${url}`
        editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run()
      },
      [editor]
    )

    // Handle image insertion
    const handleImageInsert = useCallback(() => {
      if (!editor) return
      const url = window.prompt('URL hình ảnh:')
      if (!url) return
      const alt = window.prompt('Mô tả hình ảnh (alt text):') || ''
      editor.chain().focus().setImage({ src: url, alt }).run()
    }, [editor])

    if (!editor) return null

    const wordCount = editor.getText().trim().split(/\s+/).filter(Boolean).length
    const charCount = editor.storage.characterCount.characters()

    return (
      <div className={`border rounded-lg bg-background ${className}`}>
        {/* Toolbar */}
        {editable && (
          <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
            {/* Undo/Redo */}
            <ToolbarButton icon={Undo} label="Hoàn tác (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
            <ToolbarButton icon={Redo} label="Làm lại (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarButton icon={Heading2} label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
            <ToolbarButton icon={Heading3} label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
            <ToolbarButton icon={Heading4} label="Heading 4" active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} />

            <ToolbarDivider />

            {/* Text formatting */}
            <ToolbarButton icon={Bold} label="Đậm (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
            <ToolbarButton icon={Italic} label="Nghiêng (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
            <ToolbarButton icon={UnderlineIcon} label="Gạch chân (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
            <ToolbarButton icon={Strikethrough} label="Gạch ngang" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton icon={List} label="Danh sách" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
            <ToolbarButton icon={ListOrdered} label="Danh sách đánh số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />

            <ToolbarDivider />

            {/* Block elements */}
            <ToolbarButton icon={Quote} label="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
            <ToolbarButton icon={Code} label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
            <ToolbarButton icon={Minus} label="Đường kẻ ngang" onClick={() => editor.chain().focus().setHorizontalRule().run()} />

            <ToolbarDivider />

            {/* Link & Image */}
            <ToolbarButton
              icon={LinkIcon}
              label="Chèn liên kết"
              active={editor.isActive('link')}
              onClick={() => {
                if (editor.isActive('link')) {
                  editor.chain().focus().unsetLink().run()
                } else {
                  setShowLinkInput(true)
                }
              }}
            />
            <ToolbarButton icon={ImageIcon} label="Chèn hình ảnh" onClick={handleImageInsert} />

            {/* Word count display */}
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span>{wordCount.toLocaleString()} từ</span>
              <span>{charCount.toLocaleString()} ký tự</span>
            </div>
          </div>
        )}

        {/* Link input overlay */}
        {showLinkInput && (
          <div className="flex justify-center p-2 border-b bg-muted/20">
            <LinkInput
              initialUrl={editor.getAttributes('link').href}
              onSubmit={handleLinkSubmit}
              onCancel={() => setShowLinkInput(false)}
            />
          </div>
        )}

        {/* AI Bubble Menu on text selection */}
        {editor && editable && onAIAction && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 150, placement: 'top' }}
            shouldShow={({ editor, state }) => {
              const { from, to } = state.selection
              const text = state.doc.textBetween(from, to, ' ')
              return text.trim().length > 10 // Only show for selections > 10 chars
            }}
          >
            <AIBubbleActions onAction={handleAIAction} isLoading={aiLoading} />
          </BubbleMenu>
        )}

        {/* Editor content */}
        <EditorContent editor={editor} />

        {/* Bottom status bar */}
        {editable && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                {wordCount >= 800 ? '✅' : '⚠️'} {wordCount.toLocaleString()} / 800+ từ
              </span>
              {keyword && (
                <span className="text-muted-foreground/70">
                  Từ khoá: <span className="font-medium text-foreground">{keyword}</span>
                </span>
              )}
            </div>
            <div className="text-muted-foreground/50">
              Chọn văn bản để dùng AI • Ctrl+B đậm • Ctrl+I nghiêng
            </div>
          </div>
        )}
      </div>
    )
  }
)

ArticleEditor.displayName = 'ArticleEditor'

export default ArticleEditor
