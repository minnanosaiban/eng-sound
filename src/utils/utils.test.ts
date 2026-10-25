import { beforeEach, describe, expect, it } from "vitest";
import { normalizeSelectedText } from "./normalizeText";
import { updateSelection } from "./selection";
import { splitForFullText } from "./splitForFullText";
import { pickVoice } from "./voice";
import { loadSession, saveSession, SESSION_KEY } from "./sessionStore";

const voice = (lang: string) => ({ lang, name: lang }) as SpeechSynthesisVoice;

describe("normalizeSelectedText", () => {
  it("trims and collapses whitespace but keeps punctuation", () => {
    expect(normalizeSelectedText("  at his\n  desk.\t")).toBe("at his desk.");
    expect(normalizeSelectedText(" \n\t ")).toBe("");
  });
});

describe("updateSelection", () => {
  const text = "A man at his desk.";
  it("captures a range", () => {
    expect(updateSelection(null, text, 13, 17)).toEqual({ start: 13, end: 17, text: "desk" });
  });
  it("keeps current selection when browser selection collapses", () => {
    const cur = { start: 13, end: 17, text: "desk" };
    expect(updateSelection(cur, text, 5, 5)).toBe(cur);
  });
  it("ignores whitespace-only ranges", () => {
    const cur = { start: 13, end: 17, text: "desk" };
    expect(updateSelection(cur, text, 1, 2)).toBe(cur);
  });
  it("replaces with a new range", () => {
    const cur = { start: 13, end: 17, text: "desk" };
    expect(updateSelection(cur, text, 2, 5)?.text).toBe("man");
  });
});

describe("splitForFullText", () => {
  it("splits on newlines and sentence ends", () => {
    expect(splitForFullText("A b. C d!  E f?\nG h")).toEqual(["A b.", "C d!", "E f?", "G h"]);
  });
  it("returns [] for blank text", () => {
    expect(splitForFullText("  \n ")).toEqual([]);
  });
});

describe("pickVoice", () => {
  it("treats en_US like en-US and prefers exact match", () => {
    const v = pickVoice([voice("en-GB"), voice("en_US"), voice("ja-JP")]);
    expect(v?.lang).toBe("en_US");
    expect(pickVoice([voice("en-AU"), voice("en-GB")])?.lang).toBe("en-AU");
    expect(pickVoice([voice("ja-JP")])).toBeUndefined();
  });
});

describe("sessionStore", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("round-trips a session", () => {
    const s = {
      sourceText: "hi",
      speechItems: [{ id: "1", text: "hi" }],
      inputMode: "select" as const,
      rate: 0.5 as const,
      pauseMilliseconds: 2000 as const,
      repeatCount: 5 as const,
    };
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });

  it("discards invalid JSON or wrong types", () => {
    window.sessionStorage.setItem(SESSION_KEY, "{oops");
    expect(loadSession()).toBeNull();
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sourceText: 1 }));
    expect(loadSession()).toBeNull();
  });

  it("resets only invalid settings to defaults", () => {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        sourceText: "x",
        speechItems: [],
        inputMode: "edit",
        rate: 2,
        pauseMilliseconds: 1500,
        repeatCount: 11,
      }),
    );
    const s = loadSession();
    expect(s?.rate).toBe(1.0);
    expect(s?.pauseMilliseconds).toBe(1500);
    expect(s?.repeatCount).toBe(1);
  });
});
