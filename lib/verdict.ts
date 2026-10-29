/**
 * One place that turns a 0–10 score into the words the site actually uses.
 * Editorial voice, not machine labels: SKIP → TIME-PASS → GO FOR IT → MUST WATCH → MASTERPIECE.
 */
export type VerdictTone = 'skip' | 'pass' | 'go' | 'must' | 'master';

export type Verdict = {
  label: string;
  short: string;
  tone: VerdictTone;
  /** Hinglish one-liner (the site's home voice) */
  line: string;
  /** same line for the English edition */
  lineEn: string;
};

export function verdictFor(score: number | null | undefined): Verdict {
  const s = score ?? 0;
  if (s >= 9) {
    return {
      label: 'MASTERPIECE',
      short: 'MASTER',
      tone: 'master',
      line: 'Generational stuff — dekho, phir dobara dekho.',
      lineEn: 'Generational stuff — watch it, then watch it again.'
    };
  }
  if (s >= 8) {
    return {
      label: 'MUST WATCH',
      short: 'MUST',
      tone: 'must',
      line: 'Screens par zaroor — theatre ya best screen, dono chalega.',
      lineEn: 'Get to a screen — theatre or the best screen at home, either works.'
    };
  }
  if (s >= 7) {
    return {
      label: 'GO FOR IT',
      short: 'GO',
      tone: 'go',
      line: 'Paisa vasool — ek baar aaram se dekh lo.',
      lineEn: 'Worth the money — one relaxed watch does it.'
    };
  }
  if (s >= 5.5) {
    return {
      label: 'TIME-PASS',
      short: 'MEH',
      tone: 'pass',
      line: 'Bore nahi hoge, yaad bhi nahi rahegi. OTT par theek.',
      lineEn: 'You will not be bored, you will not remember it. Fine on OTT.'
    };
  }
  return {
    label: 'SKIP',
    short: 'SKIP',
    tone: 'skip',
    line: 'Time bacha lo — koi doosri film better hai.',
    lineEn: 'Save your time — some other film is a better bet.'
  };
}

/** Ring geometry for the 120×120 dial used on film pages and cards. */
export const RING = { r: 52, c: 2 * Math.PI * 52 };
