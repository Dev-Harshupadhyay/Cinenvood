require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Frontend routing pipeline
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Securely Initialize Supabase
// Supabase init (env missing ho toh placeholder — PREVIEW_MODE mein kabhi use nahi hota)
const SUPA_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || 'placeholder-key';
const supabase = createClient(SUPA_URL, SUPA_KEY, { realtime: { transport: require('ws') } });

/* ═══════════════════════════════════════════════════════════
   GEMINI AI CONFIG — har movie ka UNIQUE review generate hota hai
   (Render pe GEMINI_API_KEY env var set karo — fallback key hai)
   ═══════════════════════════════════════════════════════════ */
// 🔑 Gemini key SIRF env se (GEMINI_API_KEY) — code mein hardcode mat karna!
// (GitHub pe push hone se Google keys auto-detect karke block kar deta hai)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// 🎬 PREVIEW_MODE (local testing only — Render pe set nahi hota)
// Movies/images live site se proxy, user-reviews in-memory, admin pwd test123
const PREVIEW = process.env.PREVIEW_MODE === '1';
const LIVE = 'https://cinenvood.onrender.com';
const previewReviews = new Map();
let previewIdSeq = 1;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// In-memory cache — same movie dubara kholne par Gemini call nahi hota (quota bachta hai)
const aiReviewCache = new Map();
const AI_CACHE_MAX = 300;

async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.95,
            maxOutputTokens: 800,
            thinkingConfig: { thinkingBudget: 0 }  // thinking tokens budget nahi khaayenge
        }
    };
    const resp = await axios.post(url, body, { timeout: 25000 });
    const cand = resp.data?.candidates?.[0];
    const parts = cand?.content?.parts || [];
    // Sirf non-thought parts lo (safety — kabhi thought part aa jaye toh)
    let text = parts.filter(p => p.text && !p.thought).map(p => p.text).join(' ').trim();
    if (!text) text = parts.map(p => p.text || '').join(' ').trim();
    if (!text) throw new Error('Gemini empty response');
    return text.trim();
}

// TMDB se movie details (Gemini ko context dene ke liye)
async function getMovieDetails(movieId) {
    try {
        if (PREVIEW) {
            const { data } = await axios.get(`${LIVE}/api/movies/movie/${movieId}`, { timeout: 15000 });
            return data;
        }
        const url = `https://api.tmdb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}`;
        const { data } = await axios.get(url, { timeout: 10000 });
        return data;
    } catch (_) { return null; }
}

function buildReviewPrompt(m) {
    const title = m?.title || 'This movie';
    const year = m?.release_date ? m?.release_date.substring(0, 4) : '';
    const rating = m?.vote_average ? m.vote_average.toFixed(1) : 'N/A';
    const genres = (m?.genres || []).map(g => g.name).join(', ') || 'General';
    const runtime = m?.runtime ? `${m.runtime} min` : 'N/A';
    const overview = (m?.overview || '').slice(0, 350);
    const vibes = ['massy', 'classy', 'hatke', 'paisa-vasool', 'timepass', 'gripping', 'wholesome'];
    const vibe = vibes[Math.floor(Math.random() * vibes.length)];

    return `Tu ek desi movie critic hai jo Hinglish mein likhta hai (Hindi + English mix, casual bhai-tone).

Movie details:
- Title: ${title} ${year ? `(${year})` : ''}
- TMDB Rating: ${rating}/10
- Genres: ${genres}
- Runtime: ${runtime}
- Plot: ${overview || 'N/A'}

Ek short review likho (2-3 sentences, max 45 words) jo specifically IS movie ke baare mein ho — plot, genre, vibe ya rating ka reference do. ${vibe} feel rakho. Har baar alag angle se likho taaki reviews repetitive na lage. SPOILERS mat do. Sirf review text return karo — koi heading/quote/asterisk nahi.`;
}

// 🔐 Secure Admin Login Route
app.post('/api/admin/login', (req, res) => {
    if (PREVIEW) {
        if (req.body.password === 'test123') return res.json({ success: true });
        return res.status(401).json({ success: false, error: 'PREVIEW: password test123 hai' });
    }
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Galat password hai bhai!" });
});

// 🎬 EndPoint 1: Fetch from TMDB safely (Using Axios Proxy Mirror for Jio/Airtel Bypass)
app.get('/api/movies/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const queryParams = new URLSearchParams(req.query);
        if (PREVIEW) {
            const live = await axios.get(`${LIVE}/api/movies/${endpoint}?${queryParams.toString()}`, { timeout: 15000 });
            return res.json(live.data);
        }
        queryParams.append('api_key', process.env.TMDB_API_KEY);

        const tmdbUrl = `https://api.tmdb.org/3/${endpoint}?${queryParams.toString()}`;

        const response = await axios.get(tmdbUrl);
        res.json(response.data);
    } catch (err) {
        const status = err.response?.status || 500;
        const tmdbMessage = err.response?.data?.status_message || err.message;
        console.error(`TMDB Mirror Fetch Error [${status}] on /${req.params[0]}:`, tmdbMessage);
        res.status(status).json({ error: "TMDB Fetch Failed", details: tmdbMessage, status });
    }
});

