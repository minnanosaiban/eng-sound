import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { START_DELAY_MS, TIMEOUT_NOTICE, useSpeechPlayback } from "./useSpeechPlayback";
import type { PlaybackSettings } from "./useSpeechPlayback";

class MockUtterance {
  text: string;
  rate = 1;
  lang = "";
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

let spoken: MockUtterance[];
let cancel: ReturnType<typeof vi.fn>;
let events: string[];

const settings: PlaybackSettings = { rate: 1.0, pauseMilliseconds: 1000, repeatCount: 1 };

beforeEach(() => {
  vi.useFakeTimers();
  spoken = [];
  events = [];
  cancel = vi.fn(() => events.push("cancel"));
  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speak: vi.fn((u: MockUtterance) => {
        events.push("speak");
        spoken.push(u);
      }),
      cancel,
      getVoices: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const end = (i: number) => act(async () => { spoken[i].onend?.(); await Promise.resolve(); });
const items = [
  { id: "a", text: "desk" },
  { id: "b", text: "street" },
];

describe("useSpeechPlayback", () => {
  it("waits after cancel before speak, and sets playbackKind", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playSelection("  desk \n"));
    expect(result.current.playbackKind).toBe("selection");
    expect(spoken).toHaveLength(0);
    expect(events.indexOf("cancel")).toBeGreaterThanOrEqual(0);
    await advance(START_DELAY_MS);
    expect(spoken.map((u) => u.text)).toEqual(["desk"]);
    await end(0);
    expect(result.current.playbackKind).toBe("none");
  });

  it("rejects empty text", () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playSelection("  \n "));
    expect(result.current.playbackKind).toBe("none");
  });

  it("does not speak the earlier playback when another starts during the wait", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playSelection("one"));
    await advance(10);
    act(() => result.current.playSelection("two"));
    await advance(START_DELAY_MS + 10);
    expect(spoken.map((u) => u.text)).toEqual(["two"]);
  });

  it("plays list items independently with pauses, repeats, and clears state", async () => {
    const { result } = renderHook(() => useSpeechPlayback({ ...settings, repeatCount: 3 }));
    act(() => result.current.playList(items));
    expect(result.current.playbackKind).toBe("list");
    expect(result.current.playingListSnapshot).toEqual(items);
    await advance(START_DELAY_MS);
    expect(spoken.map((u) => u.text)).toEqual(["desk"]);
    expect(result.current.activeItemId).toBe("a");
    await end(0);
    await advance(999);
    expect(spoken).toHaveLength(1); // 休止中
    await advance(1);
    expect(spoken.map((u) => u.text)).toEqual(["desk", "street"]);
    for (let i = 1; i < 6; i++) {
      await end(i);
      await advance(1000);
    }
    expect(spoken.map((u) => u.text)).toEqual(["desk", "street", "desk", "street", "desk", "street"]);
    await end(5);
    expect(result.current.playbackKind).toBe("none");
    expect(result.current.playingListSnapshot).toBeNull();
    expect(result.current.activeItemId).toBeNull();
  });

  it("applies repeat only to list playback", async () => {
    const { result } = renderHook(() => useSpeechPlayback({ ...settings, repeatCount: 5 }));
    act(() => result.current.playItem(items[0]));
    await advance(START_DELAY_MS);
    await end(0);
    await advance(5000);
    expect(spoken).toHaveLength(1);
  });

  it("stop during pause prevents later items and clears timers", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playList(items));
    await advance(START_DELAY_MS);
    await end(0);
    act(() => result.current.stop());
    await advance(5000);
    expect(spoken).toHaveLength(1);
    expect(result.current.playbackKind).toBe("none");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stop during speech cancels and leaves no guard timer", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playSelection("desk"));
    await advance(START_DELAY_MS);
    cancel.mockClear();
    act(() => result.current.stop());
    expect(cancel).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current.errorMessage).toBeNull();
  });

  it("treats interrupted/canceled errors as non-errors", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playSelection("desk"));
    await advance(START_DELAY_MS);
    await act(async () => { spoken[0].onerror?.({ error: "interrupted" }); await Promise.resolve(); });
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.playbackKind).toBe("none");
  });

  it("shows an error for real errors and allows retry", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playSelection("desk"));
    await advance(START_DELAY_MS);
    await act(async () => { spoken[0].onerror?.({ error: "synthesis-failed" }); await Promise.resolve(); });
    expect(result.current.errorMessage).toContain("synthesis-failed");
    expect(result.current.playbackKind).toBe("none");
    act(() => result.current.playSelection("desk"));
    await advance(START_DELAY_MS);
    expect(spoken).toHaveLength(2);
    expect(result.current.errorMessage).toBeNull();
  });

  it("guard timer moves on and shows a notice when onend never arrives; settles once", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playList(items));
    await advance(START_DELAY_MS);
    await advance(3000 + 4 * 200); // "desk" の上限
    expect(result.current.noticeMessage).toBe(TIMEOUT_NOTICE);
    // 遅れて onend が来ても二重に進まない
    await end(0);
    await advance(1000);
    expect(spoken.map((u) => u.text)).toEqual(["desk", "street"]);
  });

  it("splits full text into utterances without pauses", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playFullText("One two. Three!\nFour"));
    expect(result.current.playbackKind).toBe("fullText");
    await advance(START_DELAY_MS);
    await end(0);
    await end(1);
    await end(2);
    expect(spoken.map((u) => u.text)).toEqual(["One two.", "Three!", "Four"]);
    expect(result.current.playbackKind).toBe("none");
  });

  it("uses the configured rate", async () => {
    const { result } = renderHook(() => useSpeechPlayback({ ...settings, rate: 0.5 }));
    act(() => result.current.playSelection("desk"));
    await advance(START_DELAY_MS);
    expect(spoken[0].rate).toBe(0.5);
  });

  it("stops when the page becomes hidden", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playList(items));
    await advance(START_DELAY_MS);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    expect(result.current.playbackKind).toBe("none");
    expect(result.current.activeItemId).toBeNull();
  });

  it("a new playback cancels the existing one", async () => {
    const { result } = renderHook(() => useSpeechPlayback(settings));
    act(() => result.current.playList(items));
    await advance(START_DELAY_MS);
    cancel.mockClear();
    act(() => result.current.playItem(items[1]));
    expect(cancel).toHaveBeenCalled();
    expect(result.current.playbackKind).toBe("item");
    await advance(START_DELAY_MS);
    expect(spoken.map((u) => u.text)).toEqual(["desk", "street"]);
  });
});
