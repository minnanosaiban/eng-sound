import { useEffect, useRef } from "react";
import type { InputMode } from "../types/speech";

type Props = {
  value: string;
  mode: InputMode;
  disabledPlay: boolean;
  speechSupported: boolean;
  onChange: (value: string) => void;
  onModeChange: (mode: InputMode) => void;
  onSelectionRead: (value: string, start: number, end: number) => void;
  onPlayFullText: () => void;
};

export default function SourceTextPanel({
  value,
  mode,
  disabledPlay,
  speechSupported,
  onChange,
  onModeChange,
  onSelectionRead,
  onPlayFullText,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const readRef = useRef(onSelectionRead);
  readRef.current = onSelectionRead;

  const read = () => {
    const el = ref.current;
    if (el) readRef.current(el.value, el.selectionStart, el.selectionEnd);
  };

  // スマートフォンでは textarea 側のイベントが届かない場合があるため併用する（仕様9.2）
  useEffect(() => {
    const onSelectionChange = () => {
      const el = ref.current;
      if (el && document.activeElement === el) {
        readRef.current(el.value, el.selectionStart, el.selectionEnd);
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  return (
    <section className="panel" aria-labelledby="source-heading">
      <div className="panel-head">
        <h2 id="source-heading">英文</h2>
        <div className="mode-toggle" role="group" aria-label="入力モード">
          <button
            type="button"
            className="toggle"
            aria-pressed={mode === "edit"}
            onClick={() => onModeChange("edit")}
          >
            編集
          </button>
          <button
            type="button"
            className="toggle"
            aria-pressed={mode === "select"}
            onClick={() => onModeChange("select")}
          >
            選択
          </button>
        </div>
      </div>
      <textarea
        ref={ref}
        className="source"
        rows={7}
        value={value}
        readOnly={mode === "select"}
        aria-label="英文"
        placeholder="ここに英文または単語リストを貼り付けてください"
        spellCheck={false}
        onChange={(e) => {
          if (mode === "edit") onChange(e.target.value);
        }}
        onPaste={() => {
          // 貼り付けの反映後に選択モードへ切り替える（仕様9.6）
          window.setTimeout(() => onModeChange("select"), 0);
        }}
        onSelect={read}
        onMouseUp={read}
        onKeyUp={read}
        onTouchEnd={read}
      />
      <p className="hint">
        {mode === "edit"
          ? "編集モード：貼り付け・修正ができます。"
          : "選択モード：範囲を選ぶとキーボードは表示されません。"}
      </p>
      <button
        type="button"
        className="btn subtle"
        onClick={onPlayFullText}
        disabled={disabledPlay || !speechSupported}
      >
        全文を再生
      </button>
    </section>
  );
}
