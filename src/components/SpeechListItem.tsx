import type { SpeechItem } from "../types/speech";

type Props = {
  item: SpeechItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isActive: boolean;
  listPlaying: boolean;
  speechSupported: boolean;
  onPlay: (item: SpeechItem) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
};

export default function SpeechListItem({
  item,
  index,
  isFirst,
  isLast,
  isActive,
  listPlaying,
  speechSupported,
  onPlay,
  onMove,
  onRemove,
}: Props) {
  return (
    <li className={isActive ? "item active" : "item"} aria-current={isActive ? "true" : undefined}>
      <span className="item-no">{index + 1}.</span>
      <span className="item-text">{item.text}</span>
      {isActive && <span className="badge">▶ 再生中</span>}
      <span className="item-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label={`「${item.text}」を再生`}
          onClick={() => onPlay(item)}
          disabled={!speechSupported}
        >
          ▶
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={`「${item.text}」を上へ移動`}
          onClick={() => onMove(item.id, -1)}
          disabled={isFirst || listPlaying}
        >
          ↑
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={`「${item.text}」を下へ移動`}
          onClick={() => onMove(item.id, 1)}
          disabled={isLast || listPlaying}
        >
          ↓
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={`「${item.text}」を削除`}
          onClick={() => onRemove(item.id)}
          disabled={listPlaying}
        >
          🗑
        </button>
      </span>
    </li>
  );
}
