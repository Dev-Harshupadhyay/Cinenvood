export type VoiceSample = { body: string; sourceLang: string | null };

/** A lightweight per-request voice guide; this does not fine-tune or persist model weights. */
export function deriveOwnerVoiceGuide(samples: VoiceSample[]) {
  const sentences = samples.flatMap((sample) => sample.body.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean));
  const sentenceWordCounts = sentences.map((sentence) => sentence.split(/\s+/).filter(Boolean).length).filter((count) => count > 0);
  const averageSentenceWords = sentenceWordCounts.length
    ? Math.round(sentenceWordCounts.reduce((sum, count) => sum + count, 0) / sentenceWordCounts.length)
    : 14;
  const languageCounts = samples.reduce<Record<string, number>>((counts, sample) => {
    const language = sample.sourceLang?.toLowerCase();
    if (language) counts[language] = (counts[language] ?? 0) + 1;
    return counts;
  }, {});
  const dominantLanguage = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'mixed Hinglish and English';
  const punctuation = samples.reduce((counts, sample) => ({
    exclamations: counts.exclamations + (sample.body.match(/!/g)?.length ?? 0),
    dashes: counts.dashes + (sample.body.match(/[—–]/g)?.length ?? 0)
  }), { exclamations: 0, dashes: 0 });
  return [
    `Most samples are tagged ${dominantLanguage}.`,
    `Observed sentence length averages about ${averageSentenceWords} words; use a similar short-to-medium cadence.`,
    `Across the samples there are ${punctuation.exclamations} exclamation marks and ${punctuation.dashes} em/en dashes; follow the owner's restraint or energy rather than adding generic hype.`,
    'Match the real examples in warmth, directness, paragraph flow, code-switching and verdict confidence. Do not imitate exact phrases or repeat a fixed review template.'
  ].join(' ');
}
