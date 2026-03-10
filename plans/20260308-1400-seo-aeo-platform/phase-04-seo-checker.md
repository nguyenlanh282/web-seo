# Phase 04 - SEO Checker (12 Items) + Readability
> Week 7 | Priority: P0 | Status: Pending

## Context Links
- Previous phase: [phase-03-editor-steps-2-3.md](./phase-03-editor-steps-2-3.md)
- Next phase: [phase-05-export-wordpress.md](./phase-05-export-wordpress.md)
- Shared readability: `packages/shared/src/readability.ts`

---

## Overview
Step 4 is the only SYNCHRONOUS step (< 1s). It analyses the article HTML
against 12 weighted SEO checks, computes a total score (0-100), and stores
the per-item results in ChecklistItem rows. The readability formula is
implemented in packages/shared so it runs identically on frontend (live
preview) and backend (authoritative scoring).

**State transition**: CONTENT_WRITTEN -> SEO_CHECKED
**Target latency**: < 1 second (local computation, no AI)

---

## Key Insights
- Parse article HTML with cheerio (server) and the DOM (browser).
- Readability score uses a Vietnamese-adapted Flesch formula (see formula).
- The SEO check is idempotent - re-running replaces all ChecklistItem rows.
- Display live score in editor sidebar as user edits (debounced 2s).
- Scores below 70 show suggestions; Claude Haiku generates the suggestion text.
- Each check returns { score: number (0-weight), passed: boolean, hint: string }.

---

## Requirements
- [ ] SeoCheckerService with 12 check functions
- [ ] Vietnamese Flesch readability in packages/shared/readability.ts
- [ ] ChecklistItem rows stored per article
- [ ] Article.seoScore updated after run
- [ ] POST /articles/:id/step4 (sync, < 1s)
- [ ] GET /articles/:id/checklist returns all 12 items
- [ ] Frontend: SEO score panel in editor sidebar
- [ ] Frontend: live score recalculation on debounced content change
- [ ] Claude Haiku improvement hints for failed items (optional, async)

---

## SEO Checklist (12 Items, Total Weight = 100)

| Check | Key | Weight | Pass Condition |
|---|---|---|---|
| 1 | HEADLINE_KEYWORD | 12 | Primary keyword in H1 title |
| 2 | META_DESCRIPTION | 10 | 120-160 chars, contains keyword |
| 3 | HEADING_STRUCTURE | 12 | H1=1, H2>=2, H3 after H2, no skipped levels |
| 4 | IMAGE_ALT | 6 | >= 80% images have non-empty alt text |
| 5 | IMAGE_FILENAME | 4 | >= 50% image filenames are descriptive (not img001) |
| 6 | KEYWORD_COVERAGE | 15 | Keyword density 0.5-2.5%, LSI keywords present |
| 7 | TAGS | 4 | At least 3 tags assigned to article |
| 8 | INTERNAL_EXTERNAL_LINKS | 12 | >= 2 internal + >= 1 external link |
| 9 | ANCHOR_TEXT | 5 | < 30% links use generic text (click here, xem them) |
| 10 | CONTENT_LENGTH | 5 | Word count >= 800 |
| 11 | READABILITY | 10 | Flesch-VI score >= 50 (medium readability) |
| 12 | CONTENT_GAP_COVERAGE | 5 | >= 60% content gaps from Step 1 addressed |

---

## Architecture

### SeoCheckerService (apps/api/src/seo/seo-checker.service.ts)
```typescript
@Injectable()
export class SeoCheckerService {
  async check(article: ArticleWithRelations): Promise<ChecklistResult[]> {
    const $ = cheerio.load(article.content ?? '');
    const keywords = article.keywords.map(k => k.keyword.term);
    const primaryKw = keywords[0] ?? '';
    const wordCount = this.countWords($.text());

    const checks: ChecklistResult[] = [
      this.checkHeadlineKeyword($, primaryKw),
      this.checkMetaDescription(article.metaDesc, primaryKw),
      this.checkHeadingStructure($),
      this.checkImageAlt($),
      this.checkImageFilename($),
      this.checkKeywordCoverage($.text(), keywords),
      this.checkTags(article),
      this.checkLinks($, article.project.domain),
      this.checkAnchorText($),
      this.checkContentLength(wordCount),
      this.checkReadability($.text()),
      this.checkContentGapCoverage(article),
    ];

    return checks;
  }

  private checkHeadlineKeyword($: CheerioAPI, kw: string): ChecklistResult {
    const h1 = $('h1').first().text().toLowerCase();
    const passed = h1.includes(kw.toLowerCase());
    return {
      key: 'HEADLINE_KEYWORD',
      weight: SEO_WEIGHTS.HEADLINE_KEYWORD,
      score: passed ? SEO_WEIGHTS.HEADLINE_KEYWORD : 0,
      passed,
      hint: passed ? '' : `Add "${kw}" to your H1 title.`,
    };
  }

  private checkReadability(text: string): ChecklistResult {
    const { score } = computeReadabilityVI(text);
    const normalised = Math.min(100, Math.max(0, score));
    const passed = score >= 50;
    return {
      key: 'READABILITY',
      weight: SEO_WEIGHTS.READABILITY,
      score: passed ? SEO_WEIGHTS.READABILITY : Math.round(SEO_WEIGHTS.READABILITY * normalised / 100),
      passed,
      hint: passed ? '' : 'Shorten sentences and use simpler words to improve readability.',
    };
  }
}
```

