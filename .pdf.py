# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Image, Table, TableStyle, PageBreak, KeepTogether, Flowable, NextPageTemplate)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

R='/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('DJ', R+'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DJB', R+'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DJM', R+'DejaVuSansMono.ttf'))

INK   = colors.HexColor('#0B0F0E')
ACC   = colors.HexColor('#12B76A')
ACC2  = colors.HexColor('#0E7C4A')
MUT   = colors.HexColor('#5A6663')
LINE  = colors.HexColor('#DCE4E1')
SOFT  = colors.HexColor('#F4F8F6')
GOLD  = colors.HexColor('#B98900')
RED   = colors.HexColor('#C0392B')

W, H = A4
M = 18*mm
CW = W - 2*M

def st(name, **kw):
    base = dict(fontName='DJ', fontSize=9.6, leading=15, textColor=INK, alignment=TA_LEFT, spaceAfter=0)
    base.update(kw)
    return ParagraphStyle(name, **base)

H1    = st('h1', fontName='DJB', fontSize=21, leading=26, spaceAfter=6)
H2    = st('h2', fontName='DJB', fontSize=12.5, leading=17, spaceAfter=3)
BODY  = st('body', spaceAfter=6)
SMALL = st('small', fontSize=8.3, leading=12.4, textColor=MUT)
CAP   = st('cap', fontName='DJM', fontSize=7.2, leading=10, textColor=MUT)
EYE   = st('eye', fontName='DJM', fontSize=7.4, leading=10, textColor=ACC2)

def P(t, s=BODY): return Paragraph(t, s)

class Rule(Flowable):
    def __init__(self, w=CW, color=LINE, th=0.8, pad=0):
        Flowable.__init__(self); self.w=w; self.c=color; self.th=th; self.pad=pad
        self.width=w; self.height=th+pad
    def draw(self):
        self.canv.setStrokeColor(self.c); self.canv.setLineWidth(self.th)
        self.canv.line(0, self.pad, self.w, self.pad)

def img(path, width, cap=None, maxh=None):
    im = PILImage.open(path); w,h = im.size
    hh = width*h/w
    if maxh and hh>maxh:
        hh = maxh; width = hh*w/h
    flow = [Image(path, width=width, height=hh)]
    if cap: flow += [Spacer(1,2.5), Paragraph(cap, CAP)]
    return KeepTogether(flow)

def card(flowables, bg=SOFT, border=LINE, pad=9):
    t = Table([[flowables]], colWidths=[CW])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg),
        ('BOX',(0,0),(-1,-1),0.7,border),
        ('LEFTPADDING',(0,0),(-1,-1),pad),('RIGHTPADDING',(0,0),(-1,-1),pad),
        ('TOPPADDING',(0,0),(-1,-1),pad),('BOTTOMPADDING',(0,0),(-1,-1),pad),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    return t

def kv_table(rows, widths=None, head=True, fs=9.0, accent_col=None):
    widths = widths or [CW*0.34, CW*0.66]
    data = []
    for ri, r in enumerate(rows):
        is_head = head and ri == 0
        cells = []
        for c in r:
            cells.append(Paragraph(str(c), st('c', fontSize=fs, leading=fs*1.45,
                                              fontName='DJB' if is_head else 'DJ',
                                              textColor=colors.white if is_head else INK)))
        data.append(cells)
    t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
    style = [
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LINEBELOW',(0,0),(-1,-1),0.5,LINE),
        ('TOPPADDING',(0,0),(-1,-1),5.5),('BOTTOMPADDING',(0,0),(-1,-1),5.5),
        ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
    ]
    if head:
        style += [('BACKGROUND',(0,0),(-1,0),INK), ('TEXTCOLOR',(0,0),(-1,0),colors.white)]
        for i in range(1,len(data)):
            if i%2==0: style.append(('BACKGROUND',(0,i),(-1,i),SOFT))
    t.setStyle(TableStyle(style))
    return t

def bullets(items, style=BODY, bullet='—', color=ACC):
    out=[]
    for it in items:
        out.append(Paragraph(f'<font color="#{color.hexval()[2:]}">{bullet}</font>&nbsp;&nbsp;{it}',
                             ParagraphStyle('b', parent=style, leftIndent=11, firstLineIndent=-11, spaceAfter=3.5)))
    return out

