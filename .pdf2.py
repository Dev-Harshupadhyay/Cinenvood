# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Image, Table, TableStyle, PageBreak, KeepTogether, Flowable, NextPageTemplate)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

R='/usr/share/fonts/truetype/dejavu/'
for n,f in [('DJ','DejaVuSans.ttf'),('DJB','DejaVuSans-Bold.ttf'),('DJM','DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(n, R+f))

INK  = colors.HexColor('#0B0F0E'); ACC = colors.HexColor('#12B76A'); ACC2 = colors.HexColor('#0E7C4A')
MUT  = colors.HexColor('#5A6663'); LINE = colors.HexColor('#DCE4E1'); SOFT = colors.HexColor('#F4F8F6')
W,H = A4; M = 18*mm; CW = W-2*M

def st(n,**kw):
    b=dict(fontName='DJ',fontSize=9.4,leading=14.6,textColor=INK); b.update(kw); return ParagraphStyle(n,**b)
H1=st('h1',fontName='DJB',fontSize=20,leading=25,spaceAfter=6)
H2=st('h2',fontName='DJB',fontSize=12,leading=16.5,spaceAfter=3)
BODY=st('body',spaceAfter=5); SMALL=st('sm',fontSize=8.2,leading=12,textColor=MUT)
CAP=st('cap',fontName='DJM',fontSize=6.9,leading=9.5,textColor=MUT)
def P(t,s=BODY): return Paragraph(t,s)
def kicker(t): return Paragraph(t.upper(), st('k',fontName='DJM',fontSize=7.2,textColor=ACC2))

def img(path,width,cap=None):
    im=PILImage.open(path); w,h=im.size; hh=width*h/w
    fl=[Image(path,width=width,height=hh)]
    if cap: fl+=[Spacer(1,2.5),Paragraph(cap,CAP)]
    return KeepTogether(fl)

def kv(rows,widths=None,head=True,fs=8.6):
    widths=widths or [CW*0.32,CW*0.68]
    data=[]; style=[('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),0.5,LINE),
                    ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
                    ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7)]
    for ri,r in enumerate(rows):
        ish = head and ri==0
        data.append([Paragraph(str(c), st('c',fontSize=fs,leading=fs*1.45,
                       fontName='DJB' if ish else 'DJ', textColor=colors.white if ish else INK)) for c in r])
        if ri%2==0 and ri>0: style.append(('BACKGROUND',(0,ri),(-1,ri),SOFT))
    if head: style.append(('BACKGROUND',(0,0),(-1,0),INK))
    t=Table(data,colWidths=widths,repeatRows=1 if head else 0); t.setStyle(TableStyle(style)); return t

def bullets(items,fs=8.8,color=ACC):
    out=[]
    for it in items:
        out.append(Paragraph(f'<font color="#{color.hexval()[2:]}">—</font>&nbsp;&nbsp;{it}',
                   ParagraphStyle('b',parent=st('bb',fontSize=fs,leading=fs*1.5),leftIndent=11,firstLineIndent=-11,spaceAfter=3)))
    return out

def card(flows,bg=SOFT,border=LINE,pad=9):
    t=Table([[flows]],colWidths=[CW]); t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg),('BOX',(0,0),(-1,-1),0.7,border),
        ('LEFTPADDING',(0,0),(-1,-1),pad),('RIGHTPADDING',(0,0),(-1,-1),pad),
        ('TOPPADDING',(0,0),(-1,-1),pad),('BOTTOMPADDING',(0,0),(-1,-1),pad),('VALIGN',(0,0),(-1,-1),'TOP')]))
    return t

def on_body(canv,doc):
    canv.saveState()
    canv.setFillColor(INK); canv.setFont('DJB',7.6); canv.drawString(M,H-13*mm,'CINE·MOOD')
    canv.setFillColor(MUT); canv.setFont('DJM',6.8); canv.drawRightString(W-M,H-13*mm,'V2 · ADMIN VERDICT · OCT 2026')
    canv.setStrokeColor(LINE); canv.setLineWidth(0.6); canv.line(M,H-15*mm,W-M,H-15*mm)
    canv.line(M,14*mm,W-M,14*mm); canv.setFont('DJM',6.8); canv.setFillColor(MUT)
    canv.drawString(M,9.5*mm,'Next.js 15 · Prisma · Auth.js · Instrument Serif')
    canv.setFillColor(INK); canv.drawRightString(W-M,9.5*mm,f'{doc.page:02d}')
    canv.restoreState()

