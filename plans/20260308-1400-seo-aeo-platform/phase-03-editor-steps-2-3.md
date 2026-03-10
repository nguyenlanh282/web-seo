# Phase 03 - TipTap Editor + Steps 2 & 3
> Weeks 5-6 | Priority: P0 | Status: Pending

## Context Links
- Previous phase: [phase-02-ai-engine-step1.md](./phase-02-ai-engine-step1.md)
- Next phase: [phase-04-seo-checker.md](./phase-04-seo-checker.md)

---

## Overview
Two parallel workstreams: (A) backend processors for Step 2 (Outline Generator +
Content Gap Detection) and Step 3 (multi-section Content Writer), and (B) the
TipTap rich-text editor frontend with AI bubble menu actions. By end of week 6
the user can go from keyword analysis to a full AI-written draft editable in the
browser.

**Step 2 target**: 10-20 seconds. Transition: KEYWORD_ANALYZED -> OUTLINED
**Step 3 target**: 30-60 seconds. Transition: OUTLINED -> CONTENT_WRITTEN
**AI Editor Actions**: <8 seconds each (Claude Haiku, SYNC)

---

## Key Insights
- Step 3 is the longest call; stream tokens back via SSE for perceived speed.
- TipTap stores content as ProseMirror JSON; convert to HTML only at export.
- AI bubble menu uses Haiku (NOT Sonnet) to keep editor actions snappy (<8s).
- Bubble menu actions are SYNC - no BullMQ - direct Haiku call from NestJS.
- Outline editor is a custom TipTap extension (draggable heading nodes).
- DOMPurify must sanitize any AI-returned HTML before inserting into editor.

---

## Requirements

### Step 2 - Outline Generator
- [ ] OutlineProcessor BullMQ job (queue: ai-jobs)
- [ ] Uses KeywordAnalysis from Step 1 + content gap data
- [ ] Generates H2/H3 outline with suggested word counts per section
- [ ] Saves Outline JSON to Article.outline (new Prisma field)
- [ ] Transitions article to OUTLINED

### Step 3 - Content Writer
- [ ] ContentWriterProcessor BullMQ job (queue: ai-jobs)
- [ ] Writes each H2 section sequentially (1 Claude call per section)
- [ ] Streams partial content via SSE
- [ ] Combines sections into full HTML article
- [ ] Saves to Article.content (Text field)
- [ ] Transitions article to CONTENT_WRITTEN

### TipTap Editor
- [ ] TipTap v2 with StarterKit extension
- [ ] Custom HeadingNode extension for outline drag-and-drop
- [ ] BubbleMenu with AI actions (rewrite/expand/simplify/humanize)
- [ ] Image upload (to /api/upload, returns URL)
- [ ] Word count + reading time in footer
- [ ] Auto-save debounced (1s after last keystroke)

### AI Editor Actions (SYNC)
- [ ] POST /articles/:id/ai-action { action, selectedText }
- [ ] Returns { result: string } in < 8s using Claude Haiku
- [ ] Actions: rewrite, expand, simplify, humanize
- [ ] Replace selected text in editor on success

---

## Architecture

### Step 2 Processor (outline-generator.processor.ts)
```typescript
@Processor('ai-jobs')
export class OutlineGeneratorProcessor extends WorkerHost {
  async process(job: Job<Step2JobData>): Promise<OutlineResult> {
    const { articleId } = job.data;

    await this.emit(articleId, 'PROGRESS', 10, 'Loading keyword analysis...');
    const analysis = await this.keywordService.getAnalysis(articleId);

    await this.emit(articleId, 'PROGRESS', 40, 'Generating outline...');
    const outline = await this.claudeService.generateOutline(analysis);

    await this.emit(articleId, 'PROGRESS', 80, 'Detecting content gaps...');
    const gaps = await this.claudeService.detectGaps(analysis, outline);

    await this.emit(articleId, 'PROGRESS', 95, 'Saving...');
    await prisma.article.update({
      where: { id: articleId },
      data: { outline: JSON.stringify({ sections: outline, gaps }) },
    });
    await this.articlesService.transition(articleId, ArticleState.OUTLINED);
    await this.emit(articleId, 'COMPLETED', 100, 'Outline ready');
    return { outline, gaps };
  }
}
```

### Outline Data Shape
```typescript
export interface OutlineSection {
  id:           string;   // uuid
  level:        2 | 3;    // H2 or H3
  title:        string;
  wordCount:    number;   // suggested words for this section
  contentGap:   boolean;  // flag if this covers a gap
  children:     OutlineSection[];
}
```

### Step 3 Processor - Multi-Section Writing
```typescript
@Processor('ai-jobs')
export class ContentWriterProcessor extends WorkerHost {
  async process(job: Job<Step3JobData>): Promise<void> {
    const { articleId } = job.data;
    const article = await this.articlesService.findOne(articleId);
    const outline: OutlineSection[] = JSON.parse(article.outline).sections;

    let fullContent = `<h1>${article.title}</h1>
