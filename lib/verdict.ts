/**
 * One place that turns a 0–10 score into the words the site actually uses.
 * Editorial voice, not machine labels: SKIP → TIME-PASS → GO FOR IT → MUST WATCH → MASTERPIECE.
 */
export type VerdictTone = 'skip' | 'pass' | 'go' | 'must' | 'master';

export type Verdict = {
  label: string;
  short: string;
  tone: VerdictTone;
  line: string;
};

export function verdictFor(score: number | null | undefined): Verdict {
  const s = score ?? 0;
  if (s >= 9) {
    return { label: 'MASTERPIECE', short: 'MASTER', tone: 'master', line: 'Generational stuff — dekho, phir dobara dekho.' };
  }
  if (s >= 8) {
    return { label: 'MUST WATCH', short: 'MUST', tone: 'must', line: 'Screens par zaroor — theatre ya best screen, dono chalega.' };
  }
  if (s >= 7) {
    return { label: 'GO FOR IT', short: 'GO', tone: 'go', line: 'Paisa vasool — ek baar aaram se dekh lo.' };
  }
  if (s >= 5.5) {
    return { label: 'TIME-PASS', short: 'MEH', tone: 'pass', line: 'Bore nahi hoge, yaad bhi nahi rahegi. OTT par theek.' };
  }
  return { label: 'SKIP', short: 'SKIP', tone: 'skip', line: 'Time bacha lo — koi doosri film better hai.' };
}

/** Ring geometry for the 120×120 dial used on film pages and cards. */
export const RING = { r: 52, c: 2 * Math.PI * 52 };