def on_cover(canv,doc):
    canv.saveState()
    canv.setFillColor(colors.HexColor('#070A09')); canv.rect(0,0,W,H,fill=1,stroke=0)
    for r,a in [(520,0.05),(400,0.07),(300,0.09)]:
        canv.setFillColor(colors.Color(0.07,0.72,0.42,alpha=a)); canv.circle(W-16*mm,H-36*mm,r,fill=1,stroke=0)
    canv.setFillColor(ACC); canv.circle(M+2.2*mm,H-32*mm,1.9*mm,fill=1,stroke=0)
    canv.setFillColor(colors.white); canv.setFont('DJB',15); canv.drawString(M+6*mm,H-33.6*mm,'CINE·MOOD')
    canv.setFillColor(colors.HexColor('#7C8A86')); canv.setFont('DJM',7.4); canv.drawString(M+6*mm,H-38*mm,'UPDATE 02 · ADMIN VERDICT + GITHUB READY')
    canv.setFillColor(colors.white); canv.setFont('DJB',30)
    canv.drawString(M,H-62*mm,'Admin verdict aa gaya —')
    canv.setFillColor(ACC); canv.drawString(M,H-73*mm,'aur ab woh "solid" lagta hai')
    canv.setFillColor(colors.HexColor('#9AA7A3')); canv.setFont('DJ',10.5)
    for i,l in enumerate(['Harsh ka review ab site ka flagship card hai: animated gradient border,',
                          'Instrument Serif headline, drop cap, pinning aur "— Harsh" signature.',
                          'Admin panel se ek click mein pin / unpin. Repo + SSH key bhi ready.']):
        canv.drawString(M,H-84*mm-i*5.9*mm,l)
    iw=CW*0.98; ih=iw*692/1500; ix=M; iy=H-100*mm-ih
    canv.drawImage('/home/user/cine/shots/jpg/v2-verdict-card.jpg',ix,iy,iw,ih,preserveAspectRatio=False)
    canv.setStrokeColor(colors.Color(0.07,0.72,0.42,alpha=0.6)); canv.setLineWidth(1); canv.rect(ix,iy,iw,ih,fill=0,stroke=1)
    canv.setFillColor(colors.HexColor('#6C7A76')); canv.setFont('DJM',6.4); canv.drawString(ix,iy-9,'ADMIN VERDICT CARD · LIVE RENDER')
    canv.setStrokeColor(colors.Color(1,1,1,alpha=0.12)); canv.line(M,36*mm,W-M,36*mm)
    stats=[('24','reviews'),('1','pinned verdict'),('7','members'),('5','accent themes'),('6','new files')]
    x=M
    for n,l in stats:
        canv.setFillColor(ACC); canv.setFont('DJB',17); canv.drawString(x,27*mm,n)
        canv.setFillColor(colors.HexColor('#76837F')); canv.setFont('DJM',6.3); canv.drawString(x,22.5*mm,l.upper()); x+=35*mm
    canv.restoreState()

doc=BaseDocTemplate('/home/user/cine/CineMood-v2-Admin-Verdict.pdf',pagesize=A4,leftMargin=M,rightMargin=M,topMargin=20*mm,bottomMargin=19*mm,title='CINE·MOOD v2 — Admin Verdict')
fr=Frame(M,19*mm,CW,H-39*mm,id='f',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='cover',frames=[Frame(M,15*mm,CW,H-30*mm,id='c',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=on_cover),
                      PageTemplate(id='body',frames=[fr],onPage=on_body)])
S='/home/user/cine/shots/jpg/'
F=[NextPageTemplate('body')]

# p2 — verdict explained
F += [PageBreak(), kicker('01 · admin verdict'), Spacer(1,3),
      P('Harsh ka review = site ka flagship card', H1), Spacer(1,4),
      P('Login admin se hota hai (admin@cinemood.app), aur jis bhi review ka author ADMIN role wala hai wo '
        'automatically premium treatment paata hai. Neeche wahi card desktop par.', BODY), Spacer(1,6),
      img(S+'v2-verdict-card.jpg', CW*0.98, 'Admin verdict card · serif headline, drop cap, gradient hairline, PINNED badge, "— Harsh" signature'), Spacer(1,10),
      P('Andar kya kya hai', H2), Spacer(1,3)]