`;
    const total = outline.filter(s => s.level === 2).length;

    for (let i = 0; i < outline.length; i++) {
      const section = outline[i];
      if (section.level !== 2) continue;

      const pct = Math.round(10 + (i / total) * 80);
      await this.emit(articleId, 'PROGRESS', pct, `Writing: ${section.title}`);

      const sectionHtml = await this.claudeService.writeSection(
        article, section, fullContent, // pass previous content as context
      );
      fullContent += `
${sectionHtml}`;

      // Stream partial content via SSE for live preview
      await this.redis.publish(`article:${articleId}:progress`,
        JSON.stringify({ type: 'PARTIAL_CONTENT', html: sectionHtml, sectionId: section.id }));
    }

    await prisma.article.update({ where: { id: articleId },
      data: { content: fullContent } });
    await this.articlesService.transition(articleId, ArticleState.CONTENT_WRITTEN);
    await this.emit(articleId, 'COMPLETED', 100, 'Content written');
  }
}
```

### AI Editor Actions Endpoint (SYNC)
```typescript
@Post(':id/ai-action')
@UseGuards(JwtAuthGuard)
async aiAction(
  @Param('id') id: string,
  @GetUser() user: User,
  @Body() dto: AIActionDto,
): Promise<{ result: string }> {
  await this.articlesService.assertOwnership(id, user.id);
  const result = await this.claudeService.editorAction(
    dto.action,
    dto.selectedText,
    dto.context,   // surrounding paragraph for better results
  );
  return { result };
}
```

### Claude Haiku - Editor Action Prompts
```typescript
const ACTION_PROMPTS = {
  rewrite:   'Rewrite this Vietnamese text to improve clarity. Keep the same meaning.',
  expand:    'Expand this Vietnamese text with more detail and examples (add ~50% more words).',
  simplify:  'Simplify this Vietnamese text. Use shorter sentences and common words.',
  humanize:  'Rewrite this Vietnamese text to sound more natural and conversational.',
};

async editorAction(action: string, text: string, context: string): Promise<string> {
  const msg = await this.client.messages.create({
    model: AI_MODELS.haiku,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Context: ${context}

Text to ${action}: ${text}

${ACTION_PROMPTS[action]}

Return only the result, no explanation.`,
    }],
  });
  return msg.content[0].text.trim();
}
```

---

## TipTap Setup

### Installation
```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-bubble-menu
pnpm add @tiptap/extension-image @tiptap/extension-link
pnpm add @tiptap/extension-character-count dompurify @types/dompurify
pnpm add use-debounce
```

### ArticleEditor Component (apps/web/components/editor/ArticleEditor.tsx)
```typescript
'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';
import { AIBubbleMenu } from './AIBubbleMenu';
import { useAutoSave } from '@/hooks/useAutoSave';

export function ArticleEditor({ articleId, initialContent }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      CharacterCount,
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: 'prose prose-lg max-w-none focus:outline-none' },
    },
  });

  useAutoSave(editor, articleId, 1000); // 1s debounce

  return (
    <div className="relative">
      {editor && <AIBubbleMenu editor={editor} articleId={articleId} />}
      <EditorContent editor={editor} />
      <EditorFooter editor={editor} />
    </div>
  );
}
```

### AI Bubble Menu (apps/web/components/editor/AIBubbleMenu.tsx)
```typescript
'use client';
import { BubbleMenu } from '@tiptap/react';
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const ACTIONS = ['rewrite', 'expand', 'simplify', 'humanize'] as const;
type Action = typeof ACTIONS[number];

