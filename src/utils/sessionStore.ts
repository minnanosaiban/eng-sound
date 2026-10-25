import type {
  InputMode,
  PauseMilliseconds,
  Rate,
  RepeatCount,
  SpeechItem,
} from "../types/speech";

export const SESSION_KEY = "english-sound-selector:session";

export const RATES: readonly Rate[] = [0.5, 0.75, 1.0];
export const PAUSES: readonly PauseMilliseconds[] = [500, 1000, 1500, 2000, 3000, 4000, 5000];
export const REPEATS: readonly RepeatCount[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type StoredSession = {
  sourceText: string;
  speechItems: SpeechItem[];
  inputMode: InputMode;
  rate: Rate;
  pauseMilliseconds: PauseMilliseconds;
  repeatCount: RepeatCount;
};

export const DEFAULT_RATE: Rate = 1.0;
export const DEFAULT_PAUSE: PauseMilliseconds = 1000;
export const DEFAULT_REPEAT: RepeatCount = 1;

function pick<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((o) => o === value) ?? fallback;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSpeechItem(v: unknown): v is SpeechItem {
  return isRecord(v) && typeof v.id === "string" && typeof v.text === "string";
}

/** 読み込めない・不正な場合は null（呼び出し側が初期状態で起動する） */
export function loadSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return null;
    if (typeof data.sourceText !== "string") return null;
    if (!Array.isArray(data.speechItems) || !data.speechItems.every(isSpeechItem)) return null;
    if (data.inputMode !== "edit" && data.inputMode !== "select") return null;
    return {
      sourceText: data.sourceText,
      speechItems: data.speechItems.map((i) => ({ id: i.id, text: i.text })),
      inputMode: data.inputMode,
      // 選択肢にない値は、その項目だけ初期値にする（仕様22.3）
      rate: pick(RATES, data.rate, DEFAULT_RATE),
      pauseMilliseconds: pick(PAUSES, data.pauseMilliseconds, DEFAULT_PAUSE),
      repeatCount: pick(REPEATS, data.repeatCount, DEFAULT_REPEAT),
    };
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // 保存できなくてもアプリは通常どおり動作させる
  }
}
