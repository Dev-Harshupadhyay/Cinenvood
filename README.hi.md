<div align="center">

<img src="./docs/logo.png" alt="CINE·MOOD" width="420" />

### Cinema par community ke verdicts — reviews, not downloads.

</div>

यह एक प्रीमियम फ़िल्म रिव्यू प्लेटफ़ॉर्म है। कोई फ़ाइल, कोई डाउनलोड लिंक, कोई मिरर नहीं — सिर्फ़ TMDB का metadata
और लोगों के रिव्यू। पूरा English documentation **[README.md](./README.md)** में है।

**क्या-क्या मिलता है**

| हिस्सा | क्या है |
| --- | --- |
| खोज | Instant search, genre filter, trending / rating / newest sorting |
| फ़िल्म पेज | Score ring, rating distribution, cast, LIKE + WATCHLIST, review composer |
| रिव्यू | 10 पॉइंट रेटिंग, spoiler blur, likes, comments |
| Admin verdict | ADMIN के रिव्यू का प्रीमियम animated card — PINNED badge, serif headline, signature |
| Dashboard | Stats, my reviews, watchlist, profile |
| Admin panel | Moderation, catalogue, members, TMDB import, pin/unpin |
| भाषा | English · हिंदी · Hinglish switcher header में |
| Login | Google OAuth (+ demo login) — like, comment और review के लिए login ज़रूरी |

**शुरू करने के लिए**

```bash
npm install
npx prisma generate && npx prisma db push
node prisma/seed.mjs
npm run dev          # http://localhost:3000
```

Demo login: `admin@cinemood.app` → ADMIN · कोई भी और email → MEMBER

**ISP block का हल** — TMDB ब्राउज़र से कभी नहीं बुलाया जाता; posters `/api/img` से आते हैं, और ज़रूरत पड़े तो
`TMDB_PROXY_URL` / `TMDB_IMG_PROXY` से Cloudflare Worker relay लग जाता है (README में worker का code है)।

</div>