### Vietnamese Flesch Readability Formula (packages/shared/src/readability.ts)
```typescript
/**
 * Vietnamese-adapted Flesch Reading Ease
 * Standard Flesch: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
 * Vietnamese adaptation: syllable count is approx words * 1.4 (avg syllables/word VI)
 * Simplified: use sentence length penalty instead of syllable count.
 *
 * Score interpretation:
 *   >= 70  : Easy (Tuoi Nho, Wikipedia simple)
 *   50-69  : Medium (General audience)
 *   30-49  : Hard (Academic)
 *   < 30   : Very Hard (Technical/Legal)
 */
export function computeReadabilityVI(text: string): ReadabilityResult {
  const sentences = text.split(/[.!?;]+/).filter(s => s.trim().length > 3);
  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (sentences.length === 0 || words.length === 0)
    return { score: 0, avgWordsPerSentence: 0, wordCount: 0 };

  const avgWordsPerSentence = words.length / sentences.length;
  // Vietnamese syllable approximation (each space-separated token ~ 1 syllable)
  const avgSyllablesPerWord = 1.3; // Vietnamese words are often monosyllabic compounds
  const score = 206.835
    - 1.015 * avgWordsPerSentence
    - 84.6  * avgSyllablesPerWord;

  return {
    score: Math.round(score),
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    wordCount: words.length,
  };
}

export interface ReadabilityResult {
  score:                number;
  avgWordsPerSentence:  number;
  wordCount:            number;
}
```

### ChecklistItem Prisma Model
```prisma
model ChecklistItem {
  id        String  @id @default(cuid())
  articleId String
  key       String  // SEO_WEIGHTS key name
  weight    Int
  score     Int
  passed    Boolean
  hint      String?
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([articleId, key])
}
```

### Step 4 Controller
```typescript
@Post(':id/step4')
@UseGuards(JwtAuthGuard)
async runSeoCheck(
  @Param('id') id: string,
  @GetUser() user: User,
): Promise<SeoCheckResult> {
  await this.articlesService.assertOwnership(id, user.id);
  const article = await this.articlesService.findOneWithRelations(id);
  const items = await this.seoChecker.check(article);

  // Upsert all 12 items
  await prisma.$transaction(
    items.map(item => prisma.checklistItem.upsert({
      where: { articleId_key: { articleId: id, key: item.key } },
      create: { articleId: id, ...item },
      update: { score: item.score, passed: item.passed, hint: item.hint },
    }))
  );

  const totalScore = items.reduce((sum, i) => sum + i.score, 0);
  await prisma.article.update({ where: { id }, data: { seoScore: totalScore } });
  await this.articlesService.transition(id, ArticleState.SEO_CHECKED);

  return { score: totalScore, items };
}
```

### Frontend - Live SEO Sidebar
```typescript
// hooks/useLiveSeoScore.ts
export function useLiveSeoScore(editor: Editor | null, article: Article) {
  const [score, setScore] = useState(article.seoScore ?? 0);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  const recalculate = useDebouncedCallback(async (html: string) => {
    // Client-side partial check (readability + word count only)
    const text = new DOMParser().parseFromString(html, 'text/html').body.innerText;
    const { score: readability } = computeReadabilityVI(text);
    const wordCount = text.split(/\s+/).length;
    // Update only the two client-side computable items locally
    setItems(prev => prev.map(item => {
      if (item.key === 'READABILITY')
        return { ...item, passed: readability >= 50, score: readability >= 50 ? item.weight : 0 };
      if (item.key === 'CONTENT_LENGTH')
        return { ...item, passed: wordCount >= 800, score: wordCount >= 800 ? item.weight : 0 };
      return item;
    }));
  }, 2000);

  useEffect(() => {
    if (!editor) return;
    editor.on('update', () => recalculate(editor.getHTML()));
  }, [editor]);

  return { score, items };
}
```

