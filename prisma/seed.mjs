import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'prisma/seed-data.json'), 'utf8'));

const USERS = [
  { email: 'admin@cinemood.app', name: 'Harsh Upadhyay', role: 'ADMIN', bio: 'Founder & editor-in-chief. Cinema ko dharm maanta hoon, popcorn ko prasad.' },
  { email: 'aarav@cinemood.app', name: 'Aarav Mehta', role: 'USER', bio: 'Sci-fi aur slow-burn cinema ka aashiq. Letterboxd 4 lyf.' },
  { email: 'ishita@cinemood.app', name: 'Ishita Rao', role: 'USER', bio: 'Sound design nerd. IMAX pehle, popcorn baad mein.' },
  { email: 'kabir@cinemood.app', name: 'Kabir Sethi', role: 'USER', bio: 'Masala > pretentious. RRR 9 baar dekhi hai.' },
  { email: 'ananya@cinemood.app', name: 'Ananya Iyer', role: 'USER', bio: 'Writing about women in genre films. Occasionally crying in theatres.' },
  { email: 'rohan@cinemood.app', name: 'Rohan Verma', role: 'USER', bio: 'Third act defender. Spoilers are a love language.' },
  { email: 'mira@cinemood.app', name: 'Mira Kapoor', role: 'USER', bio: 'Animation is not a genre. Fight me politely.' }
];

const ADMIN_REVIEW = ['dune-part-two', 'admin@cinemood.app', 10, 'Sand, silence aur ek dune mein poora sultanate',
  "Yeh film ek trailer nahi, ek dhamaka hai — aur Villeneuve use dheere-dheere firaca hai. Pehle 40 minute mein aapko sirf hawa, ret aur sannata milta hai; uske baad jo battle sequence aata hai, wo pichhle dashak ke kisi bhi superhero climax se zyada bada lagta hai. Greig Fraser ka camera har frame ko oil painting bana deta hai, aur Hans Zimmer ka score aapki seat ke andar bajta hai — maine do baar apna haath armrest par kaasa hua paya. Zendaya ko finally screen time mila hai aur unhone Chani ko film ka moral compass bana diya. Austin Butler ka Feyd-Rautha genuinely darawna hai; aap usse nafrat nahi karte, aap usse darte hain. Ek hi shikayat: teesra act thoda jaldi mein khatam hota hai, jaise director ko pata tha ki studio waiting hai. Phir bhi — agar aapko 2024 mein ek hi film theatre mein dekhni ho, to yahi hai. 10/10, aur main apna admin wala card isi review par lagata hoon.", false];

