// 改行、および文末記号（. ! ?）の直後の空白で区切る（仕様13.9）
export function splitForFullText(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter((part) => part !== "");
}
