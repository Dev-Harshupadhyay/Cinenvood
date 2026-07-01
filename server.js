require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Frontend file ko direct load karne ke liye routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Securely Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 🔐 Secure Admin Login Route
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Galat password hai bhai!" });
});

// 🎬 EndPoint 1: Fetch from TMDB safely (Using Proxy Mirror for India/Jio/Airtel Bypass)
app.get('/api/movies/*', async (req, res) => {
    try {
        const endpoint = req.params[0]; 
        const queryParams = new URLSearchParams(req.query);
        queryParams.append('api_key', process.env.TMDB_API_KEY);

        const tmdbUrl = `https://api.tmdb.org/3/${endpoint}?${queryParams.toString()}`;
        
        const response = await fetch(tmdbUrl);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("TMDB Mirror Fetch Error:", err);
        res.status(500).json({ error: "TMDB Fetch Failed" });
    }
});

// 🖼️ EndPoint 2: Image Proxy Route (Bypasses Jio/Airtel Image CDN Block)
app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("URL parameter missing");
    
    try {
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        res.set('Content-Type', 'image/jpeg');
        res.send(Buffer.from(buffer));
    } catch (err) {
        console.error("Image Proxy Error:", err);
        res.status(500).send("Image fetch failed");
    }
});

// EndPoint 3: Check database or fallback to AI review
app.get('/api/review/:movieId', async (req, res) => {
    const { movieId } = req.params;
    try {
        let { data, error } = await supabase
            .from('custom_reviews')
            .select('admin_review, admin_name')
            .eq('movie_id', movieId.toString())
            .single();

        if (data) {
            return res.json({ 
                source: `⭐ EXPERT CHOICE BY ${data.admin_name.toUpperCase()}`, 
                review: data.admin_review, 
                custom: true 
            });
        }

        return res.json({ 
            source: "🤖 CINE-MOOD AI GENERATED", 
            review: "Bhai, yeh movie ekdum zabardast experience hai! Plot point straight to the point hai aur execution ekdum mast kiya hai boss. Ek baar binge watch toh banta hai!",
            custom: false 
        });
    } catch (err) {
        res.status(500).json({ error: "Database Check Failed" });
    }
});

// EndPoint 4: Securely Save Review
app.post('/api/review/save', async (req, res) => {
    const { password, movieId, movieTitle, reviewText, adminName } = req.body;

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running securely on port ${PORT} 🔥`));
