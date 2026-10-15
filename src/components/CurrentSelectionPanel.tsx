import type { TextSelection } from "../types/speech";
import { normalizeSelectedText } from "../utils/normalizeText";

type Props = {
  selection: TextSelection | null;
  speechSupported: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onClear: () => void;
};

// aria-live は付けない（選択のたびに読み上げられ操作の妨げになるため。仕様18章）
export default function CurrentSelectionPanel({ selection, speechSupported, onPlay, onAdd, onClear }: Props) {
  const text = selection ? normalizeSelectedText(selection.text) : "";
  const empty = text === "";
  return (
    <section className="panel" aria-labelledby="selection-heading">
      <h2 id="selection-heading">現在の選択</h2>
      <div className="selection-row">
        <p className="selection-text">{empty ? "（未選択）" : text}</p>
        <button type="button" className="icon-btn" aria-label="選択を解除" onClick={onClear} disabled={empty}>
          ✕
        </button>
      </div>
      <div className="button-row">
        <button type="button" className="btn primary" onClick={onPlay} disabled={empty || !speechSupported}>
          選択部分を再生
        </button>
        <button type="button" className="btn primary" onClick={onAdd} disabled={empty}>
          音声リストに追加
        </button>
      </div>
    </section>
  );
}
