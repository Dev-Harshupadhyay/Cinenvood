export type Lang = 'en' | 'hi' | 'hinglish';

export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिंदी', short: 'हि' },
  { code: 'hinglish', label: 'Hinglish', short: 'HI' }
];

export const LANG_COOKIE = 'cm-lang';

type Dict = Record<string, { en: string; hi: string; hinglish: string }>;

const D: Dict = {
  home: { en: 'Home', hi: 'होम', hinglish: 'Home' },
  movies: { en: 'Movies', hi: 'फ़िल्में', hinglish: 'Movies' },
  reviews: { en: 'Reviews', hi: 'रिव्यू', hinglish: 'Reviews' },
  community: { en: 'Community', hi: 'कम्युनिटी', hinglish: 'Community' },
  signIn: { en: 'Sign in', hi: 'साइन इन', hinglish: 'Sign in' },
  join: { en: 'Join', hi: 'जुड़ें', hinglish: 'Join karo' },
  search: {
    en: 'Search movies, people, moods…',
    hi: 'फ़िल्म, लोग, मूड खोजें…',
    hinglish: 'Movie, banda, mood — kuch bhi search karo…'
  },
  aboutSite: { en: 'About site', hi: 'साइट के बारे में', hinglish: 'Site ke baare mein' },
  aboutDev: { en: 'About dev', hi: 'डेवलपर के बारे में', hinglish: 'Dev ke baare mein' },
  featured: { en: 'Featured title', hi: 'फ़ीचर्ड फ़िल्म', hinglish: 'Featured title' },
  readReviews: { en: 'Read reviews', hi: 'रिव्यू पढ़ें', hinglish: 'Reviews padho' },
  writeReview: { en: 'Write a review', hi: 'रिव्यू लिखें', hinglish: 'Review likho' },
  trending: { en: 'Trending this week', hi: 'इस हफ़्ते ट्रेंडिंग', hinglish: 'Sabse zyada baat ho rahi hai' },
  trendingSub: {
    en: 'Ranked by likes, reviews and comments.',
    hi: 'लाइक, रिव्यू और कमेंट के आधार पर।',
    hinglish: 'Likes, reviews aur comments ke hisaab se ranked.'
  },
  latest: { en: 'Latest reviews', hi: 'नए रिव्यू', hinglish: 'Latest reviews' },
  topRated: { en: 'Top rated', hi: 'टॉप रेटेड', hinglish: 'Top rated' },
  newArrivals: { en: 'New arrivals', hi: 'नई फ़िल्में', hinglish: 'Nayi films' },
  communityFeed: { en: 'Community feed', hi: 'कम्युनिटी फ़ीड', hinglish: 'Community feed' },
  viewAll: { en: 'View all', hi: 'सब देखें', hinglish: 'Sab dekho' },
  loginToLike: {
    en: 'Sign in with Google to like and comment.',
    hi: 'लाइक और कमेंट के लिए Google से साइन इन करें।',
    hinglish: 'Like aur comment karne ke liye Google se login karo.'
  }
};

export function t(lang: Lang, key: keyof typeof D): string {
  const row = D[key];
  if (!row) return String(key);
  return row[lang] ?? row.en;
}

export function dict(lang: Lang) {
  return new Proxy({} as Record<keyof typeof D, string>, {
    get: (_t, k: string) => t(lang, k as keyof typeof D)
  });
}
