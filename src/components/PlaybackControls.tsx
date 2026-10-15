import type { PlaybackKind } from "../types/speech";

type Props = {
  playbackKind: PlaybackKind;
  itemCount: number;
  speechSupported: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
  onPlayList: () => void;
  onStop: () => void;
  onClearAll: () => void;
};

const KIND_LABEL: Record<PlaybackKind, string> = {
  none: "停止中",
  selection: "選択部分を再生中",
  item: "項目を再生中",
  list: "リストを再生中",
  fullText: "全文を再生中",
};

export default function PlaybackControls({
  playbackKind,
  itemCount,
  speechSupported,
  errorMessage,
  noticeMessage,
  onPlayList,
  onStop,
  onClearAll,
}: Props) {
  const isPlaying = playbackKind !== "none";
  return (
    <div className="controls">
      <div className="button-row">
        <button type="button" className="btn primary" onClick={onPlayList} disabled={itemCount === 0 || !speechSupported}>
          リストを再生
        </button>
        <button type="button" className="btn stop" onClick={onStop} disabled={!isPlaying}>
          ■ 停止
        </button>
        <button
          type="button"
          className="btn subtle"
          onClick={onClearAll}
          disabled={itemCount === 0 || playbackKind === "list"}
        >
          すべて削除
        </button>
      </div>
      <p className="status" aria-live="polite">
        {KIND_LABEL[playbackKind]}
      </p>
      <div aria-live="polite">
        {errorMessage && <p className="message error">⚠ {errorMessage}</p>}
        {noticeMessage && <p className="message notice">ℹ {noticeMessage}</p>}
      </div>
    </div>
  );
}