def kicker(txt):
    t = Table([[Paragraph(txt.upper(), st('k', fontName='DJM', fontSize=7.2, textColor=ACC2))]], colWidths=[CW])
    t.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),0)]))
    return t

# ---------- page furniture ----------
def on_page(canv, doc):
    canv.saveState()
    # top hairline + brand
    canv.setFillColor(INK); canv.setFont('DJB', 7.6)
    canv.drawString(M, H-13*mm, 'CINE·MOOD')
    canv.setFillColor(MUT); canv.setFont('DJM', 6.8)
    canv.drawRightString(W-M, H-13*mm, 'PRODUCT BRIEF · REVIEW PLATFORM · OCT 2026')
    canv.setStrokeColor(LINE); canv.setLineWidth(0.6)
    canv.line(M, H-15*mm, W-M, H-15*mm)
    # footer
    canv.line(M, 14*mm, W-M, 14*mm)
    canv.setFont('DJM', 6.8); canv.setFillColor(MUT)
    canv.drawString(M, 9.5*mm, 'Next.js 15 · Prisma · Auth.js · TMDB')
    canv.setFillColor(INK)
    canv.drawRightString(W-M, 9.5*mm, f'{doc.page:02d}')
    canv.restoreState()

def on_cover(canv, doc):
    canv.saveState()
    canv.setFillColor(colors.HexColor('#070A09')); canv.rect(0,0,W,H,fill=1,stroke=0)
    # glow
    for i, a in [(520, 0.05), (400, 0.07), (300, 0.09)]:
        canv.setFillColor(colors.Color(0.07,0.72,0.42,alpha=a))
        canv.circle(W-20*mm, H-40*mm, i, fill=1, stroke=0)
    canv.setFillColor(colors.HexColor('#0B0F0E')); canv.rect(0,0,W,H,fill=0,stroke=0)
    # grid lines
    canv.setStrokeColor(colors.Color(1,1,1,alpha=0.05)); canv.setLineWidth(0.5)
    for x in range(0, int(W), int(14*mm)):
        canv.line(x, 0, x, H)
    # brand
    canv.setFillColor(ACC); canv.circle(M+2.2*mm, H-34*mm, 1.9*mm, fill=1, stroke=0)
    canv.setFillColor(colors.white); canv.setFont('DJB', 15)
    canv.drawString(M+6*mm, H-35.6*mm, 'CINE·MOOD')
    canv.setFillColor(colors.HexColor('#7C8A86')); canv.setFont('DJM', 7.4)
    canv.drawString(M+6*mm, H-40*mm, 'REVIEW · RATE · DISCUSS')

    canv.setFillColor(colors.white); canv.setFont('DJB', 33)
    canv.drawString(M, H-72*mm, 'Jo bana hai —')
    canv.setFillColor(ACC)
    canv.drawString(M, H-84*mm, 'achhe se, ek PDF mein')
    canv.setFillColor(colors.HexColor('#9AA7A3')); canv.setFont('DJ', 11.5)
    for i, line in enumerate([
        'cinenvood jaisi premium website — lekin pirate site nahi,',
        'ek full review + community platform. Live chalti hai,',
        'admin panel se sab control hota hai.'
    ]):
        canv.drawString(M, H-96*mm - i*6.4*mm, line)

    # product shot
    iw = CW; ih = iw*977/1600
    ix, iy = M, H-118*mm-ih
    try:
        canv.drawImage('/home/user/cine/shots/jpg/home-hero.jpg', ix, iy, iw, ih,
                       preserveAspectRatio=False, mask=None)
    except Exception:
        pass
    canv.setStrokeColor(colors.Color(0.07,0.72,0.42,alpha=0.55)); canv.setLineWidth(1)
    canv.rect(ix, iy, iw, ih, fill=0, stroke=1)
    canv.setFillColor(colors.HexColor('#6C7A76')); canv.setFont('DJM', 6.4)
    canv.drawString(ix, iy-9, 'LIVE PREVIEW · HOME PAGE · DARK THEME')

    # stat strip
    stats = [('14', 'films seeded'), ('23', 'reviews'), ('7', 'members'), ('9', 'API routes'), ('13', 'pages')]
    x = M
    canv.setStrokeColor(colors.Color(1,1,1,alpha=0.10))
    canv.line(M, 45*mm, W-M, 45*mm)
    for n, l in stats:
        canv.setFillColor(ACC); canv.setFont('DJB', 18); canv.drawString(x, 35*mm, n)
        canv.setFillColor(colors.HexColor('#76837F')); canv.setFont('DJM', 6.4); canv.drawString(x, 30*mm, l.upper())
        x += 35*mm

    canv.setFillColor(colors.HexColor('#5E6A66')); canv.setFont('DJM', 7)
    canv.drawString(M, 17*mm, 'STACK   Next.js 15 · React 19 · Prisma · Auth.js v5 · TMDB')
    canv.drawString(M, 12.5*mm, 'COST    ₹0 — Vercel Hobby + Neon free tier')
    canv.drawRightString(W-M, 17*mm, 'GOOGLE LOGIN READY')
    canv.drawRightString(W-M, 12.5*mm, 'MOBILE FIRST UI')
    canv.restoreState()

