<div align="center">

# 🎬 <span style="background: linear-gradient(to right, #ff416c, #ff4b2b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">CINE-MOOD AI</span>
### ✨ *The Ultimate Mood-Driven Cinematic Intelligence Platform* ✨

<br>

<table align="center" border="0">
  <tr>
    <td align="center">
      <a href="https://cinenvood.onrender.com/">
        <img src="https://img.shields.io/badge/🚀_LIVE_APP-CINE_MOOD_AI-red?style=for-the-badge&logo=render&logoColor=white" alt="Live Demo" />
      </a>
    </td>
    <td align="center">
      <a href="https://glittery-brisket-528.notion.site/Cine-Mood-Website-Notes-API-DB-1cc259fb6c744e20855c2b47ad8b9ac0">
        <img src="https://img.shields.io/badge/📑_ARCH_DOCS-NOTION_NOTES-blueviolet?style=for-the-badge&logo=notion&logoColor=white" alt="Technical Notes" />
      </a>
    </td>
    <td align="center">
      <a href="https://supabase.com/">
        <img src="https://img.shields.io/badge/⚡_DATABASE-SUPABASE_CLOUD-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
      </a>
    </td>
  </tr>
</table>

<br>

> *A premium, high-end movie analysis panel that curates elite recommendations tailored precisely to your mood and vibe, powered by robust API architecture and real-time cloud sync.*

</div>

---

## 🔥 Key Features

- **⚡ Full-Domain ISP Block Bypass:** Seamlessly resolves TMDB poster loading issues across major networks (Jio, Airtel, and local broadband) using a custom backend engine and mirror image-proxy routing.
- **🎲 Smart Surprise Me (Vibe Control):** Intelligent randomizer that respects your active genre filters (Action, Sci-Fi, Anime, etc.) to spotlight top hits, falling back to the trending collection by default.
- **🧠 Hybrid Review Engine:** Powered by automated intelligent AI reviews, which dynamically switch to hand-picked admin reviews instantly whenever a custom entry is pushed to the database.
- **👑 Premium Admin Dashboard:** Features striking neon animations and real-time controls. Admin-curated reviews shine with bold text formatting and dynamic **Neon Rainbow Glow** graphics on custom card panels.
- **📱 Fully Mobile-Responsive UI:** Crafted with a modern Netflix-Red × Obsidian glassmorphism interface, ensuring seamless layouts and fixed header-footer mapping across mobile and desktop devices.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies & Tools Integration |
| :--- | :--- |
| **Frontend** | <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" /> <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" /> <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" /> *(Custom Glassmorphism & Neon Keyframes)* |
| **Backend** | <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" /> <img src="https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white" /> *(High-Performance API Proxy Routing)* |
| **Database** | <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" /> *(Real-time custom entries & secure state synchronization)* |
| **APIs & Tools** | <img src="https://img.shields.io/badge/TMDB-01B4E4?style=flat-square&logo=themoviedatabase&logoColor=white" /> <img src="https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white" /> |

---

## 🚀 Quick Start / Local Setup

Agar aap is project ko apne local machine par run karna chahte hain, toh in steps ko follow karein:

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/Dev-Harshupadhyay/Cinenwood.git](https://github.com/Dev-Harshupadhyay/Cinenwood.git)
   cd Cinenwood
   ```

---

## 🗄️ Supabase Setup (User Reviews ke liye — EK BAAR)

**Motcale-style user reviews + ❤️ likes** ke liye Supabase dashboard mein ye table banao:

1. [supabase.com](https://supabase.com) → apna project kholo
2. **SQL Editor** → **New query** → neeche wala SQL paste karo → **Run**

```sql
CREATE TABLE IF NOT EXISTS user_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  movie_id text NOT NULL,
  movie_title text,
  user_name text NOT NULL DEFAULT 'Guest',
  review_text text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index: movie ke hisaab se fast lookup
CREATE INDEX IF NOT EXISTS idx_user_reviews_movie ON user_reviews(movie_id);

-- RLS policies (public read/write — server-side creds se use hota hai)
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read user reviews" ON user_reviews
  FOR SELECT USING (true);

CREATE POLICY "Public insert user reviews" ON user_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update likes" ON user_reviews
  FOR UPDATE USING (true) WITH CHECK (true);

-- Admin delete ke liye (ADMIN_PASSWORD server pe check hota hai)
CREATE POLICY "Public delete user reviews" ON user_reviews
  FOR DELETE USING (true);

-- Security: anonymous update sirf like_count column tak limit karo
-- (review_text / user_name koi bhi edit nahi kar sakta)
REVOKE UPDATE ON user_reviews FROM anon, authenticated;
GRANT UPDATE (like_count) ON user_reviews TO anon, authenticated;
```

3. Done! 🎉 Ab har movie ke neeche **USER REVIEWS** section dikhega — review likho, ❤️ like karo.

> **Admin delete** server-side `ADMIN_PASSWORD` se protected hai — koi policy ki zaroorat nahi.

---

## 🎬 Local Preview Mode (bina TMDB/Supabase keys)

```bash
PREVIEW_MODE=1 node server.js
```
- Movies + images **live site se proxy** hongi (TMDB key ki zaroorat nahi)
- **Real Gemini AI reviews** chalenge (unique har movie ke liye)
- User reviews in-memory chalenge (test karne ke liye)
- Admin panel: password **test123**

---
<div align="center">

  <p><b>Connect with the Developer</b></p>
  
  <a href="https://github.com/Dev-Harshupadhyay">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://cinenvood.onrender.com/">
    <img src="https://img.shields.io/badge/Website-FF4B2B?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Website" />
  </a>

  <br><br>
  
  <p style="font-size: 14px; color: #8b949e;">
    Crafted with 🖤 and Code by <b style="color: #ff416c;">Harsh</b>
  </p>
  <p style="font-size: 12px; color: #6e7681;">© 2026 Cine-Mood AI. All Rights Reserved.</p>

</div>