const REVIEWS = [
  ['dune-part-two', 'aarav@cinemood.app', 10, 'Denis ne sci-fi ko cathedral bana diya',
    "Dune: Part Two is what happens when a studio hands a madman 190 million dollars and a sand dune. Villeneuve shoots scale the way Nolan shoots time — every wide is a painting, every whisper is a threat. Zimmer's score doesn't accompany the film, it crawls inside it. Austin Butler is genuinely unsettling, and the last 20 minutes rewire the entire first film retroactively. This is the blockbuster the decade will be measured against.", false],
  ['dune-part-two', 'ishita@cinemood.app', 9, 'IMAX sound ne mujhe kursi se chipka diya',
    "Saw it in IMAX and the sound design is the real star. The Silence of the sietch sequences, the way the score drops out right before Chani speaks — that's filmmaking with a scalpel. One star less only because part one's world-building still feels more novel; here we're inside the machine already.", false],
  ['oppenheimer', 'rohan@cinemood.app', 9, 'Three hours, zero boredom',
    "Nolan's best use of dialogue since The Prestige. The courtroom is the bomb. Cillian Murphy does almost nothing and it's devastating. The only thing that ages badly is the sex scene, which lands like a physics lecture.", false],
  ['oppenheimer', 'ananya@cinemood.app', 8, 'A horror film wearing a biopic suit',
    "The trinity sequence is silent for a reason — Nolan puts you inside the delay, inside the guilt. Emily Blunt gets one scene and detonates it. Eight, because the women in this film exist mostly as reaction shots to men thinking.", true],
  ['everything-everywhere-all-at-once', 'kabir@cinemood.app', 10, 'Metaverse ki baat karna band karo, yeh dekho',
    "I laughed for 20 minutes, cried for 10, and then sat in the car park for another 20. The googly eyes. The rocks. Ke Huy Quan deserves every award that exists and a few we invent. It's messy by design — that's the point.", false],
  ['spider-man-across-the-spider-verse', 'mira@cinemood.app', 10, 'Har frame ek wallpaper',
    "There are six distinct art styles running simultaneously and it never once collapses into noise. Gwen's universe is watercolour grief. The Spot is the best villain design of the decade. The cliffhanger is criminal but earned.", false],
  ['spider-man-across-the-spider-verse', 'aarav@cinemood.app', 9, 'Animation ko industry standard banana chahiye',
    "The kinetic editing alone is worth the ticket. Some middle-act bloat, but the ambition is staggering — you can see a hundred artists refusing to be background work.", false],
  ['top-gun-maverick', 'kabir@cinemood.app', 9, 'Practical effects supremacy',
    "No green screen can fake G-force. The third act is a masterclass in building tension with geography and silence. Yes it's propaganda for the navy, no I don't care, the flying is incredible.", false],
  ['interstellar', 'aarav@cinemood.app', 10, 'Docking sequence > any action scene ever made',
    "Ten years later and the tesseract still gives me goosebumps. Yes, the love-transcends-dimensions line is silly. Yes, the organ score fixes it. This is Nolan's most emotional film pretending to be his coldest.", false],
  ['interstellar', 'rohan@cinemood.app', 7, 'Brilliant and infuriating in equal measure',
    "The first two acts are near perfect. Then the third explains itself three times and still manages to be confusing. McConaughey's crying scene is a career best. Seven.", true],
  ['parasite', 'ananya@cinemood.app', 10, 'Genre shift ka textbook example',
    "Bong builds a comedy, then a heist, then a horror film, and every transition is invisible until you're already inside it. The rain sequence is a class war in four minutes. Nothing wasted, nothing explained twice.", false],
  ['parasite', 'ishita@cinemood.app', 9, 'Basement reveal pe theatre silent ho gaya',
    "I've seen it three times and the basement reveal still lands like a physical blow. The peach allergy is one of the smartest plot devices ever written.", true],
  ['the-batman', 'rohan@cinemood.app', 8, 'Seven ke naam pe teen ghante',
    "It's a detective film that happens to star Batman, which is exactly what we needed after a decade of punching. The photography is occasionally too dark to parse, but the Nirvana needle-drop is a shot of adrenaline.", false],
  ['the-batman', 'kabir@cinemood.app', 7, 'Mood 10/10, pacing 6/10',
    "Nobody has ever shot Gotham this oppressively — it feels like a city with a fever. But trim 25 minutes and this becomes a classic.", false],
  ['rrr', 'kabir@cinemood.app', 10, 'Cinema ki definition badal gayi',
    "The interval block. The animal VFX. The Naatu Naatu. RRR doesn't care about physics and neither should you. Rajamouli makes movies like he's got something to prove and everything to lose.", false],
  ['inception', 'aarav@cinemood.app', 9, 'Dream logic, explained once, remembered forever',
    "Still the tightest high-concept screenplay of the century. Every exposition dump is doing double duty as a set-piece. The spinning top ending is a Rorschach test and that's why it works.", false],
  ['joker', 'ananya@cinemood.app', 7, 'Performance 10, thesis 5',
    "Phoenix is doing something genuinely alien here. But the film keeps insisting that its cynicism is insight, and after the third monologue it starts to feel like a lecture from a guy who just discovered nihilism.", false],
  ['whiplash', 'ishita@cinemood.app', 10, 'Not my tempo, said the film, at my anxiety',
    "A sports movie about drumming. The editing is the performance — every cut lands on a beat. The final nine minutes are the most thrilling thing Chazelle has ever shot.", false],
  ['whiplash', 'rohan@cinemood.app', 9, 'Abuse ko genius ke naam pe mat bech',
    "Terrifying, propulsive, and morally disgusting in the best way. It knows Fletcher is a monster. I'm just not sure the audience does.", true],
  ['poor-things', 'mira@cinemood.app', 9, 'Maximalism ki jeet',
    "Lanthimos shoots a film that looks like it was designed by a pastry chef on acid. Emma Stone is fearless. The production design alone deserves its own review.", false],
  ['poor-things', 'aarav@cinemood.app', 7, 'Beautiful, exhausting',
    "Keeps the same register for 140 minutes and calls it a thesis. I admired it more than I enjoyed it, but the craftsmanship is undeniable.", false],
  ['past-lives', 'ananya@cinemood.app', 9, 'What if, ko pura film bana diya',
    "The kind of film that hurts quietly. Greta Lee does more with a pause than most actors do with a monologue. The final shot in the taxi is devastating and completely earned.", false]
];

const PENDING = [
  ['past-lives', 'rohan@cinemood.app', 8, 'In-yun: 8000 layers of restraint',
    "Slow to the point of provocation, and then the last 15 minutes justify every static frame before it. This one is still in moderation, but I needed to get the thought down.", false]
];

const COMMENT_TEXTS = [
  'Agreed on the sound design — Zimmer basically built a second film underneath this one.',
  'Hard disagree on the third act, but this is a great write-up.',
  'The IMAX re-release better happen in India or I riot.',
  'You convinced me to rewatch it tonight.',
  'This is the most accurate review on the site, hands down.',
  'Careful — this one has mild spoilers, maybe tag it?',
  'The cinematography take is spot on. Every frame is a painting.',
  'Adding this to my watchlist immediately 👍',
  'Finally someone said it about the pacing.',
  'Bhai ye review padh ke theatre wapas jaana hai.'
];