_bl = bullets([
 '<b>Animated conic border</b> — accent colour card ke chaaro taraf dheere ghoomta hai (9s loop)',
 '<b>Shine sweep</b> — har 7 second mein ek soft light card ke upar se guzarti hai',
 '<b>Instrument Serif headline</b> — naya premium serif font, gradient text clip ke saath',
 '<b>Drop cap</b> — pehla letter bada serif, magazine feel',
 '<b>ADMIN VERDICT · FOUNDER &amp; EDITOR</b> label + pulsing dot, naam ke saath ✦ crown',
 '<b>PINNED</b> chip + "— Harsh" signature footer mein',
 '<b>Mobile par bhi</b> same card, font aur spacing scale ho jaate hain',
 '<b>Reduced motion</b> respect — animation off ho jaati hai agar user ne system mein disable kiya ho',
])
F += _bl


# p3 — pinned across site
F += [PageBreak(), kicker('02 · site bhar mein pinned'), Spacer(1,3),
      P('Feed, film page — sab jagah top par', H1), Spacer(1,4),
      P('Database mein <font name="DJM" size="8.6">Review.featured</font> field add hui hai. Sort order ab '
        '<font name="DJM" size="8.6">featured DESC → createdAt DESC</font> hai, isliye pinned verdict home feed, '
        'reviews feed aur us film ke page par sabse pehle aata hai — baaki reviews normal rehte hain.', BODY),
      Spacer(1,6), img(S+'v2-home-verdict-card.jpg', CW*0.95, 'Home feed · verdict sabse upar pinned, neeche community reviews'), Spacer(1,8),
      card([P('<b>Ek click pin:</b> Admin → Overview → "Top reviews · by likes" mein har review ke saath '
              '<b>Pin / Unpin</b> button hai. Moderation table mein bhi "Pin as verdict" milta hai.', SMALL)])]

# p4 — admin panel
F += [PageBreak(), kicker('03 · admin panel'), Spacer(1,3),
      P('Dashboard aur moderation — solid', H1), Spacer(1,4),
      P('Overview ab action-oriented hai: KPI cards, "needs attention", <b>top reviews by likes</b> with instant '
        'pin/unpin, newest members aur latest comments (kis user ne kis review par comment kiya).', BODY), Spacer(1,6),
      img(S+'v2-admin.jpg', CW*0.95, 'Admin overview · top reviews by likes, ADMIN + PINNED badges, Pin/Unpin actions'), Spacer(1,8),
      img(S+'v2-admin-mod.jpg', CW*0.95, 'Moderation queue · publish / hide / pin as verdict / delete + PINNED badge')]

# p5 — what changed technically
F += [PageBreak(), kicker('04 · technical'), Spacer(1,3),
      P('Kya-kya badla (code level)', H1), Spacer(1,6)]
F += [kv([
 ['File / layer','Change'],
 ['prisma/schema.prisma','Review mein <font name="DJM" size="8">featured Boolean @default(false)</font> + index'],
 ['prisma/seed.mjs','Admin user = <b>Harsh Upadhyay</b>; ek flagship verdict seeded aur featured: true'],
 ['components/ReviewCard.tsx','Admin role detect → <font name="DJM" size="8">.admin-verdict</font> variant, pin chip, signature'],
 ['app/globals.css','~150 lines naya: conic gradient border, shine sweep, drop cap, serif type scale, mobile tweaks'],
 ['app/layout.tsx','Instrument Serif (next/font) → <font name="DJM" size="8">--font-serif</font>'],
 ['lib/queries.ts','Reviews select mein role, order <font name="DJM" size="8">featured → date</font>'],
 ['api/admin/action','Naya action <font name="DJM" size="8">review.feature</font> (value: true/false)'],
 ['app/admin/page.tsx','Top-reviews panel + Pin/Unpin buttons + ADMIN/PINNED badges'],
], widths=[CW*0.34,CW*0.66], fs=8.4), Spacer(1,12)]
F += [P('Commands (already chal chuke)', H2), Spacer(1,3),
      card([Paragraph('<font name="DJM" size="8.8" color="#0E7C4A">$ npx prisma db push</font>',st('c1',spaceAfter=3)),
            Paragraph('<font name="DJM" size="8.8" color="#0E7C4A">$ node prisma/seed.mjs</font>&nbsp;&nbsp;<font size="8" color="#5A6663">→ 7 users · 14 titles · 24 reviews</font>',st('c2',spaceAfter=3)),
            Paragraph('<font name="DJM" size="8.8" color="#0E7C4A">$ npx next build</font>&nbsp;&nbsp;<font size="8" color="#5A6663">→ ✓ compiled, 27 routes</font>',st('c3'))],
            bg=colors.HexColor('#F1F7F3')), Spacer(1,10)]
