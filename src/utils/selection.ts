import type { TextSelection } from "../types/speech";
import { normalizeSelectedText } from "./normalizeText";

/**
 * textarea の選択状態から保持中の選択を更新する。
 * 長さ0（選択解除）や空白だけの範囲では、保持中の選択をクリアせず維持する（仕様9.3）。
 */
export function updateSelection(
  current: TextSelection | null,
  value: string,
  start: number,
  end: number,
): TextSelection | null {
  if (end <= start) return current;
  const text = value.slice(start, end);
  if (normalizeSelectedText(text) === "") return current;
  if (current && current.start === start && current.end === end && current.text === text) {
    return current;
  }
  return { start, end, text };
}
