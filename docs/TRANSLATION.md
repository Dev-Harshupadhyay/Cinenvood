# Reviews in two editions — Hinglish ⇄ English

## 1. Who decides which edition a visitor sees

| Priority | Source | Where |
| --- | --- | --- |
| 1 | Explicit choice — cookie `cm-edition=en\|hi` | `components/EditionSwitch.tsx` (the Hinglish / English toggle on the reviews page) |
| 2 | Country — `x-vercel-ip-country` header (free on Vercel) | `lib/edition.ts` → `getEdition()` |
| 3 | Browser language — `Accept-Language` | same |
| 4 | Default | English |

India, Nepal, Bangladesh, Pakistan, Sri Lanka, UAE, Singapore, Malaysia → **Hinglish**.
Everyone else → **English**.

## 2. How the text is chosen

`editionOf(review, edition)` in `lib/edition.ts` picks the column:

| Author wrote | `body` | `bodyEn` | `bodyHi` |
| --- | --- | --- | --- |
| Hinglish / Hindi | the original | English translation | — |
| English | the original | — | Hinglish translation |

* `sourceLang` remembers what the author actually used (`hinglish` / `hindi` / `en`).
* Missing translation → the original is shown, never an empty review. The card / page
  then shows no “EN edition” chip, so nobody is misled about what they are reading.
* When a translation *is* shown, the UI says `EN edition` / `Hinglish edition`
  plus `translated · original in Hinglish`.

## 3. Where the translations come from

1. **Editorial reviews** — hand-written by the site (columns `headlineEn`, `bodyEn`),
   editable in the admin panel (`components/EditorialEditor.tsx`).
2. **Member reviews** — generated automatically at save time by
   `app/api/reviews/route.ts` → `lib/translate.ts` → Gemini
   (`GEMINI_API_KEY`, free tier). Backfill for old reviews:
   ```bash
   node prisma/translate-reviews.mjs          # dry run
   node prisma/translate-reviews.mjs --write  # translate + save
   ```

### Why an LLM and not Google Translate / MyMemory

Hinglish is romanised Hindi mixed with English. Free translate APIs treat the whole
sentence as English and give it back unchanged; transliteration makes it worse.
Tested on the sandbox:

```
"Mujhe decent lagi, but Train to Busan level ki bilkul nahi."
  MyMemory   → unchanged (not translated)
  Lingva     → unchanged
  translit   → "मुझे डेन्ट लगी"  →  "I got a dent"   ← wrong
Gemini       → "It was decent, but nowhere near Train to Busan."  ← correct
```

## 4. Verdict lines

`lib/verdict.ts` keeps both voices — `line` (Hinglish, the site's home voice) and
`lineEn` (English edition). `components/VerdictBlock.tsx` picks one per edition.


---

## 5. Jarvis: grounded movie intelligence and editorial summaries

`/jarvis` uses the existing Gemini integration with retrieval from one published Cinevood title, its catalogue metadata, optional live IMDbio details/reviews, and up to ten published non-spoiler community reviews. Answers cite the source IDs returned by the API. If a fact or review evidence is missing, Jarvis is instructed to say it cannot verify it; it does not use private profile data or hidden/spoiler reviews. This is grounded prompting/retrieval, not model fine-tuning or training.

In the product, **/admin → Editorial → Jarvis review summary** can prepare a bilingual synthesis only when that title has at least one published non-spoiler Cinevood community review. The generated text is a summary of those actual opinions, not a fabricated first-person review. An admin must verify and explicitly publish it. The command-line helper follows the same evidence requirement and creates a new editorial record rather than overwriting an existing review.

```bash
node prisma/ghostwrite.mjs --title colony-2026
node prisma/ghostwrite.mjs --title colony-2026 --notes "summarize the pacing opinions"
node prisma/ghostwrite.mjs --title colony-2026 --save
```

The Q&amp;A endpoint is `POST /api/jarvis`, rate-limited per client IP. Gemini requires the server-only `GEMINI_API_KEY`; without it the feature reports that it is unavailable rather than returning fabricated answers.

The **Review in my style** mode searches IMDbio directly for a title, displays its poster and cast, and creates an editable draft using the signed-in user’s own published non-spoiler reviews as voice references plus the user’s notes. It never writes a review from other users’ opinions, changes the user’s rating, or auto-publishes. The user must explicitly consent before their notes, selected IMDbio title data, and up to five of their own reviews (or their own pasted style sample) are sent to Gemini. The key remains server-side. Sign-in is required; no own reviews means the user can paste a writing sample they authored. This is per-request prompting, not model fine-tuning.

The public **cached Jarvis review** flow is separate: the title detail page renders an existing saved review immediately; when none exists, the visitor clicks **Generate Jarvis Review**, which calls `POST /api/jarvis/auto-review`. The server builds one bilingual Hinglish/English AI editorial review from IMDbio title facts and any available public non-spoiler review evidence, using up to five of the owner’s published non-spoiler reviews only for high-level style. It persists one result per title in the existing `Review` fields as a published `Jarvis` editorial record; later visitors receive that cached record. An existing owner or editorial review remains untouched; Jarvis is saved as a separate editorial record alongside it. Admin editorial publishing can create additional editorial entries without overwriting the earlier one. No Prisma schema change is needed, and Jarvis's editorial rating is excluded from community scores and counts. The review is clearly labeled AI-generated and does not claim the owner personally watched the title. Generation is rate-limited and requires `GEMINI_API_KEY`, configured IMDbio, and owner style samples; absent prerequisites fail closed rather than fabricating a review.