doc = BaseDocTemplate('/home/user/cine/CineMood-Kya-Bana.pdf', pagesize=A4,
                      leftMargin=M, rightMargin=M, topMargin=20*mm, bottomMargin=19*mm,
                      title='CINE·MOOD — Product brief', author='Arena Agent')
frame = Frame(M, 19*mm, CW, H-39*mm, id='f', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([
    PageTemplate(id='cover', frames=[Frame(M, 15*mm, CW, H-30*mm, id='c', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=on_cover),
    PageTemplate(id='body', frames=[frame], onPage=on_page),
])

S='/home/user/cine/shots/jpg/'
F=[NextPageTemplate('body')]

# ---------- p2: what is it ----------
F += [PageBreak(), kicker('01 · ek line mein'), Spacer(1,3),
      P('Ye kya hai — aur kya nahi', H1), Spacer(1,4),
      P('Aapne kaha tha: cinenvood.vercel.app jaisi "same to same" premium site chahiye, lekin pirate site nahi. '
        'To wahi visual language — dark cinematic canvas, poster rails, match-score chips, glass panels — uthaya gaya '
        'aur uske upar ek <b>legit review platform</b> khada kiya gaya: films ka data TMDB se, verdict community se, '
        'control admin ke haath mein.', BODY), Spacer(1,8)]

cmp_rows = [['Reference site (cinenvood)', 'Jo banaya (CINE·MOOD)'],
            ['Pirated movie/TV content, download links', 'Sirf metadata + reviews, koi file nahi'],
            ['Password-protected admin, reviews on Supabase', 'Google / demo login, Prisma + SQLite→Postgres'],
            ['Koi rating/comment system nahi', '10-point ratings, spoiler-safe reviews, likes, comments'],
            ['Dark-only, poster grid', 'Dark + light, 5 accent themes, responsive mobile-first'],
            ['No dashboard for users', 'Member dashboard: reviews, watchlist, profile'],
            ['Generic admin list', 'Admin: moderation, catalogue, users, TMDB one-click import']]
F += [kv_table(cmp_rows, widths=[CW*0.46, CW*0.54], fs=8.7), Spacer(1,10)]

F += [card([P('<b>Ek line ka pitch:</b> "Letterboxd jaisa review platform, streaming site jaisi feel." — '
              'log film dekhte hain, yahan aakar rating + review dete hain, watchlist banate hain, '
              'aur baaki logon ke verdicts padhte hain.', st('p', fontSize=9.4, leading=14.6))]), Spacer(1,10)]

F += [kicker('kya kya chalta hai'), Spacer(1,3), P('Features jo actually kaam karte hain', H2), Spacer(1,3)]
F += bullets([
    '<b>Instant search</b> — title, synopsis aur director par (header mein live dropdown)',
    '<b>Review composer</b> — 10-star picker, headline, body, spoiler toggle; ek user ek film par ek review (upsert)',
    '<b>Spoiler blur</b> — spoiler wale reviews "click to reveal" ke peeche hidden',
    '<b>Likes + comments</b> — review par like, review page par poora comment thread',
    '<b>Like + Watchlist</b> — har film par, dashboard ke watchlist tab mein dikhta hai',
    '<b>Filters</b> — genre, sort (trending / rating / newest / title)',
    '<b>Dashboard</b> — stats, my reviews, watchlist, editable profile',
    '<b>Admin</b> — moderation queue, catalogue, users, comments, TMDB import',
    '<b>SEO/PWA</b> — sitemap, robots, OG image, manifest, JSON-LD per film',
])

# ---------- p3: home ----------
F += [PageBreak(), kicker('02 · public site'), Spacer(1,3),
      P('Home — hero, rails, feed', H1), Spacer(1,4),
      P('Featured film ka backdrop poore width mein, poster card tilt ke saath, community score ring, '
        'genre chips, trending rail, review feed aur right side mein top-rated / community pulse / top reviewers.', BODY),
      Spacer(1,6), img(S+'home-hero.jpg', CW*0.86, 'Home · hero + featured poster + genre chips (dark theme, default)'), Spacer(1,7),
      img(S+'home-feed.jpg', CW*0.86, 'Trending rail ke neeche review feed, aur sidebar mein top rated / community pulse')]

F += [PageBreak(), kicker('02 · public site (contd.)'), Spacer(1,3),
      P('Light mode + film page', H1), Spacer(1,4),
      P('Sirf dark nahi — ek asli light theme bhi hai (sirf colors invert nahi kiya, poore tokens dobara tune kiye). '
        'Theme switcher header mein hai aur user ki choice localStorage mein yaad rehti hai.', BODY), Spacer(1,6),
      img(S+'home-light.jpg', CW*0.84, 'Same home page, light theme — tokens dobara tune kiye, sirf invert nahi'), Spacer(1,7),
      img(S+'detail-top.jpg', CW*0.84, 'Film page · poster, TMDB rating, community score ring, 10→6 distribution, Like/Watchlist')]

# ---------- p4: detail ----------
F += [PageBreak(), kicker('03 · film page'), Spacer(1,3),
      P('Composer aur community section', H1), Spacer(1,4),
      P('Usi page ke neeche review composer hai — 10-star picker, headline, review body aur spoiler checkbox. '
        'Publish karte hi rating distribution aur community score update ho jaate hain. Uske baad community reviews '
        'aur similar titles.', BODY),
      Spacer(1,6), img(S+'composer.jpg', CW*0.96, 'Composer entry + film facts sidebar · sign-in state (logged out)'), Spacer(1,7),
      img(S+'review-detail.jpg', CW*0.9, 'Review page · spoiler-safe body, like, comments thread aur "rate this film"')]

F += [PageBreak(), kicker('04 · community'), Spacer(1,3),
      P('Community aur login', H1), Spacer(1,4),
      P('Community page par top reviewers ka leaderboard, naye members aur active discussions. Login page par '
        'Google button (credentials aate hi live ho jaata hai) aur neeche demo email login — demo ke liye.', BODY),
      Spacer(1,6), img(S+'feed.jpg', CW*0.9, 'Reviews feed · recent / top sorting, likes aur comment counts'), Spacer(1,7),
      img(S+'community-crop.jpg', CW*0.9, 'Community · top reviewers leaderboard, newest members, active discussions')]

# ---------- p5: feed/community/login ----------


# ---------- p6: dashboard ----------
F += [PageBreak(), kicker('05 · member area'), Spacer(1,3),
      P('Dashboard — user ka apna ghar', H1), Spacer(1,4),
      P('Login ke baad har member ko stats milte hain (reviews, likes received, comments, watchlist), '
        'uske apne reviews, saved watchlist aur editable profile — bilkul app jaisa.', BODY),
      Spacer(1,6), img(S+'dash.jpg', CW*0.9, 'Dashboard overview · stats (reviews, likes received, comments, watchlist) + recent activity'), Spacer(1,7),
      img(S+'dash-reviews.jpg', CW*0.9, 'My reviews tab · har review ka rating, likes, comments aur READ link'), Spacer(1,7),
      card([P('<b>Profile tab:</b> naam aur bio edit → header dropdown, review cards aur community page par turant reflect hota hai.', SMALL)], pad=8)]

# ---------- p7: admin ----------
F += [PageBreak(), kicker('06 · admin panel'), Spacer(1,3),
      P('Admin — sab kuch ek jagah', H1), Spacer(1,4),
      P('Sirf ADMIN role wale log hi andar aa sakte hain (server-side check, URL se bhi nahi ghus sakte). '
        'Aapne jo maanga tha — "kaunsa user, kis movie par comment/review, sabse zyada likes" — sab yahin visible hai.', BODY),
      Spacer(1,6), img(S+'admin-ov.jpg', CW, 'Overview · KPI cards, newest members, latest comments (user + review context)'), Spacer(1,7),
      img(S+'admin-mod.jpg', CW, 'Moderation · review + author email + rating + publish/hide/delete')]

# ---------- p8: admin 2 + mobile ----------
F += [PageBreak(), kicker('06 · admin panel (contd.)'), Spacer(1,3),
      P('Catalogue, users aur TMDB import', H1), Spacer(1,4)]
F += [kv_table([
    ['Titles', 'Feature/unfeature (home hero + rails), hide/show, per-title reviews & likes count'],
    ['Users', 'Role switch (make admin / demote), delete user (cascade), activity counts, join time'],
    ['Comments', 'Latest comments list with author + parent review; delete action available'],
    ['TMDB import', 'Live TMDB search → one-click import (poster, backdrop, cast, genres, synopsis, rating)'],
], widths=[CW*0.22, CW*0.78], fs=8.8)]
F += [Spacer(1,10), kicker('07 · mobile'), Spacer(1,3), P('Phone par "app jaisa" feel', H1), Spacer(1,4),
      P('390px par zero horizontal scroll: header do row mein (brand + actions, phir full-width search), '
        'poster rails swipe hote hain, detail page poster+title side-by-side phir content full width.', BODY), Spacer(1,6)]
_mw = 63*mm
mh = _mw*1500/780
mrow = Table([[Image(S+'m-home.jpg', width=_mw, height=mh), Image(S+'m-movie.jpg', width=_mw, height=mh)]],
             colWidths=[CW/2, CW/2])
mrow.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0)]))
F += [mrow, Spacer(1,3), Paragraph('390 × 844 · home aur film detail (iPhone-ish viewport)', CAP)]