F += [P('Note', H2), Spacer(1,3),
      P('Vercel/Neon par deploy karte waqt sirf provider <font name="DJM" size="8.6">sqlite → postgresql</font> badalna hai; '
        'baaki sab same. Purane reviews ka <font name="DJM" size="8.6">featured</font> default false hi rahega, isliye kuch break nahi hota.', BODY)]

# p6 — repo + ssh
F += [PageBreak(), kicker('05 · github'), Spacer(1,3),
      P('Repo push — bas deploy key add karo', H1), Spacer(1,4),
      P('Aapne write access offer kiya tha. Sandbox mein ek SSH key ban gayi hai — uski <b>public</b> key neeche hai. '
        'Aap use GitHub repo → Settings → Deploy keys mein paste karo aur <b>"Allow write access"</b> tick karo. '
        'Aapke bas add karte hi main commit aur push kar dunga.', BODY), Spacer(1,6)]
F += [card([
  Paragraph('PUBLIC KEY — copy karo', st('l',fontName='DJM',fontSize=7.4,textColor=ACC2,spaceAfter=5)),
  Paragraph('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL85Z2f4t/M5Ig8LUAdqtPWjYxp266lnTfRMk82txC1G cinemood-deploy@arena',
            st('k2',fontName='DJM',fontSize=7.4,leading=11,textColor=INK))
], bg=colors.HexColor('#F1F7F3'), pad=10), Spacer(1,8)]
F += [kv([
 ['Step','Kya karna hai'],
 ['1','github.com/Dev-Harshupadhyay/Cinenvood → Settings → Deploy keys → Add deploy key'],
 ['2','Title: "cinemood-arena" · Key: upar wali line paste · ☑ Allow write access'],
 ['3','Mujhe "done" bolo — main push kar dunga (branch: main)'],
 ['4','Vercel → Import repo → env vars (DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, TMDB_API_KEY)'],
 ['5','Build: prisma generate && next build · Domain add karo'],
], widths=[CW*0.14,CW*0.86], fs=8.3), Spacer(1,10)]
F += [P('Push ke liye main ye chalata hoon', H2), Spacer(1,3),
      card([Paragraph('<font name="DJM" size="8.4" color="#0E7C4A">$ git remote add origin git@github.com:Dev-Harshupadhyay/Cinenvood.git</font>',st('p1',spaceAfter=3)),
            Paragraph('<font name="DJM" size="8.4" color="#0E7C4A">$ git push -u origin main</font>',st('p2'))], bg=colors.HexColor('#F1F7F3'))]
F += [Spacer(1,12), kicker('aage'), Spacer(1,3), P('Aap bolo, main ye kar dunga', H2), Spacer(1,3)]
F += bullets([
 'Google OAuth credentials add + login page pe test',
 'TMDB key se poora catalogue import (14 → jitni films chahiye)',
 'Neon par Postgres migrate + Vercel deploy, phir live link',
 'Admin verdict ke aur variants (video verdict, "Editor\'s pick" rail)',
], color=ACC2)
F += [Spacer(1,16), card([Paragraph('<font color="#12B76A"><b>CINE·MOOD v2</b></font><font color="#FFFFFF"> — ab flagship verdict bhi hai.</font><br/>'
      '<font size="8.2" color="#9AA7A3">Admin se login karo → /admin → Pin/Unpin try karo. Film page kholo, card dekho.</font>',
      st('end',fontSize=10.5,leading=15,textColor=colors.white))], bg=INK, border=INK, pad=12)]
doc.build(F)
print('pdf2 done')
