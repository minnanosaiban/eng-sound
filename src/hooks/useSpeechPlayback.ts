import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PauseMilliseconds,
  PlaybackKind,
  Rate,
  RepeatCount,
  SpeakResult,
  SpeechItem,
} from "../types/speech";
import { normalizeSelectedText } from "../utils/normalizeText";
import { splitForFullText } from "../utils/splitForFullText";
import { pickVoice } from "../utils/voice";

export type PlaybackSettings = {
  rate: Rate;
  pauseMilliseconds: PauseMilliseconds;
  repeatCount: RepeatCount;
};

export const START_DELAY_MS = 50;
export const TIMEOUT_NOTICE = "読み上げが途中で止まった可能性があります";
const ERROR_PREFIX = "読み上げに失敗しました";

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

type SpeakOptions = {
  rate: number;
  voice?: SpeechSynthesisVoice;
  utteranceRef: { current: SpeechSynthesisUtterance | null };
  guardTimerRef: { current: number | null };
  // 停止時に未解決の発話を「中断」として確定させるための参照
  settleRef: { current: ((result: SpeakResult) => void) | null };
};

function speakText(text: string, options: SpeakOptions): Promise<SpeakResult> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate;
    if (options.voice) {
      utterance.voice = options.voice;
      utterance.lang = options.voice.lang;
    } else {
      utterance.lang = "en-US";
    }

    let settled = false;
    const finish = (result: SpeakResult) => {
      if (settled) return;
      settled = true;
      if (options.guardTimerRef.current !== null) {
        clearTimeout(options.guardTimerRef.current);
        options.guardTimerRef.current = null;
      }
      if (options.utteranceRef.current === utterance) options.utteranceRef.current = null;
      if (options.settleRef.current === finish) options.settleRef.current = null;
      resolve(result);
    };

    utterance.onend = () => finish({ status: "ended" });
    utterance.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") {
        finish({ status: "interrupted" });
      } else {
        finish({ status: "error", error: event.error });
      }
    };

    // onend が届かない場合の保険。通常の進行・休止の制御には使わない
    const limitMs = (3000 + text.length * 200) / options.rate;
    options.guardTimerRef.current = window.setTimeout(() => {
      window.speechSynthesis.cancel();
      finish({ status: "timeout" });
    }, limitMs);

    options.utteranceRef.current = utterance;
    options.settleRef.current = finish;
    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      finish({ status: "error", error: e instanceof Error ? e.message : "speak-failed" });
    }
  });
}