const pick = (arr, i) => arr[i % arr.length];

async function main() {
  console.log('Clearing...');
  await prisma.comment.deleteMany();
  await prisma.reviewLike.deleteMany();
  await prisma.titleLike.deleteMany();
  await prisma.review.deleteMany();
  await prisma.title.deleteMany();
  await prisma.user.deleteMany();

  const users = {};
  for (const u of USERS) {
    users[u.email] = await prisma.user.create({ data: u });
  }

  const titles = {};
  for (const [i, t] of data.entries()) {
    titles[t.slug] = await prisma.title.create({
      data: {
        slug: t.slug,
        title: t.title,
        year: t.year,
        runtime: t.runtime,
        overview: t.overview,
        poster: t.poster,
        backdrop: t.backdrop,
        genres: JSON.stringify(t.genres || []),
        director: (t.directors && t.directors[0]) || null,
        cast: JSON.stringify((t.cast || []).map((c) => ({ name: c.name, role: 'Cast' }))),
        imdbRating: t.imdbRating ? Math.round(t.imdbRating * 10) / 10 : null,
        imdbId: t.imdbId ?? null,
        featured: i === 0,
        createdAt: new Date(Date.now() - i * 36e5 * 7)
      }
    });
  }

  let reviewCount = 0;
  const createdReviews = [];
  // Admin verdict goes first and is pinned across the site
  const adminReview = await prisma.review.create({
    data: {
      rating: ADMIN_REVIEW[2],
      headline: ADMIN_REVIEW[3],
      body: ADMIN_REVIEW[4],
      spoiler: ADMIN_REVIEW[5],
      status: 'PUBLISHED',
      featured: true,
      createdAt: new Date(Date.now() - 2 * 36e5),
      userId: users[ADMIN_REVIEW[1]].id,
      titleId: titles[ADMIN_REVIEW[0]].id
    }
  });
  createdReviews.push({ r: adminReview, slug: ADMIN_REVIEW[0], email: ADMIN_REVIEW[1], createdAt: adminReview.createdAt });
  reviewCount++;

  for (const [timeline, status] of [[REVIEWS, 'PUBLISHED'], [PENDING, 'PENDING']]) {
    for (const [slug, email, rating, headline, body, spoiler] of timeline) {
      const createdAt = new Date(Date.now() - (reviewCount * 11 + 3) * 36e5);
      const r = await prisma.review.create({
        data: {
          rating,
          headline,
          body,
          spoiler,
          featured: false,
          status,
          createdAt,
          userId: users[email].id,
          titleId: titles[slug].id
        }
      });
      createdReviews.push({ r, slug, email, createdAt });
      reviewCount++;
    }
  }

  // likes: deterministic spread so the UI looks alive
  const others = USERS.filter((u) => u.email !== 'admin@cinemood.app');
  for (const [i, item] of createdReviews.entries()) {
    const likeCount = item.r.status === 'PUBLISHED' ? 1 + ((i * 3) % 6) : 0;
    for (let k = 0; k < likeCount; k++) {
      const u = others[(i + k * 2) % others.length];
      if (u.email === item.email) continue;
      await prisma.reviewLike.create({ data: { userId: users[u.email].id, reviewId: item.r.id } }).catch(() => {});
    }
    if (item.r.status === 'PUBLISHED' && i % 2 === 0) {
      const cCount = 1 + (i % 3);
      for (let c = 0; c < cCount; c++) {
        const u = others[(i + c) % others.length];
        await prisma.comment.create({
          data: {
            body: pick(COMMENT_TEXTS, i + c * 3),
            userId: users[u.email].id,
            reviewId: item.r.id,
            createdAt: new Date(item.createdAt.getTime() + (c + 1) * 45 * 60000)
          }
        });
      }
    }
  }

  // title likes + watchlists
  const titleList = Object.values(titles);
  for (const [i, t] of titleList.entries()) {
    for (let k = 0; k < 3 + ((i * 5) % 9); k++) {
      const u = others[(i + k) % others.length];
      await prisma.titleLike.create({ data: { kind: 'LIKE', userId: users[u.email].id, titleId: t.id } }).catch(() => {});
    }
    if (i % 3 === 0) {
      const u = others[(i + 2) % others.length];
      await prisma.titleLike.create({ data: { kind: 'WATCHLIST', userId: users[u.email].id, titleId: t.id } }).catch(() => {});
    }
  }

  console.log(`Seeded: ${Object.keys(users).length} users · ${titleList.length} titles · ${reviewCount} reviews`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
