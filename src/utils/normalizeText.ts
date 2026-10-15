// 句読点は除去しない（street と street. の聞き比べのため）
export function normalizeSelectedText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}
