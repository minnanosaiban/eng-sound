import type { PlaybackKind, SpeechItem } from "../types/speech";
import SpeechListItem from "./SpeechListItem";

type Props = {
  items: SpeechItem[];
  playbackKind: PlaybackKind;
  activeItemId: string | null;
  speechSupported: boolean;
  onPlay: (item: SpeechItem) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
};

export default function SpeechList({ items, playbackKind, activeItemId, speechSupported, onPlay, onMove, onRemove }: Props) {
  if (items.length === 0) {
    return <p className="empty">音声リストは空です。英文から範囲を選んで追加してください。</p>;
  }
  // 無効化の判定は isPlaying ではなく playbackKind === "list"（仕様11.6）
  const listPlaying = playbackKind === "list";
  return (
    <ol className="speech-list">
      {items.map((item, i) => (
        <SpeechListItem
          key={item.id}
          item={item}
          index={i}
          isFirst={i === 0}
          isLast={i === items.length - 1}
          isActive={activeItemId === item.id && (playbackKind === "list" || playbackKind === "item")}
          listPlaying={listPlaying}
          speechSupported={speechSupported}
          onPlay={onPlay}
          onMove={onMove}
          onRemove={onRemove}
        />
      ))}
    </ol>
  );
}
