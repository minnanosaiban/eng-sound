function normalizeLang(lang: string): string {
  return lang.replace(/_/g, "-").toLowerCase();
}

// 端末内・オンラインは区別しない（仕様12.2）
export function pickVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const exact = voices.find((v) => normalizeLang(v.lang) === "en-us");
  if (exact) return exact;
  const enUs = voices.find((v) => normalizeLang(v.lang).startsWith("en-us"));
  if (enUs) return enUs;
  return voices.find((v) => normalizeLang(v.lang).startsWith("en"));
}
