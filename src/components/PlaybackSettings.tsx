import type { PauseMilliseconds, Rate, RepeatCount } from "../types/speech";
import { DEFAULT_PAUSE, DEFAULT_RATE, DEFAULT_REPEAT, PAUSES, RATES, REPEATS } from "../utils/sessionStore";

type Props = {
  rate: Rate;
  pauseMilliseconds: PauseMilliseconds;
  repeatCount: RepeatCount;
  onRate: (v: Rate) => void;
  onPause: (v: PauseMilliseconds) => void;
  onRepeat: (v: RepeatCount) => void;
};

export default function PlaybackSettings({ rate, pauseMilliseconds, repeatCount, onRate, onPause, onRepeat }: Props) {
  return (
    <section className="panel settings" aria-label="再生設定">
      <label>
        <span>読み上げ速度</span>
        <select value={rate} onChange={(e) => onRate(RATES.find((r) => String(r) === e.target.value) ?? DEFAULT_RATE)}>
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r.toFixed(r === 0.75 ? 2 : 1)}x
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>読み上げ間隔</span>
        <select
          value={pauseMilliseconds}
          onChange={(e) => onPause(PAUSES.find((p) => String(p) === e.target.value) ?? DEFAULT_PAUSE)}
        >
          {PAUSES.map((p) => (
            <option key={p} value={p}>
              {(p / 1000).toFixed(1)}秒
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>リピート（リスト再生）</span>
        <select
          value={repeatCount}
          onChange={(e) => onRepeat(REPEATS.find((r) => String(r) === e.target.value) ?? DEFAULT_REPEAT)}
        >
          {REPEATS.map((r) => (
            <option key={r} value={r}>
              {r}回
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