export function useSpeechPlayback(settings: PlaybackSettings) {
  const [playbackKind, setPlaybackKind] = useState<PlaybackKind>("none");
  const [playingListSnapshot, setPlayingListSnapshot] = useState<SpeechItem[] | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const sessionRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const guardTimerRef = useRef<number | null>(null);
  const settleRef = useRef<((result: SpeakResult) => void) | null>(null);
  const waitTimerRef = useRef<number | null>(null);
  const waitResolveRef = useRef<(() => void) | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const supported = isSpeechSupported();

  // 音声一覧は非同期に読み込まれる場合があるため、初回と voiceschanged の両方を扱う
  useEffect(() => {
    if (!isSpeechSupported()) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  const resetPlayingState = useCallback(() => {
    setPlaybackKind("none");
    setPlayingListSnapshot(null);
    setActiveItemId(null);
  }, []);

  /** 停止処理（仕様13.5） */
  const stop = useCallback(() => {
    sessionRef.current += 1;
    if (isSpeechSupported()) window.speechSynthesis.cancel();
    if (waitTimerRef.current !== null) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    // 休止中の待機を解決して、古い非同期処理がセッション確認で終了できるようにする
    const resolveWait = waitResolveRef.current;
    waitResolveRef.current = null;
    resolveWait?.();
    if (guardTimerRef.current !== null) {
      clearTimeout(guardTimerRef.current);
      guardTimerRef.current = null;
    }
    utteranceRef.current = null;
    const settle = settleRef.current;
    settleRef.current = null;
    settle?.({ status: "interrupted" });
    resetPlayingState();
  }, [resetPlayingState]);

  const wait = useCallback((ms: number): Promise<void> => {
    return new Promise((resolve) => {
      waitResolveRef.current = resolve;
      waitTimerRef.current = window.setTimeout(() => {
        waitTimerRef.current = null;
        waitResolveRef.current = null;
        resolve();
      }, ms);
    });
  }, []);

  /** 1発話を再生し、続行してよいか返す */
  const speakOne = useCallback(
    async (text: string, session: number): Promise<boolean> => {
      const result = await speakText(text, {
        rate: settingsRef.current.rate,
        voice: pickVoice(voicesRef.current),
        utteranceRef,
        guardTimerRef,
        settleRef,
      });
      if (session !== sessionRef.current) return false;
      switch (result.status) {
        case "ended":
          return true;
        case "timeout":
          setNoticeMessage(TIMEOUT_NOTICE);
          return true;
        case "interrupted":
          return false;
        case "error":
          setErrorMessage(`${ERROR_PREFIX}（${result.error}）`);
          return false;
      }
    },
    [],
  );

  /** 排他的な再生開始（仕様13.1） */
  const begin = useCallback(
    async (
      kind: Exclude<PlaybackKind, "none">,
      options: {
        snapshot?: SpeechItem[];
        activeId?: string;
        run: (session: number) => Promise<void>;
      },
    ) => {
      if (!isSpeechSupported()) return;
      stop();
      const session = ++sessionRef.current;
      setErrorMessage(null);
      setNoticeMessage(null);
      setPlaybackKind(kind);
      setPlayingListSnapshot(options.snapshot ?? null);
      setActiveItemId(options.activeId ?? null);

      // Safari で cancel() 直後の speak() が無視される問題への対策
      await wait(START_DELAY_MS);
      if (session !== sessionRef.current) return;

      await options.run(session);
      if (session === sessionRef.current) resetPlayingState();
    },
    [stop, wait, resetPlayingState],
  );

  const playSelection = useCallback(
    (rawText: string) => {
      const text = normalizeSelectedText(rawText);
      if (text === "") return;
      void begin("selection", {
        run: async (session) => {
          await speakOne(text, session);
        },
      });
    },
    [begin, speakOne],
  );

  const playItem = useCallback(
    (item: SpeechItem) => {
      const text = normalizeSelectedText(item.text);
      if (text === "") return;
      void begin("item", {
        activeId: item.id,
        run: async (session) => {
          await speakOne(text, session);
        },
      });
    },
    [begin, speakOne],
  );

  const playList = useCallback(
    (items: SpeechItem[]) => {
      const snapshot = items.filter((i) => normalizeSelectedText(i.text) !== "").map((i) => ({ ...i }));
      if (snapshot.length === 0) return;
      void begin("list", {
        snapshot,
        run: async (session) => {
          const { repeatCount } = settingsRef.current;
          for (let set = 0; set < repeatCount; set++) {
            for (let i = 0; i < snapshot.length; i++) {
              const item = snapshot[i];
              setActiveItemId(item.id);
              if (!(await speakOne(normalizeSelectedText(item.text), session))) return;
              const isLast = set === repeatCount - 1 && i === snapshot.length - 1;
              if (isLast) return;
              await wait(settingsRef.current.pauseMilliseconds);
              if (session !== sessionRef.current) return;
            }
          }
        },
      });
    },
    [begin, speakOne, wait],
  );

  const playFullText = useCallback(
    (rawText: string) => {
      const chunks = splitForFullText(rawText);
      if (chunks.length === 0) return;
      void begin("fullText", {
        run: async (session) => {
          for (const chunk of chunks) {
            if (!(await speakOne(chunk, session))) return;
          }
        },
      });
    },
    [begin, speakOne],
  );

  // 画面が非表示になったら停止する（仕様13.10）
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stop]);

  // 破棄時に進行中の読み上げとタイマーを止める（仕様13.7）
  useEffect(() => stop, [stop]);

  return {
    supported,
    playbackKind,
    playingListSnapshot,
    activeItemId,
    errorMessage,
    noticeMessage,
    playSelection,
    playItem,
    playList,
    playFullText,
    stop,
  };
}
