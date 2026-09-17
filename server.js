require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.set('trust proxy', 1); // Render/proxy ke peeche correct client IP for admin rate limiting
app.use(cors());
app.use(express.json());

// Frontend routing pipeline
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/', (req, res) => {
    const built = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(require('fs').existsSync(built) ? built : path.join(__dirname, 'index.html'));
});

// Securely Initialize Supabase
// Supabase init (env missing ho toh placeholder — PREVIEW_MODE mein kabhi use nahi hota)
const SUPA_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY || 'placeholder-key';
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false }, realtime: { transport: require('ws') } });
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || SUPA_KEY;
const supabaseAdmin = createClient(SUPA_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

app.get('/api/config', (_req, res) => res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY || ''
}));

async function viewer(req, required = true) {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) { if (required) throw Object.assign(new Error('Google login required'), { status: 401 }); return null; }
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw Object.assign(new Error('Session expired'), { status: 401 });
    if (required && data.user.is_anonymous) throw Object.assign(new Error('Google login required'), { status: 403 });
    return data.user;
}
const authError = (res, e) => res.status(e.status || 500).json({ error: e.message || 'Request failed' });

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

// 🔐 Signed, HTTP-only admin session (password browser storage mein nahi rehta)
const adminAttempts = new Map();
const adminSecret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'preview-only-secret';
function signAdminToken() {
    const payload = Buffer.from(JSON.stringify({ role:'admin', exp:Date.now()+8*60*60*1000 })).toString('base64url');
    const sig = crypto.createHmac('sha256', adminSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}
function isAdminRequest(req) {
    try { const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('cine_admin='))?.slice(11); if(!raw)return false; const [payload,sig]=raw.split('.'); const expected=crypto.createHmac('sha256',adminSecret()).update(payload).digest('base64url'); if(!sig||sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false; const data=JSON.parse(Buffer.from(payload,'base64url')); return data.role==='admin'&&data.exp>Date.now(); } catch{return false}
}
function requireAdmin(req,res,next){ if(!isAdminRequest(req))return res.status(401).json({error:'Admin login required'}); next(); }
app.post('/api/admin/login', (req, res) => {
    const ip=req.ip; const state=adminAttempts.get(ip)||{count:0,until:0}; if(state.until>Date.now())return res.status(429).json({error:'Too many attempts. 15 minutes baad try karo.'});
    const valid=PREVIEW ? req.body.password==='test123' : !!process.env.ADMIN_PASSWORD && req.body.password===process.env.ADMIN_PASSWORD;
    if(!valid){state.count++;if(state.count>=5){state.until=Date.now()+15*60*1000;state.count=0}adminAttempts.set(ip,state);return res.status(401).json({error:'Incorrect admin password'});}
    adminAttempts.delete(ip);res.setHeader('Set-Cookie',`cine_admin=${signAdminToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);res.json({success:true});
});
app.get('/api/admin/session',(req,res)=>res.json({authenticated:isAdminRequest(req)}));
app.post('/api/admin/logout',(req,res)=>{res.setHeader('Set-Cookie','cine_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');res.json({success:true})});

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
    try { await viewer(req); } catch (e) { return authError(res, e); }
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
    try { await viewer(req); } catch (e) { return authError(res, e); }
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



/* Authenticated user reviews: guests read; only Google users can write/like. */
app.get('/api/user-reviews/:movieId', async (req, res) => {
    try {
        const user = await viewer(req, false).catch(() => null);
        const { data: reviews, error } = await supabaseAdmin.from('user_reviews').select('id,user_id,user_name,review_text,like_count,created_at').eq('movie_id', String(req.params.movieId)).order('created_at', { ascending:false }).limit(50);
        if (error) throw error;
        const ids=(reviews||[]).map(r=>r.id), uids=[...new Set((reviews||[]).map(r=>r.user_id).filter(Boolean))];
        const [{data:likes},{data:profiles}]=await Promise.all([
            ids.length?supabaseAdmin.from('user_review_likes').select('review_id,user_id').in('review_id',ids):{data:[]},
            uids.length?supabaseAdmin.from('profiles').select('id,display_name,avatar_url').in('id',uids):{data:[]}
        ]);
        const pm=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
        const rows=(reviews||[]).map(r=>({...r,user_name:pm[r.user_id]?.display_name||r.user_name||'Movie fan',avatar_url:pm[r.user_id]?.avatar_url||null,like_count:(r.like_count||0)+(likes||[]).filter(x=>x.review_id===r.id).length,viewer_liked:!!user&&(likes||[]).some(x=>x.review_id===r.id&&x.user_id===user.id)})).sort((a,b)=>b.like_count-a.like_count||new Date(b.created_at)-new Date(a.created_at));
        res.json({reviews:rows});
    } catch(e){authError(res,e)}
});
app.post('/api/user-reviews', async (req,res)=>{
    try{const user=await viewer(req);if(user.is_anonymous)return res.status(403).json({error:'Google login required'});const text=String(req.body?.text||'').trim();if(!text||text.length>500)return res.status(400).json({error:'Review 1–500 characters ka hona chahiye'});const {data:profile}=await supabaseAdmin.from('profiles').select('display_name').eq('id',user.id).maybeSingle();const {error}=await supabaseAdmin.from('user_reviews').insert({movie_id:String(req.body.movieId),movie_title:String(req.body.movieTitle||''),user_id:user.id,user_name:profile?.display_name||user.user_metadata?.full_name||'Movie fan',review_text:text,like_count:0});if(error)throw error;res.json({success:true})}catch(e){authError(res,e)}
});
app.post('/api/user-reviews/:reviewId/like',async(req,res)=>{
    try{const user=await viewer(req);if(user.is_anonymous)return res.status(403).json({error:'Google login required'});const id=Number(req.params.reviewId);const {data:old}=await supabaseAdmin.from('user_review_likes').select('user_id').eq('review_id',id).eq('user_id',user.id).maybeSingle();const q=old?supabaseAdmin.from('user_review_likes').delete().eq('review_id',id).eq('user_id',user.id):supabaseAdmin.from('user_review_likes').insert({review_id:id,user_id:user.id});const {error}=await q;if(error)throw error;res.json({success:true,liked:!old})}catch(e){authError(res,e)}
});

/* Premium Scapegoat verdict community: persistent likes + threaded-ready comments */
app.get('/api/admin-reviews/:movieId/community', async (req, res) => {
    try {
        const user = await viewer(req, false).catch(() => null);
        const { data: review, error } = await supabaseAdmin.from('admin_reviews').select('*').eq('movie_id', String(req.params.movieId)).eq('published', true).maybeSingle();
        if (error) throw error;
        if (!review) return res.json({ review: null, likeCount: 0, viewerLiked: false, comments: [] });
        const [{ count: likeCount }, { data: comments }] = await Promise.all([
            supabaseAdmin.from('admin_review_likes').select('*', { count: 'exact', head: true }).eq('admin_review_id', review.id),
            supabaseAdmin.from('admin_review_comments').select('id,user_id,parent_comment_id,comment_text,is_pinned,created_at').eq('admin_review_id', review.id).eq('is_hidden', false).limit(100)
        ]);
        const ids = [...new Set((comments || []).map(c => c.user_id))];
        const commentIds = (comments || []).map(c => c.id);
        const [{ data: profiles }, { data: clikes }, likedReview] = await Promise.all([
            ids.length ? supabaseAdmin.from('profiles').select('id,display_name,avatar_url,is_guest').in('id', ids) : { data: [] },
            commentIds.length ? supabaseAdmin.from('comment_likes').select('comment_id,user_id').in('comment_id', commentIds) : { data: [] },
            user ? supabaseAdmin.from('admin_review_likes').select('user_id').eq('admin_review_id', review.id).eq('user_id', user.id).maybeSingle() : { data: null }
        ]);
        const pm = Object.fromEntries((profiles || []).map(p => [p.id, p]));
        const rows = (comments || []).map(c => ({ ...c, ...(pm[c.user_id] || { display_name:'Guest', is_guest:true }), like_count:(clikes||[]).filter(l=>l.comment_id===c.id).length, viewer_liked:!!user && (clikes||[]).some(l=>l.comment_id===c.id&&l.user_id===user.id) }));
        rows.sort(req.query.sort === 'new' ? (a,b)=>new Date(b.created_at)-new Date(a.created_at) : (a,b)=>(b.is_pinned-a.is_pinned)||(b.like_count-a.like_count)||(new Date(b.created_at)-new Date(a.created_at)));
        res.json({ review, likeCount: likeCount || 0, viewerLiked: !!likedReview.data, comments: rows });
    } catch (e) { authError(res, e); }
});

app.post('/api/admin-reviews/:reviewId/like', async (req, res) => {
    try { const user = await viewer(req); const reviewId = Number(req.params.reviewId);
        const { data: old } = await supabaseAdmin.from('admin_review_likes').select('user_id').eq('admin_review_id', reviewId).eq('user_id', user.id).maybeSingle();
        const q = old ? supabaseAdmin.from('admin_review_likes').delete().eq('admin_review_id', reviewId).eq('user_id', user.id) : supabaseAdmin.from('admin_review_likes').insert({ admin_review_id: reviewId, user_id: user.id });
        const { error } = await q; if (error) throw error; res.json({ success:true, liked:!old });
    } catch(e){ authError(res,e); }
});

app.post('/api/admin-reviews/:reviewId/comments', async (req, res) => {
    try { const user=await viewer(req); const text=String(req.body?.text||'').trim(); if(!text||text.length>500) return res.status(400).json({error:'Comment 1–500 characters ka hona chahiye'});
        const since = new Date(Date.now()-15000).toISOString(); const { count } = await supabaseAdmin.from('admin_review_comments').select('*',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',since); if(count) return res.status(429).json({error:'15 seconds baad next comment post karo'});
        const { data,error }=await supabaseAdmin.from('admin_review_comments').insert({admin_review_id:Number(req.params.reviewId),user_id:user.id,comment_text:text,parent_comment_id:req.body?.parentId||null}).select().single(); if(error)throw error;res.json({success:true,comment:data});
    } catch(e){authError(res,e)}
});

app.post('/api/comments/:commentId/like', async (req,res)=>{
    try{const user=await viewer(req);const id=Number(req.params.commentId);const {data:old}=await supabaseAdmin.from('comment_likes').select('user_id').eq('comment_id',id).eq('user_id',user.id).maybeSingle();const q=old?supabaseAdmin.from('comment_likes').delete().eq('comment_id',id).eq('user_id',user.id):supabaseAdmin.from('comment_likes').insert({comment_id:id,user_id:user.id});const {error}=await q;if(error)throw error;res.json({success:true,liked:!old})}catch(e){authError(res,e)}
});


function parseExpertFields(text='') {
  const rating=String(text).match(/My Rating\s*✨?\s*:\s*([\d.]+)\s*\/\s*10/i);
  const platform=String(text).match(/📺\s*Platform\s*:\s*(.+)/i);
  const guidance=String(text).match(/⚠️\s*Parental Guidance\s*:\s*(.+)/i);
  const n=rating?Math.min(10,Math.max(0,Number(rating[1]))):null;
  return {rating:n,platform:platform?.[1]?.trim()||null,parental_guidance:guidance?.[1]?.trim()||null,verdict:n==null?null:n>=8.5?'MUST WATCH':n>=7?'WORTH WATCHING':n>=5?'ONE-TIME WATCH':'SKIP IT'};
}
app.post('/api/admin/reviews/save', requireAdmin, async(req,res)=>{
  try{const movieId=String(req.body?.movieId||'').trim(),movieTitle=String(req.body?.movieTitle||'').trim(),reviewText=String(req.body?.reviewText||'').trim(),adminName=String(req.body?.adminName||'Scapegoat').trim().slice(0,50)||'Scapegoat';if(!movieId||!movieTitle||!reviewText)return res.status(400).json({error:'Movie ID, title aur review required hain'});if(reviewText.length>12000)return res.status(400).json({error:'Review maximum 12,000 characters ka ho sakta hai'});const fields=parseExpertFields(reviewText);const {data,error}=await supabaseAdmin.from('admin_reviews').upsert({movie_id:movieId,movie_title:movieTitle,admin_name:adminName,review_text:reviewText,...fields,published:true,updated_at:new Date().toISOString()},{onConflict:'movie_id'}).select().single();if(error)throw error;await supabaseAdmin.from('custom_reviews').upsert({movie_id:movieId,movie_title:movieTitle,admin_name:adminName,admin_review:reviewText,updated_at:new Date().toISOString()},{onConflict:'movie_id'});res.json({success:true,review:data})}catch(e){console.error('Admin review save:',e.message);res.status(500).json({error:'Review save nahi hua: '+e.message})}
});

// Privacy-first event collection. Browser ID is salted+hashed before storage.
app.post('/api/analytics/event', async (req,res)=>{
    try{const visitorId=String(req.body?.visitorId||'').slice(0,100), type=String(req.body?.type||'visit');if(!visitorId||!['visit','movie_open','search','google_login'].includes(type))return res.status(400).json({error:'Invalid event'});const hash=crypto.createHash('sha256').update(visitorId+(process.env.ANALYTICS_SALT||adminSecret())).digest('hex');if(type==='visit'){const day=new Date();day.setUTCHours(0,0,0,0);const {count}=await supabaseAdmin.from('analytics_events').select('*',{count:'exact',head:true}).eq('visitor_hash',hash).eq('event_type','visit').gte('created_at',day.toISOString());if(count)return res.json({success:true,deduplicated:true})}let ref='';try{ref=new URL(String(req.body.referrer||'')).hostname}catch{}const {error}=await supabaseAdmin.from('analytics_events').insert({visitor_hash:hash,session_id:String(req.body.sessionId||'').slice(0,80),event_type:type,movie_id:req.body.movieId?String(req.body.movieId):null,path:String(req.body.path||'').slice(0,180),referrer_host:ref.slice(0,120)});if(error)throw error;res.json({success:true})}catch(e){res.status(500).json({error:'Analytics unavailable'})}
});

app.get('/api/admin/analytics', requireAdmin, async (req,res)=>{
  try{const days=Math.min(30,Math.max(7,Number(req.query.days)||7)),since=new Date(Date.now()-(days-1)*86400000);since.setUTCHours(0,0,0,0);
    const [eventsQ,userRevQ,commentsQ,adminLikesQ,userLikesQ,adminReviewsQ,usersQ]=await Promise.all([
      supabaseAdmin.from('analytics_events').select('visitor_hash,event_type,movie_id,created_at').gte('created_at',since.toISOString()).limit(10000),
      supabaseAdmin.from('user_reviews').select('id,user_name,review_text,movie_title,created_at').gte('created_at',since.toISOString()).order('created_at',{ascending:false}).limit(200),
      supabaseAdmin.from('admin_review_comments').select('id,comment_text,created_at,admin_review_id').gte('created_at',since.toISOString()).order('created_at',{ascending:false}).limit(200),
      supabaseAdmin.from('admin_review_likes').select('admin_review_id,created_at').gte('created_at',since.toISOString()).limit(5000),
      supabaseAdmin.from('user_review_likes').select('review_id,created_at').gte('created_at',since.toISOString()).limit(5000),
      supabaseAdmin.from('admin_reviews').select('id,movie_id,movie_title,admin_name,updated_at').eq('published',true),
      supabaseAdmin.auth.admin.listUsers({page:1,perPage:1000})
    ]);
    for(const q of [eventsQ,userRevQ,commentsQ,adminLikesQ,userLikesQ,adminReviewsQ])if(q.error)throw q.error;
    const events=eventsQ.data||[], reviews=userRevQ.data||[], comments=commentsQ.data||[], adminLikes=adminLikesQ.data||[],userLikes=userLikesQ.data||[],ars=adminReviewsQ.data||[];
    const daily=[];for(let i=0;i<days;i++){const d=new Date(since.getTime()+i*86400000),key=d.toISOString().slice(0,10),de=events.filter(x=>x.created_at.slice(0,10)===key);daily.push({date:key,label:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}),visitors:new Set(de.filter(x=>x.event_type==='visit').map(x=>x.visitor_hash)).size,views:de.length,reviews:reviews.filter(x=>x.created_at.slice(0,10)===key).length,comments:comments.filter(x=>x.created_at.slice(0,10)===key).length})}
    const topMovies=ars.map(a=>({id:a.id,title:a.movie_title||`Movie ${a.movie_id}`,likes:adminLikes.filter(x=>x.admin_review_id===a.id).length,comments:comments.filter(x=>x.admin_review_id===a.id).length})).sort((a,b)=>(b.likes+b.comments)-(a.likes+a.comments)).slice(0,5);
    const recent=[...reviews.map(x=>({type:'review',title:x.user_name||'Viewer',text:x.review_text,movie:x.movie_title,at:x.created_at})),...comments.map(x=>({type:'comment',title:'Viewer comment',text:x.comment_text,movie:ars.find(a=>a.id===x.admin_review_id)?.movie_title||'',at:x.created_at}))].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,8);
    res.json({range:days,summary:{visitors:new Set(events.filter(x=>x.event_type==='visit').map(x=>x.visitor_hash)).size,views:events.length,reviews:reviews.length,comments:comments.length,likes:adminLikes.length+userLikes.length,users:usersQ.data?.users?.length||0,adminReviews:ars.length},daily,topMovies,recent});
  }catch(e){console.error('Analytics dashboard:',e.message);res.status(500).json({error:'Dashboard data load failed'})}
});

// 📊 Admin stats (dashboard redesign ke liye)
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
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