export function AIBubbleMenu({ editor, articleId }: Props) {
  const [loading, setLoading] = useState<Action | null>(null);

  const handleAction = async (action: Action) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText.trim() || selectedText.length > 2000) return;

    setLoading(action);
    try {
      const res = await api.post(`/articles/${articleId}/ai-action`, {
        action,
        selectedText,
        context: editor.state.doc.textBetween(
          Math.max(0, from - 200),
          Math.min(editor.state.doc.content.size, to + 200), ' '
        ),
      });
      const clean = DOMPurify.sanitize(res.data.result, { ALLOWED_TAGS: ['b','i','em','strong','p'] });
      editor.chain().focus().setTextSelection({ from, to }).insertContent(clean).run();
    } catch (e) {
      toast.error('AI action failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
      <div className="flex gap-1 bg-white border rounded-lg shadow-lg p-1">
        {ACTIONS.map(action => (
          <Button key={action} variant="ghost" size="sm"
            disabled={loading !== null} onClick={() => handleAction(action)}>
            {loading === action && <Loader2 className="animate-spin h-3 w-3 mr-1" />}
            {action[0].toUpperCase() + action.slice(1)}
          </Button>
        ))}
      </div>
    </BubbleMenu>
  );
}
```

### useAutoSave Hook
```typescript
export function useAutoSave(editor: Editor | null, articleId: string, delay = 1000) {
  const save = useDebouncedCallback(async (html: string) => {
    try {
      await api.patch(`/articles/${articleId}`, { content: html });
    } catch { /* silent - show indicator only */ }
  }, delay);

  useEffect(() => {
    if (!editor) return;
    const fn = () => save(editor.getHTML());
    editor.on('update', fn);
    return () => { editor.off('update', fn); };
  }, [editor, save]);
}
```
---

## Related Code Files
- `apps/web/components/editor/ArticleEditor.tsx`
- `apps/web/components/editor/AIBubbleMenu.tsx`
- `apps/web/components/editor/OutlineEditor.tsx`
- `apps/web/hooks/useAutoSave.ts`
- `apps/web/hooks/useSSEStream.ts`
- `apps/api/src/articles/processors/outline-generator.processor.ts`
- `apps/api/src/articles/processors/content-writer.processor.ts`
- `apps/api/src/anthropic/anthropic.service.ts`

---

## Implementation Steps

### Backend - Step 2 (Day 1-2)
1. Add `outline String? @db.Text` to Article model + migration.
2. Create OutlineGeneratorProcessor (@Processor('ai-jobs')).
3. Write Step 2 Claude Sonnet prompt returning JSON outline array.
4. POST /articles/:id/step2 - enqueue job, return { jobId }.

### Backend - Step 3 (Day 2-3)
1. ContentWriterProcessor: iterate H2 sections, call Claude per section.
2. Emit PARTIAL_CONTENT Redis pub/sub events for live preview.
3. Concatenate sections into full HTML; store in Article.content.
4. POST /articles/:id/step3 - enqueue job, return { jobId }.

### Backend - AI Editor Actions (Day 3)
1. POST /articles/:id/ai-action with AIActionDto.
2. Direct Claude Haiku call (sync, no queue) - < 8s target.
3. Rate limit: 10 editor actions per minute per user (Redis).

### Frontend - TipTap (Day 3-4)
1. Install all TipTap packages + DOMPurify.
2. ArticleEditor with StarterKit + Image + CharacterCount.
3. useAutoSave hook (1s debounce, PATCH /articles/:id).
4. EditorFooter: word count + estimated reading time.

### Frontend - Bubble Menu (Day 4)
1. AIBubbleMenu with 4 action buttons + loading states.
2. DOMPurify sanitize before inserting result.
3. Error toast on failure.

### Frontend - Step 2/3 UI (Day 4-5)
1. Outline display: draggable section list (dnd-kit).
2. Step 3: SSE stream shows current section being written.
3. PARTIAL_CONTENT events feed into editor as sections arrive.

---

## Todo List

### Backend Steps 2 & 3
- [ ] Article.outline (Text) Prisma field + migration
- [ ] OutlineGeneratorProcessor (ai-jobs)
- [ ] Step 2 Claude Sonnet prompt (JSON outline)
- [ ] POST /articles/:id/step2 endpoint
- [ ] ContentWriterProcessor (per-section loop)
- [ ] PARTIAL_CONTENT SSE events
- [ ] POST /articles/:id/step3 endpoint

### Backend AI Editor Actions
- [ ] AIActionDto (action, selectedText, context)
- [ ] POST /articles/:id/ai-action (sync Haiku)
- [ ] 4 action prompts for Vietnamese text
- [ ] Rate limit: 10/min per user

### Frontend TipTap
- [ ] ArticleEditor (StarterKit + Image + Link + CharacterCount)
- [ ] useAutoSave hook (1s debounce)
- [ ] Word count + reading time footer
- [ ] DOMPurify on all AI-returned HTML

### Frontend Bubble Menu
- [ ] AIBubbleMenu (4 buttons + loading state)
- [ ] Text selection + API call + replacement
- [ ] Error toast

### Frontend Steps 2 & 3 UI
- [ ] Outline section list (word count targets per heading)
- [ ] Drag-and-drop section reorder (dnd-kit)
- [ ] Live content streaming via PARTIAL_CONTENT SSE events
- [ ] Step 3 progress bar showing current section

---

## Success Criteria
- POST /step2 returns outline (>= 5 H2 sections) in < 20s
- POST /step3 delivers full article in < 60s
- AI editor action returns result in < 8s (Haiku)
- TipTap saves content within 1s of last keystroke
- Bubble menu appears on text selection, disappears on deselect
- DOMPurify prevents XSS in AI-returned content

---

## Security Considerations
- All AI output sanitized with DOMPurify before TipTap insertion
- AI action rate-limited: 10/min per user (Redis sliding window)
- selectedText input capped at 2000 chars to limit prompt injection
- context capped at 500 chars to control Claude token cost
- CSP header: default-src 'self'; script-src 'self'

---

## Next Steps -> Phase 4
- SEO Checker: 12-item analysis on article HTML content
- Vietnamese Flesch readability in packages/shared/readability.ts
- Real-time SEO score panel in editor sidebar
