export type TextSelection = {
  start: number;
  end: number;
  text: string;
};

export type SpeechItem = {
  id: string;
  text: string;
};

export type SpeakResult =
  | { status: "ended" }
  | { status: "timeout" }
  | { status: "interrupted" }
  | { status: "error"; error: string };

export type Rate = 0.5 | 0.75 | 1.0;
export type PauseMilliseconds = 500 | 1000 | 1500 | 2000;
export type RepeatCount = 1 | 3 | 5;
export type InputMode = "edit" | "select";
export type PlaybackKind = "none" | "selection" | "item" | "list" | "fullText";

export type AppState = {
  sourceText: string;
  inputMode: InputMode;
  selection: TextSelection | null;
  speechItems: SpeechItem[];
  rate: Rate;
  pauseMilliseconds: PauseMilliseconds;
  repeatCount: RepeatCount;
  playbackKind: PlaybackKind;
  playingListSnapshot: SpeechItem[] | null;
  activeItemId: string | null;
  errorMessage: string | null;
  noticeMessage: string | null;
};
