import Link from 'next/link';

export const metadata = {
  title: 'FAQ',
  description:
    'CINE·MOOD FAQ — reviews, ratings, Hinglish and English editions, accounts, privacy, and how supporting the developer works.',
  alternates: { canonical: '/faq' }
};

type QA = { q: string; a: React.ReactNode };

const GROUPS: { title: string; intro?: string; items: QA[] }[] = [
  {
    title: 'The basics',
    items: [
      {
        q: 'CINE·MOOD kya hai?',
        a: (
          <>
            Ek film discovery aur review platform. Yahan aap films dhoondh sakte ho, 10-point scale par rating de sakte
            ho, review likh sakte ho, aur doosron ke reviews par <b>Agree</b> ya reply kar sakte ho. Metadata TMDB se
            aata hai; verdict logon ka hota hai.
          </>
        )
      },
      {
        q: 'Kya yahan movies download kar sakte hain?',
        a: (
          <>
            <b>Nahi — kabhi nahi.</b> Na torrent, na mirror, na file links. Sirf reviews, ratings aur discussion.
            Yahi wajah hai ki site legal reh sakti hai aur long run mein chalti hai. Legal details{' '}
            <Link href="/legal">Legal &amp; DMCA</Link> page par hain.
          </>
        )
      },
      {
        q: 'Ye website kiske liye hai?',
        a: (
          <>
            Un logon ke liye jo film dekhne se pehle ya baad mein ek honest opinion chahte hain — bina spoiler ke.
            Khaas taur par Indian audience ke liye, jo Hinglish mein padhna chahti hai, par international readers ke
            liye English edition bhi maujood hai.
          </>
        )
      }
    ]
  },
  {
    title: 'Reviews & ratings',
    items: [
      {
        q: 'Rating kaise kaam karti hai?',
        a: (
          <>
            10-point scale. Score ke saath ek verdict band lagta hai:{' '}
            <span className="mono">≥9 MASTERPIECE · ≥8 MUST WATCH · ≥7 GO FOR IT · ≥5.5 TIME-PASS · else SKIP</span>.
            Score review ke <b>end</b> mein dikhta hai — pehle aap review padhte ho, phir number dekhte ho.
          </>
        )
      },
      {
        q: 'Ek film par kya ek se zyada review de sakta hoon?',
        a: <>Nahi — ek account, ek film, ek review. Aap use jab chaaho edit kar sakte ho; edit par purana text replace ho jaata hai.</>
      },
      {
        q: 'Spoilers?',
        a: <>Review likhte waqt “Contains spoilers” tick kar sakte ho. Reader ko text blur dikhta hai aur wo khud reveal karta hai.</>
      },
      {
        q: '“Agree” aur “Replies” kya hain?',
        a: <>Agree = like (support dikhane ke liye), Replies = us review ke comments. Dono ke liye login chahiye.</>
      },
      {
        q: 'Editorial verdict, admin verdict aur member review mein farq?',
        a: (
          <>
            <b>Editorial</b> — site ki taraf se likha gaya verdict (gold card, “FOUNDER · EDITOR-IN-CHIEF”).{' '}
            <b>Admin verdict</b> — admin ka apna review. <b>Member review</b> — kisi member ka review, apne Agree +
            Replies ke saath. Admin kisi bhi review ko home page ke top slot par laga sakta hai; purana verdict backup
            mein rehta hai.
          </>
        )
      }
    ]
  },
  {
    title: 'Hinglish, English aur Jarvis',
    items: [
      {
        q: 'Hinglish aur English edition kaise chunte hain?',
        a: (
          <>
            Reviews page par <b>Hinglish / English</b> toggle hai. Aap kuch na chuno to India se Hinglish aur bahar se
            English default hota hai (IP country se). Choice cookie mein yaad rehti hai.
          </>
        )
      },
      {
        q: 'Mera Hinglish review English walon ko kaise dikhega?',
        a: (
          <>
            Review save hote hi uska dusra language version ban jaata hai (Gemini se). English wafer ke liye same
            opinion, same order — bas language alag. Jo review purane hain aur unka translation nahi hai, unme original
            dikhta hai aur “original in Hinglish” note aata hai.
          </>
        )
      },
      {
        q: 'Jarvis kaun hai?',
        a: (
          <>
            <b>Jarvis</b> site ka AI writing assistant hai. Editorial drafts (Hinglish + English) house style mein
            likhta hai; byline tab <b>“Review by Jarvis”</b> hoti hai taaki reader ko saaf pata rahe ki text AI ne
            likha hai. Har AI draft publish karne se pehle admin padhta hai — bina check kuch publish nahi hota.
          </>
        )
      }
    ]
  },
  {
    title: 'Account & privacy',
    items: [
      {
        q: 'Login kaise hota hai?',
        a: <>Production mein sirf <b>Google login</b>. Guest mode read-only hai — padh sakte ho, likhne ke liye sign in karna padta hai. Koi password store nahi hota.</>
      },
      {
        q: 'Profile photo change kar sakta hoon?',
        a: (
          <>
            Haan. Dashboard → <b>Profile</b> (ya header menu → Edit profile). Google photo, apni upload (256×256 par
            auto-resize) ya initials — jo chuno. Aapki chuni hui photo dobara login karne par bhi bani rehti hai.
          </>
        )
      },
      {
        q: 'Kya mera data bech rahe ho?',
        a: <>Nahi. Koi ads nahi, koi third-party tracker nahi. Analytics first-party hai — sirf page views aur device type, usi database mein.</>
      },
      {
        q: 'Account delete karwana hai?',
        a: <>Legal page par contact hai — apna email likh ke bhejo, review + account hata diya jaayega.</>
      }
    ]
  },
  {
    title: 'Support & donations',
    items: [
      {
        q: 'Site free hai to donate kyun?',
        a: (
          <>
            Hosting, database aur TMDB/OMDb ki limits ka kharcha hai. Site <b>non-profit</b> hai — jo aata hai wo server
            bill mein jaata hai. Donation optional hai, koi feature paywall ke peeche nahi hai.
          </>
        )
      },
      {
        q: 'Kaunse tareeke se pay kar sakta hoon?',
        a: (
          <>
            UPI (<span className="mono">pmharsh@fam</span>) — QR scan ya button se, amount 25/50/100 ya custom. Ya{' '}
            <a href="https://razorpay.me/@pmharsh" target="_blank" rel="noreferrer">Razorpay</a> se card/netbanking.
            Poora tareeka <Link href="/support">Support page</Link> par.
          </>
        )
      },
      {
        q: 'Kya donation ka receipt milta hai?',
        a: <>Ye personal support hai, registered NGO donation nahi — isliye 80G receipt nahi milta. UPI app ka payment history aapka proof hai.</>
      },
      {
        q: 'Kya main bina paise ke help kar sakta hoon?',
        a: <>Bilkul — review likho, doston ko bhejo, ya bug batao. Content hi site ka asli fuel hai.</>
      }
    ]
  },
  {
    title: 'Contact',
    items: [
      {
        q: 'Kisi se baat karni hai?',
        a: (
          <>
            Telegram channel join karo ya <Link href="/support">Support page</Link> se dev tak pahuncho. Site-related
            bugs aur film suggestions dono welcome hain.
          </>
        )
      }
    ]
  }
];

