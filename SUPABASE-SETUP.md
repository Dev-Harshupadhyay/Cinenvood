# Supabase — DONE ✅

**Project:** `janmyjspktvqdoeatpxo` · region `ap-southeast-1` · schema **`cinemood`**

Aapke purane tables (`admin_review_comments`, `auth.users` etc.) `public` schema mein hain —
CineMood ko **alag schema `cinemood`** mein rakha gaya hai, isliye purana data bilkul untouched hai.

| Table (schema `cinemood`) | Rows |
| --- | --- |
| User | 7 |
| Title | 14 |
| Review | 24 (1 pinned admin verdict) |
| Comment | 24 |
| ReviewLike | 40 |

`.env` (gitignored — repo mein kabhi nahi jayega):

```env
DATABASE_URL="postgresql://postgres.janmyjspktvqdoeatpxo:***@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?schema=cinemood&pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.janmyjspktvqdoeatpxo:***@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=cinemood&sslmode=require"
```

**Vercel env vars** (same values, password bharke):

```
DATABASE_URL   = ...6543/postgres?schema=cinemood&pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL     = ...5432/postgres?schema=cinemood&sslmode=require
AUTH_SECRET, AUTH_TRUST_HOST, NEXT_PUBLIC_SITE_URL, ADMIN_EMAIL
AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, TMDB_API_KEY, OMDB_API_KEY
```

**Security:** screenshot/chat mein password aa gaya hai — Supabase → Database → Reset password se naya password
banao aur mujhe bata do, main `.env` update kar dunga (code mein kahin hardcode nahi hai).

---

# Supabase + Prisma setup (CINE·MOOD)

Supabase = managed Postgres, isliye Prisma ke saath direct chalta hai. **NextAuth ke saath koi conflict nahi**
(auth hamara JWT-based hai, Supabase Auth use nahi kar rahe — sirf database).

---

## 1. Project banao

1. [supabase.com](https://supabase.com) → **New project**
   - Name: `cinemood`
   - Region: **Mumbai (ap-south-1)** ya **Singapore** — Delhi se latency kam rahegi
   - DB password: strong rakho, **note kar lo** (baad mein reset bhi ho sakta hai)
2. Project ready hone ke baad: **Project Settings → Database → Connection string**

---

## 2. Do connection strings chahiye (important)

| Naam | Kahan se | Port | Kis liye |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Connection pooling** → *Transaction* mode | **6543** | App runtime (Vercel serverless) |
| `DIRECT_URL` | **Direct connection** | **5432** | `prisma db push` / migrations / seed |

Pooled URL ke end mein ye add karo:

```
?pgbouncer=true&connection_limit=1&sslmode=require
```

Direct URL ke end mein:

```
?sslmode=require
```

### .env (local + Vercel dono mein same keys)

```env
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

> `<ref>` = project reference id (URL mein `https://<ref>.supabase.co`).
> Password mein `@ # ?` jaise characters ho to URL-encode karo (`@` → `%40`).

---

## 3. Prisma schema badlo (ek hi baar)

`prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // migrations ke liye
}
```

> Abhi demo **SQLite** par chalta hai (zero setup). Supabase use karna hai to upar wali 4 lines.
> Local SQLite rakhna hai aur sirf production Supabase par chahiye? Tab deploy ke waqt ye change karke push karo.

---

## 4. Tables + demo data

```bash
npx prisma generate
npx prisma db push        # schema → Supabase (DIRECT_URL use karega)
node prisma/seed.mjs      # 7 users · 14 films · 24 reviews (Harsh ka pinned verdict bhi)
```

Verify: Supabase → **Table Editor** → `Title`, `Review`, `User` tables dikhni chahiye.

---

## 5. Vercel par

Env vars (Production + Preview dono):

```
DATABASE_URL   = pooled (6543)
DIRECT_URL     = 5432
AUTH_SECRET    = openssl rand -base64 32
AUTH_TRUST_HOST= true
NEXT_PUBLIC_SITE_URL = https://your-app.vercel.app
ADMIN_EMAIL    = harsh@yourdomain.com     # is email se login = ADMIN
AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
TMDB_API_KEY
OMDB_API_KEY   (optional)
```

Build command already: `prisma generate && next build`
→ `db push` Vercel build mein **mat** chalao; ek baar locally (ya `prisma migrate deploy`) chalao.

---

## 6. Free tier — dhyan rakhne wali baatein

| Cheez | Supabase free |
| --- | --- |
| DB size | 500 MB (yeh app ke liye bahut zyada hai — 14 films ~2 MB) |
| Projects | 2 |
| Inactive pause | 7 din koi query na aaye to project **pause** ho jaata hai (dashboard se resume) |
| Connections | Pooler use karo, warna serverless se connection limit khatam |

Production traffic badhe to Supabase ka **Pro ($25/mo)** ya **Neon** (branching, pay-per-use) — dono Prisma ke saath same.

---

## 7. Supabase use karna kab better hai

- Aage **image uploads** chahiye (posters/avatars) → Supabase Storage free 1GB
- **Realtime** comments chahiye → Supabase Realtime
- **Row Level Security** wala admin panel chahiye → Supabase Auth + RLS
- Warna sirf DB ke liye Neon bhi barabar hai (Neon ka cold start thoda better hai)

---

## 8. Mujhe kya bhejna hai (agar main kar dun)

Sirf ye do lines (dashboard → Settings → Database se copy):

```
DATABASE_URL = postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL   = postgresql://...:5432/postgres?sslmode=require
```

Main `.env` mein daal dunga (gitignored hai — repo mein nahi jayega), schema postgres par switch karunga,
`db push` + seed chala dunga. **Anon key / service_role key ki zaroorat nahi** — Prisma direct DB se baat karta hai.