### SEO Score Panel Component
```typescript
// components/editor/SeoScorePanel.tsx
export function SeoScorePanel({ items, totalScore }: Props) {
  const color = totalScore >= 80 ? 'green' : totalScore >= 60 ? 'yellow' : 'red';

  return (
    <aside className="w-80 border-l p-4 overflow-y-auto">
      <div className="text-center mb-6">
        <div className={`text-5xl font-bold text-${color}-500`}>{totalScore}</div>
        <div className="text-sm text-muted-foreground">SEO Score / 100</div>
        <Progress value={totalScore} className="mt-2" />
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <ChecklistRow key={item.key} item={item} />
        ))}
      </div>
    </aside>
  );
}
```
---

## Related Code Files
- `packages/shared/src/readability.ts`
- `apps/api/src/seo/seo-checker.service.ts`
- `apps/api/src/articles/articles.controller.ts` (step4 endpoint)
- `apps/web/components/editor/SeoScorePanel.tsx`
- `apps/web/hooks/useLiveSeoScore.ts`

---

## Implementation Steps

### Step 1 - Shared Readability Package (Day 1)
1. Write `computeReadabilityVI()` in `packages/shared/src/readability.ts`.
2. Add unit tests: easy Vietnamese text (score >= 70), hard text (< 50).
3. Export from `packages/shared/src/index.ts`.
4. Verify it works in both NestJS (CJS) and Next.js (ESM) builds.

### Step 2 - SeoCheckerService (Day 1-2)
1. `pnpm add cheerio` in apps/api.
2. Implement all 12 check functions in SeoCheckerService.
3. ChecklistResult type with key, weight, score, passed, hint fields.
4. Unit test each check function with sample HTML fixtures.

### Step 3 - Step 4 API Endpoint (Day 2)
1. POST /articles/:id/step4 (sync, guarded by JwtAuthGuard).
2. Upsert 12 ChecklistItem rows in a Prisma transaction.
3. Update Article.seoScore with total.
4. Transition article to SEO_CHECKED state.

### Step 4 - Frontend SEO Panel (Day 3-4)
1. SeoScorePanel component with circular score display.
2. ChecklistRow: icon (pass/fail), label, score/weight, hint.
3. Collapsible hint with suggested fix text.
4. useLiveSeoScore hook: debounced 2s client-side recalculation.

### Step 5 - Claude Haiku Hints (Day 4-5, optional)
1. POST /articles/:id/seo-hints - async Haiku call for failed items.
2. Returns actionable Vietnamese improvement tips per failed check.
3. Display in checklist panel expand area.

---

## Todo List

### Shared Package
- [ ] `computeReadabilityVI()` in packages/shared/src/readability.ts
- [ ] Unit tests: easy/medium/hard Vietnamese text samples
- [ ] Export from packages/shared index

### Backend
- [ ] ChecklistItem Prisma model + migration
- [ ] SeoCheckerService with all 12 check methods
- [ ] Unit tests for each check (HTML fixtures)
- [ ] POST /articles/:id/step4 (sync, < 1s)
- [ ] Prisma transaction upsert for 12 items
- [ ] Article.seoScore update
- [ ] Article state transition to SEO_CHECKED

### Frontend
- [ ] SeoScorePanel component (circular score, item list)
- [ ] ChecklistRow (pass/fail icon, score/weight, hint)
- [ ] useLiveSeoScore hook (debounced 2s)
- [ ] Client-side readability + word count recalculation
- [ ] GET /articles/:id/checklist on page load
- [ ] Run Step 4 button in editor toolbar
- [ ] Score colour: green (>=80), yellow (>=60), red (<60)

---

## Success Criteria
- POST /step4 returns 12 items with total score in < 1s
- computeReadabilityVI() returns the same result in browser and server
- SEO score panel updates within 2s of typing
- All 12 ChecklistItem rows stored in DB after step4 runs
- Score 0-100 with correct weights summing to 100

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cheerio HTML parse differences vs browser | Low | Medium | Normalise HTML before passing to checker |
| Vietnamese syllable count approximation | Medium | Low | Tune multiplier with sample corpus; good-enough |
| Slow regex on large articles | Low | Medium | Set max content length 50k chars; strip HTML first |

---

## Security Considerations
- SeoCheckerService only reads content; no external calls
- No user input flows into cheerio directly (content from DB)
- packages/shared readability function is pure (no I/O)

---

## Next Steps -> Phase 5
- HTML export with styled template
- WordPress REST API integration
- AES-256-GCM encryption for WP credentials
- Internal link suggestion engine