export default function FaqPage() {
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 900 }}>
      <div className="eyebrow">FAQ · {total} answers</div>
      <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', marginBottom: 8 }}>
        Sab sawaal, seedhe jawab<span style={{ color: 'var(--accent)' }}>.</span>
      </h1>
      <p className="muted" style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 22, maxWidth: 640 }}>
        Reviews, ratings, language editions, account, privacy aur support — jo sabse zyada poocha jaata hai.
      </p>

      <div className="faq-jump">
        {GROUPS.map((g) => (
          <a key={g.title} href={`#${g.title.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
            {g.title}
          </a>
        ))}
      </div>

      {GROUPS.map((g) => (
        <section key={g.title} id={g.title.toLowerCase().replace(/[^a-z]+/g, '-')} className="faq-group">
          <h2>{g.title}</h2>
          {g.items.map((item, i) => (
            <details key={item.q} className="faq-item" name={`faq-${g.title}`} open={i === 0 && g.title === 'The basics'}>
              <summary>
                <span>{item.q}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="faq-a">{item.a}</div>
            </details>
          ))}
        </section>
      ))}

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel-title"><span>Answer nahi mila?</span></div>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.8, marginTop: 0 }}>
          Support page par dev ka UPI, Razorpay aur Telegram — teeno ek jagah hain. Bug report ya film suggestion
          ke liye Telegram sabse fast hai.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/support" className="btn btn-primary btn-sm">Support &amp; contact</Link>
          <Link href="/about" className="btn btn-sm btn-ghost">About the site</Link>
        </div>
      </div>
    </div>
  );
}