// 🖼️ EndPoint 2: Image Proxy Route (Sirf TMDB images allow — abuse-proof whitelist)
app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("URL parameter missing");

    // Security: sirf TMDB CDN allow karo
    try {
        const parsed = new URL(imageUrl);
        if (!/^image\.tmdb\.org$/.test(parsed.hostname)) {
            return res.status(403).send("Only TMDB images allowed");
        }
    } catch (_) {
        return res.status(400).send("Invalid URL");
    }

    try {
        const fetchUrl = PREVIEW ? `${LIVE}/api/image-proxy?url=${encodeURIComponent(imageUrl)}` : imageUrl;
        const response = await axios.get(fetchUrl, { responseType: 'arraybuffer', timeout: 15000 });
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(response.data));
    } catch (err) {
        console.error("Image Proxy Error:", err.message);
        res.status(500).send("Image fetch failed");
    }
});

/* ═══════════════════════════════════════════════════════════
   EndPoint 3: HYBRID REVIEW — Admin → User (top liked) → Gemini AI
   Har movie ka review ab alag-alag hota hai (Gemini contextual)
   ═══════════════════════════════════════════════════════════ */
app.get('/api/review/:movieId', async (req, res) => {
    const { movieId } = req.params;

    // 1️⃣ Admin review priority mein sabse upar (fail ho toh aage badho)
    try {
        let { data } = await supabase
            .from('custom_reviews')
            .select('admin_review, admin_name')
            .eq('movie_id', movieId.toString())
            .maybeSingle();

        if (data) {
            return res.json({
                source: `👑 EXPERT CHOICE BY ${String(data.admin_name || 'ADMIN').toUpperCase()}`,
                review: data.admin_review,
                custom: true
            });
        }
    } catch (_) { /* supabase down — agla source try karo */ }

    // 2️⃣ Top user review (agar kisi ne like-worthy review likha hai)
    if (PREVIEW) {
        const top = [...previewReviews.values()]
            .filter(r => r.movie_id === movieId.toString() && r.like_count >= 1)
            .sort((a, b) => b.like_count - a.like_count)[0];
        if (top) {
            return res.json({ source: `⭐ TOP FAN REVIEW · ${String(top.user_name).toUpperCase()}`, review: top.review_text, custom: false });
        }
    }
    try {
        let { data: userReviews } = await supabase
            .from('user_reviews')
            .select('user_name, review_text, like_count')
            .eq('movie_id', movieId.toString())
            .order('like_count', { ascending: false })
            .limit(1);

        if (userReviews && userReviews.length && userReviews[0].like_count >= 1) {
            return res.json({
                source: `⭐ TOP FAN REVIEW · ${String(userReviews[0].user_name).toUpperCase()}`,
                review: userReviews[0].review_text,
                custom: false
            });
        }
    } catch (_) { /* user_reviews table abhi bani nahi — skip */ }

    try {

        // 3️⃣ Gemini AI review — movie ke details ke saath, har baar unique
        const cached = aiReviewCache.get(movieId.toString());
        if (cached) {
            return res.json({ source: "🤖 CINE-MOOD AI · GEMINI", review: cached, custom: false });
        }

        const movie = await getMovieDetails(movieId);
        try {
            // Movie details na milein toh bhi Gemini call hota hai (basic prompt)
            const aiReview = await callGemini(buildReviewPrompt(movie));
            if (aiReviewCache.size >= AI_CACHE_MAX) {
                const firstKey = aiReviewCache.keys().next().value;
                aiReviewCache.delete(firstKey);
            }
            aiReviewCache.set(movieId.toString(), aiReview);
            return res.json({ source: "🤖 CINE-MOOD AI · GEMINI", review: aiReview, custom: false });
        } catch (aiErr) {
            console.error('Gemini AI Error:', aiErr.message);
        }

        // 4️⃣ Fallback (Gemini/TMDB fail ho jaye)
        return res.json({
            source: "🤖 CINE-MOOD AI · GEMINI",
            review: `${movie?.title || 'Ye movie'} TMDB pe solid rating laayi hai bhai — trailer dekh ke vibe check karo, maza aayega!`,
            custom: false
        });
    } catch (err) {
        res.status(500).json({ error: "Review Engine Failed" });
    }
});

