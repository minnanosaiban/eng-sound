import { useEffect, useState } from "react";
import Header from "./components/Header";
import SourceTextPanel from "./components/SourceTextPanel";
import CurrentSelectionPanel from "./components/CurrentSelectionPanel";
import PlaybackSettings from "./components/PlaybackSettings";
import SpeechList from "./components/SpeechList";
import PlaybackControls from "./components/PlaybackControls";
import { useSpeechPlayback } from "./hooks/useSpeechPlayback";
import type {
  InputMode,
  PauseMilliseconds,
  Rate,
  RepeatCount,
  SpeechItem,
  TextSelection,
} from "./types/speech";
import { normalizeSelectedText } from "./utils/normalizeText";
import { updateSelection } from "./utils/selection";
import {
  DEFAULT_PAUSE,
  DEFAULT_RATE,
  DEFAULT_REPEAT,
  loadSession,
  saveSession,
} from "./utils/sessionStore";

const SAMPLE_TEXT =
  "A man is typing on a laptop at his desk.\nSeveral bicycles are parked along the street.";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function App() {
  const [initial] = useState(() => loadSession());
  const [sourceText, setSourceText] = useState(initial?.sourceText ?? SAMPLE_TEXT);
  // 初期サンプルを表示するので選択モードで始める（本文が空なら編集モード）
  const [inputMode, setInputMode] = useState<InputMode>(
    initial ? initial.inputMode : "select",
  );
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [speechItems, setSpeechItems] = useState<SpeechItem[]>(initial?.speechItems ?? []);
  const [rate, setRate] = useState<Rate>(initial?.rate ?? DEFAULT_RATE);
  const [pauseMilliseconds, setPause] = useState<PauseMilliseconds>(initial?.pauseMilliseconds ?? DEFAULT_PAUSE);
  const [repeatCount, setRepeat] = useState<RepeatCount>(initial?.repeatCount ?? DEFAULT_REPEAT);

  const playback = useSpeechPlayback({ rate, pauseMilliseconds, repeatCount });
  const { playbackKind, stop } = playback;

  useEffect(() => {
    saveSession({ sourceText, speechItems, inputMode, rate, pauseMilliseconds, repeatCount });
  }, [sourceText, speechItems, inputMode, rate, pauseMilliseconds, repeatCount]);

  const handleTextChange = (value: string) => {
    setSourceText(value);
    // 本文が変わるとインデックスが無効になるため選択をクリアする（追加済み項目は残す）
    setSelection(null);
  };

  const handleAdd = () => {
    if (!selection) return;
    const text = normalizeSelectedText(selection.text);
    if (text === "") return;
    setSpeechItems((items) => [...items, { id: createId(), text }]);
  };

  const handleMove = (id: string, delta: -1 | 1) => {
    setSpeechItems((items) => {
      const i = items.findIndex((x) => x.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= items.length) return items;
      const next = items.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleRemove = (id: string) => {
    // 個別再生中の項目を削除する場合は、先に再生を止める（仕様11.6）
    if (playbackKind === "item" && playback.activeItemId === id) stop();
    setSpeechItems((items) => items.filter((x) => x.id !== id));
  };

  return (
    <main className="app">
      <Header />
      {!playback.supported && (
        <p className="message error" role="alert">
          このブラウザでは音声読み上げ機能を利用できません。
        </p>
      )}
      <SourceTextPanel
        value={sourceText}
        mode={inputMode}
        disabledPlay={sourceText.trim() === ""}
        speechSupported={playback.supported}
        onChange={handleTextChange}
        onModeChange={setInputMode}
        onSelectionRead={(value, start, end) => setSelection((cur) => updateSelection(cur, value, start, end))}
        onPlayFullText={() => playback.playFullText(sourceText)}
      />
      <CurrentSelectionPanel
        selection={selection}
        speechSupported={playback.supported}
        onPlay={() => selection && playback.playSelection(selection.text)}
        onAdd={handleAdd}
        onClear={() => setSelection(null)}
      />
      <PlaybackSettings
        rate={rate}
        pauseMilliseconds={pauseMilliseconds}
        repeatCount={repeatCount}
        onRate={setRate}
        onPause={setPause}
        onRepeat={setRepeat}
      />
      <section className="panel" aria-labelledby="list-heading">
        <h2 id="list-heading">音声リスト</h2>
        <SpeechList
          items={speechItems}
          playbackKind={playbackKind}
          activeItemId={playback.activeItemId}
          speechSupported={playback.supported}
          onPlay={playback.playItem}
          onMove={handleMove}
          onRemove={handleRemove}
        />
        <PlaybackControls
          playbackKind={playbackKind}
          itemCount={speechItems.length}
          speechSupported={playback.supported}
          errorMessage={playback.errorMessage}
          noticeMessage={playback.noticeMessage}
          onPlayList={() => playback.playList(speechItems)}
          onStop={stop}
          onClearAll={() => setSpeechItems([])}
        />
      </section>
    </main>
  );
}