# ---------- p9: design system ----------
F += [PageBreak(), kicker('08 · design'), Spacer(1,3),
      P('Design system — ek hi file mein', H1), Spacer(1,4),
      P('<font name="DJM" size="8.6">app/globals.css</font> mein poora system hand-written hai (koi Tailwind nahi, koi UI kit nahi): '
        'tokens, components, themes aur responsive rules. Isse site tez rehti hai aur branding consistent.', BODY), Spacer(1,6)]
F += [kv_table([
    ['Base', 'Ink #08090B · glass panels · hairline borders · mono micro-labels'],
    ['Accents', 'Emerald (default) · Cyan · Rose · Violet · Amber — palette switcher header mein'],
    ['Modes', 'Dark (default) + real light mode, localStorage mein yaad, no flash on load'],
    ['Type', 'Outfit (display) · Poppins (body) · IBM Plex Mono (labels) via next/font'],
    ['Components', '.poster-card · .review-card · .score-ring · .dist · .stat-card · .table · .chip · .panel'],
    ['Motion', 'Hover lift, rail snap, ring fill, reduced-motion respect'],
    ['A11y', 'Focus-visible rings, aria-labels on icon buttons, semantic landmarks, 44px touch targets'],
], widths=[CW*0.2, CW*0.8], fs=8.6), Spacer(1,14)]

