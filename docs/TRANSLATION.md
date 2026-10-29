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