// EndPoint 4: Securely Save Admin Review
app.post('/api/review/save', async (req, res) => {
    const { password, movieId, movieTitle, reviewText, adminName } = req.body;

    if (PREVIEW && password === 'test123') {
        return res.json({ success: true, preview: true });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Galat password hai bhai!" });
    }

    try {
        const { error } = await supabase
            .from('custom_reviews')
            .upsert({
                movie_id: movieId.toString(),
                movie_title: movieTitle,
                admin_review: reviewText,
                admin_name: adminName || 'Admin',
                updated_at: new Date()
            }, { onConflict: 'movie_id' });

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════════════════
   🆕 USER REVIEWS SYSTEM (Motcale-style — likho + ❤️ like karo)
   Supabase table: user_reviews (SQL README mein hai)
   ═══════════════════════════════════════════════════════════ */

// User reviews list (movie ke saare reviews, like counts ke saath)
app.get('/api/reviews/:movieId', async (req, res) => {
    const { movieId } = req.params;
    if (PREVIEW) {
        const list = [...previewReviews.values()]
            .filter(r => r.movie_id === movieId.toString())
            .sort((a, b) => (b.like_count - a.like_count) || (new Date(b.created_at) - new Date(a.created_at)))
            .slice(0, 50);
        return res.json({ reviews: list });
    }
    try {
        let { data, error } = await supabase
            .from('user_reviews')
            .select('id, user_name, review_text, like_count, created_at')
            .eq('movie_id', movieId.toString())
            .order('like_count', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json({ reviews: data || [] });
    } catch (err) {
        // Table na bani ho to gracefully empty — UI "coming soon" dikhata hai
        res.json({ reviews: [], tableMissing: true });
    }
});

// Nayi user review post karo
app.post('/api/reviews/add', async (req, res) => {
    if (PREVIEW) {
        const { movieId, movieTitle, userName, reviewText } = req.body || {};
        const id = previewIdSeq++;
        previewReviews.set(id, { id, movie_id: String(movieId || ''), movie_title: movieTitle || '', user_name: userName || 'Guest', review_text: reviewText || '', like_count: 0, created_at: new Date().toISOString() });
        return res.json({ success: true, id });
    }
    const { movieId, movieTitle, userName, reviewText } = req.body;

    if (!movieId || !reviewText || !String(reviewText).trim()) {
        return res.status(400).json({ error: "Review text zaroori hai bhai!" });
    }
    if (String(reviewText).length > 500) {
        return res.status(400).json({ error: "Review 500 characters se chhota rakho!" });
    }

    try {
        const { data, error } = await supabase
            .from('user_reviews')
            .insert({
                movie_id: movieId.toString(),
                movie_title: movieTitle || '',
                user_name: (String(userName || '').trim() || 'Guest').slice(0, 30),
                review_text: String(reviewText).trim().slice(0, 500)
            })
            .select('id, user_name, review_text, like_count, created_at')
            .single();

        if (error) throw error;
        res.json({ success: true, review: data });
    } catch (err) {
        res.status(500).json({ error: "Review save nahi ho paaya (table check karo)" });
    }
});

// ❤️ Like toggle — count increment/decrement
app.post('/api/reviews/like', async (req, res) => {
    if (PREVIEW) {
        const { reviewId, delta } = req.body || {};
        const r = previewReviews.get(Number(reviewId));
        if (r) r.like_count = Math.max(0, (r.like_count || 0) + (delta === -1 ? -1 : 1));
        return res.json({ success: true, likeCount: r ? r.like_count : 0 });
    }
    const { reviewId, delta } = req.body;
    if (!reviewId) return res.status(400).json({ error: "reviewId missing" });

    const change = delta === -1 ? -1 : 1;

    try {
        // pehle current count nikaalo phir update (atomic-ish)
        let { data } = await supabase
            .from('user_reviews')
            .select('like_count')
            .eq('id', reviewId)
            .maybeSingle();

        if (!data) return res.status(404).json({ error: "Review not found" });

        const newCount = Math.max(0, (data.like_count || 0) + change);
        const { error } = await supabase
            .from('user_reviews')
            .update({ like_count: newCount })
            .eq('id', reviewId);

        if (error) throw error;
        res.json({ success: true, likeCount: newCount });
    } catch (err) {
        res.status(500).json({ error: "Like update fail" });
    }
});

// 🗑️ Admin: user review delete (password protected)
app.post('/api/reviews/delete', async (req, res) => {
    if (PREVIEW) {
        const { reviewId } = req.body || {};
        previewReviews.delete(Number(reviewId));
        return res.json({ success: true });
    }
    const { password, reviewId } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Galat password hai bhai!" });
    }
    try {
        const { error } = await supabase
            .from('user_reviews')
            .delete()
            .eq('id', reviewId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Delete fail" });
    }
});

// 📊 Admin stats (dashboard redesign ke liye)
app.get('/api/admin/stats', async (req, res) => {
    if (PREVIEW) {
        return res.json({ adminReviews: 0, userReviews: previewReviews.size, aiModel: GEMINI_MODEL + ' (preview)' });
    }
    try {
        const [adminRev, userRev] = await Promise.all([
            supabase.from('custom_reviews').select('movie_id', { count: 'exact', head: true }),
            supabase.from('user_reviews').select('id', { count: 'exact', head: true })
        ]);
        res.json({
            adminReviews: adminRev.count || 0,
            userReviews: userRev.count || 0,
            aiModel: GEMINI_MODEL
        });
    } catch (err) {
        res.json({ adminReviews: 0, userReviews: 0, aiModel: GEMINI_MODEL });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT} 🔥 (Gemini AI: ${GEMINI_MODEL})`);
if (!GEMINI_API_KEY) console.log('⚠️  GEMINI_API_KEY set NAHI hai — AI reviews fallback text pe chalenge. Render dashboard → Environment mein key daalo.');
});