F += [kicker('accent palette — header mein switch'), Spacer(1,4)]
_sw = [('#12B76A', 'Emerald', 'default'), ('#22B8CF', 'Cyan', ''), ('#F0526B', 'Rose', ''),
       ('#8B7BFF', 'Violet', ''), ('#E5A50A', 'Amber', '')]
cells = []
for hexv, name, tag in _sw:
    cells.append(Paragraph(f'<font color="white"><b>{name}</b></font><br/><font color="white" size="6.6">{hexv}{(" · " + tag) if tag else ""}</font>',
                           st('sw', fontSize=8.4, leading=11.5)))
swt = Table([cells], colWidths=[CW/5]*5)
style = [('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),14),('BOTTOMPADDING',(0,0),(-1,-1),14),
         ('LEFTPADDING',(0,0),(-1,-1),10)]
for i,(hexv,_,_) in enumerate(_sw):
    style.append(('BACKGROUND',(i,0),(i,0), colors.HexColor(hexv)))
swt.setStyle(TableStyle(style))
F += [swt, Spacer(1,12)]

F += [kicker('kaise banaya'), Spacer(1,3), P('Design decisions', H2), Spacer(1,3)]
F += bullets([
    'Tailwind nahi — poora CSS tokens par (--accent, --surface, --border), isliye theme switch ek attribute se hota hai',
    'Har theme ke liye contrast check: body text 7:1, muted text 4.5:1 se neeche nahi',
    'Same component mobile aur desktop par — sirf grid badalta hai, markup nahi',
    'Poster images local /public se (fast LCP), TMDB imports CDN se with next/image allow-list',
    'Score ring SVG-based — koi chart library nahi, koi runtime cost nahi',
], style=st('b3', fontSize=8.8, leading=13))

# ---------- p10: stack ----------
F += [PageBreak(), kicker('09 · tech'), Spacer(1,3),
      P('Stack — sab free tier', H1), Spacer(1,4), Spacer(1,2)]
F += [kv_table([
    ['Layer', 'Choice', 'Cost'],
    ['Framework', 'Next.js 15 App Router + React 19 + TypeScript', '₹0'],
    ['Auth', 'Auth.js v5 — Google OAuth + demo email, JWT, role gating', '₹0'],
    ['DB', 'SQLite (local demo) → Neon Postgres (production)', '₹0'],
    ['ORM', 'Prisma 6 (schema + seed script included)', '₹0'],
    ['Metadata', 'TMDB API — search, details, import', '₹0'],
    ['Images', 'Local posters now · TMDB CDN · Cloudinary free for uploads', '₹0'],
    ['Host', 'Vercel Hobby', '₹0'],
], widths=[CW*0.2, CW*0.6, CW*0.2], fs=8.6), Spacer(1,12)]
F += [kicker('security'), Spacer(1,3), P('Backend solid kaise hai', H2), Spacer(1,3)]
F += bullets([
    'Har mutation server-side auth check ke baad — <font name="DJM" size="8.4">requireUser()</font> / <font name="DJM" size="8.4">requireAdmin()</font>',
    'Har request body <b>Zod</b> se validate hoti hai (rating 1–10, body 20–4000 chars, email format)',
    'Admin actions ek hi enum-based route se — review.status / review.delete / title.feature / user.role / user.delete / comment.delete',
    'Ek user ek film par sirf ek review (unique constraint + upsert) — spam-proof',
    'Role JWT claim mein, DB se re-check on every admin action',
    'Cascade deletes — user hataya to uske reviews/comments bhi saaf',
], style=st('b2', fontSize=9.0, leading=13.6))

F += [Spacer(1,12), kicker('api'), Spacer(1,3), P('Endpoints (sab zod-validated)', H2), Spacer(1,4),
      kv_table([
          ['POST', '/api/reviews — review create/update (upsert per user+film)'],
          ['POST', '/api/reviews/[id]/like — like toggle, naya count return'],
          ['POST', '/api/reviews/[id]/comments — comment add (1–600 chars)'],
          ['POST', '/api/titles/[id]/like — LIKE ya WATCHLIST toggle'],
          ['POST', '/api/profile — naam + bio update'],
          ['POST', '/api/admin/action — 7 admin actions, ek enum route'],
          ['GET', '/api/search?q= — instant search (title/overview/director)'],
          ['GET/POST', '/api/tmdb + /api/tmdb/import — live search aur one-click import'],
      ], widths=[CW*0.13, CW*0.87], head=False, fs=8.5)]

# ---------- p11: run ----------
F += [PageBreak(), kicker('10 · chalayein'), Spacer(1,3),
      P('Local demo — 4 commands', H1), Spacer(1,5),
      card([
          Paragraph('<font name="DJM" size="9.0" color="#0E7C4A">$ npm install</font>', st('c1', spaceAfter=3)),
          Paragraph('<font name="DJM" size="9.0" color="#0E7C4A">$ npx prisma generate &amp;&amp; npx prisma db push</font>', st('c2', spaceAfter=3)),
          Paragraph('<font name="DJM" size="9.0" color="#0E7C4A">$ node prisma/seed.mjs</font>', st('c3', spaceAfter=3)),
          Paragraph('<font name="DJM" size="9.0" color="#0E7C4A">$ npm run dev</font>   <font size="8.4" color="#5A6663">→ http://localhost:3000</font>', st('c4')),
      ], bg=colors.HexColor('#F1F7F3')), Spacer(1,10)]
F += [P('Demo logins (password nahi chahiye)', H2), Spacer(1,3),
      kv_table([['Email', 'Kya hota hai'],
                ['admin@cinemood.app', 'ADMIN — admin panel + moderation sab khulta hai'],
                ['koi bhi email (you@x.com)', 'MEMBER — review, like, comment, watchlist']],
               widths=[CW*0.42, CW*0.58], fs=8.8), Spacer(1,10)]
F += [P('Google login on karna (aapka client ID aane ke baad)', H2), Spacer(1,3)]
F += bullets([
    'Google Cloud Console → Credentials → OAuth client ID (Web application)',
    'Redirect URI: <font name="DJM" size="8.4">http://localhost:3000/api/auth/callback/google</font> aur production domain',
    '<font name="DJM" size="8.4">.env</font> mein <font name="DJM" size="8.4">AUTH_GOOGLE_ID</font>, <font name="DJM" size="8.4">AUTH_GOOGLE_SECRET</font> daalo → restart',
    'Login page par Google button khud live ho jayega; demo login fallback bana rahega',
])
F += [Spacer(1,8), P('TMDB real data', H2), Spacer(1,3),
      P('<font name="DJM" size="8.4">TMDB_API_KEY</font> daalte hi Admin → TMDB import se koi bhi film one-click import ho jaati hai '
        '(v3 key ya v4 read token, dono auto-detect). Bina key ke 14 seeded films + local posters chalte rehte hain.', BODY)]

F += [Spacer(1,10), kicker('code map'), Spacer(1,3), P('Kaun si file kya karti hai', H2), Spacer(1,3),
      kv_table([
          ['app/', 'Pages — home, movies, film detail, reviews, community, dashboard, admin, login, about, legal'],
          ['app/api/', '9 route handlers (reviews, likes, comments, search, profile, admin, tmdb)'],
          ['components/', '17 client components — header, search, theme switcher, composer, comments, admin bits'],
          ['lib/', 'prisma client, session helpers, queries, formatting, TMDB client'],
          ['prisma/', 'schema + seed script + 14 films ka seed data'],
          ['auth.ts', 'Google + demo providers, JWT callbacks, admin promotion'],
          ['public/', '14 posters + 14 blurred backdrops (local, fast, no external calls)'],
      ], widths=[CW*0.2, CW*0.8], head=False, fs=8.4)]

# ---------- p12: deploy ----------
F += [PageBreak(), kicker('11 · deploy'), Spacer(1,3),
      P('Free hosting: Neon + Vercel (₹0)', H1), Spacer(1,5)]
F += [kv_table([
    ['Step', 'Kya karna hai'],
    ['1. Neon', 'neon.tech → project → pooled Postgres connection string copy karo'],
    ['2. Schema', 'prisma/schema.prisma mein provider "sqlite" → "postgresql"'],
    ['3. Push', 'DATABASE_URL="postgres://..." npx prisma db push && node prisma/seed.mjs'],
    ['4. Vercel', 'Repo import → env vars: DATABASE_URL, AUTH_SECRET, AUTH_TRUST_HOST,\nNEXT_PUBLIC_SITE_URL, ADMIN_EMAIL, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, TMDB_API_KEY'],
    ['5. Build', 'Already set: prisma generate && next build'],
    ['6. Domain', 'cinemood.vercel.app / apna domain add karo → NEXT_PUBLIC_SITE_URL + Google redirect update'],
], widths=[CW*0.18, CW*0.82], fs=8.4), Spacer(1,10)]
F += [card([P('<b>Yaad rahe:</b> preview abhi SQLite par chalta hai (zero setup). Vercel par file-based DB persist nahi hoti — '
              'isliye production mein Neon Postgres hi use karna hai, wahi README mein step-by-step likha hai.', SMALL)],
           bg=colors.HexColor('#FFF9EC'), border=colors.HexColor('#EBD9A6')), Spacer(1,10)]
F += [kicker('legal'), Spacer(1,3), P('Piracy se doori — by design', H2), Spacer(1,3)]
F += bullets([
    'Koi file host, magnet, torrent, embedded player ya "download" button nahi — kabhi nahi',
    'TMDB metadata with standard attribution ("not endorsed or certified by TMDB")',
    '/legal page mein DMCA process, user-content rules aur privacy likha hai',
    'Reviews admin se moderate hote hain (publish / hide / delete) — advertiser aur host dono safe',
], color=ACC2)

F += [Spacer(1,12), kicker('deploy ke baad'), Spacer(1,3), P('5-minute sanity checklist', H2), Spacer(1,3)]
F += bullets([
    'Home page khulta hai aur posters dikhte hain (backdrops 404 nahi)',
    'admin@your-domain se login → /admin khulta hai, moderation queue load hoti hai',
    'Ek review publish karo → rating distribution aur score update ho',
    'Watchlist toggle → /dashboard?tab=watchlist mein film dikhe',
    'Sitemap: /sitemap.xml par films listed hon; /robots.txt disallow /admin, /dashboard',
])

# ---------- p13: next ----------
F += [PageBreak(), kicker('12 · aage kya'), Spacer(1,3),
      P('Aapke paas ab kya hai', H1), Spacer(1,4),
      P('Ek complete, chalne wala product — code, seed data, local posters/backdrops, README, aur ye brief. '
        'Sab kuch <font name="DJM" size="8.8">/home/user/cine</font> mein hai.', BODY), Spacer(1,6)]
F += [kv_table([
    ['Aap ye karo', 'Result'],
    ['Google OAuth credentials do', 'Real Google login live (10 min ka kaam)'],
    ['TMDB API key do', 'Poora catalogue + one-click import (unlimited films)'],
    ['Neon account banao', 'Production DB — Vercel par deploy ready'],
    ['Domain final karo', 'cinemood.vercel.app / apna naam — SEO + OG image already ready'],
], widths=[CW*0.42, CW*0.58], fs=8.8), Spacer(1,12)]
F += [kicker('optional · phase 2'), Spacer(1,3), P('Bol do to ye add kar dunga', H2), Spacer(1,3)]
F += bullets([
    'Profile photo upload (Cloudinary free) + followers/following',
    'Curated "collections" — jaise "Best of 2024", "Weekend watchlist"',
    'Weekly email digest / newsletter signup (Resend free tier)',
    'Hindi/English UI toggle — copy pehle se Hinglish-friendly hai',
    'Report button + full audit log for admin actions',
], color=ACC2)
F += [Spacer(1,18)]
F += [card([Paragraph('<font color="#12B76A"><b>CINE·MOOD</b></font><font color="#FFFFFF"> — reviews, not downloads.</font><br/>'
                      '<font size="8.4" color="#9AA7A3">Live preview chal raha hai. Login karke admin@cinemood.app se admin panel kholo — '
                      'moderation, users, TMDB import sab try karo.</font>',
                      st('end', fontSize=11, leading=16, textColor=colors.white))], bg=INK, border=INK, pad=13)]

doc.build(F)
print('PDF done')
