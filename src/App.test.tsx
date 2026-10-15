import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

class MockUtterance {
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  rate = 1;
  lang = "";
  voice: unknown = null;
  constructor(public text: string) {}
}

const TEXT = "A man is typing on a laptop at his desk.\nSeveral bicycles are parked along the street.";

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [], addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function select(word: string) {
  const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
  const start = TEXT.indexOf(word);
  ta.focus();
  ta.setSelectionRange(start, start + word.length);
  fireEvent.select(ta);
}

const add = () => fireEvent.click(screen.getByRole("button", { name: "音声リストに追加" }));

describe("App", () => {
  it("adds distant selections, keeps duplicates, and keeps selection after blur", () => {
    render(<App />);
    select("desk");
    (document.activeElement as HTMLElement).blur();
    expect(screen.getAllByText("desk").length).toBeGreaterThan(0);
    add();
    add();
    select("street");
    add();
    const list = screen.getByRole("list");
    expect(list.textContent).toContain("1.desk");
    expect(list.textContent).toContain("2.desk");
    expect(list.textContent).toContain("3.street");
  });

  it("clears selection with the clear button and disables actions", () => {
    render(<App />);
    select("desk");
    fireEvent.click(screen.getByRole("button", { name: "選択を解除" }));
    expect((screen.getByRole("button", { name: "音声リストに追加" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "選択部分を再生" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("clears selection on edit but keeps added items; paste switches to select mode", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.readOnly).toBe(false);
    select("desk");
    add();
    select("street");
    fireEvent.change(ta, { target: { value: TEXT + " x" } });
    expect((screen.getByRole("button", { name: "音声リストに追加" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("list").textContent).toContain("desk");
    fireEvent.paste(ta);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).readOnly).toBe(true);
  });

  it("disables reorder/delete/clear-all only during list playback; add stays enabled", () => {
    render(<App />);
    select("desk");
    add();
    select("street");
    add();
    fireEvent.click(screen.getByRole("button", { name: "「desk」を再生" }));
    // 個別再生中は無効にならない
    expect((screen.getByRole("button", { name: "「desk」を削除" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "リストを再生" }));
    expect((screen.getByRole("button", { name: "「desk」を削除" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "「street」を上へ移動" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "すべて削除" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "音声リストに追加" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "■ 停止" }));
    expect((screen.getByRole("button", { name: "「desk」を削除" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("moves items and disables first-up / last-down", () => {
    render(<App />);
    select("desk");
    add();
    select("street");
    add();
    expect((screen.getByRole("button", { name: "「desk」を上へ移動" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "「street」を下へ移動" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "「street」を上へ移動" }));
    expect(screen.getByRole("list").textContent?.indexOf("street")).toBeLessThan(
      screen.getByRole("list").textContent?.indexOf("desk") ?? 0,
    );
    fireEvent.click(screen.getByRole("button", { name: "「desk」を削除" }));
    expect(screen.getByRole("list").textContent).not.toContain("desk");
  });

  it("restores the session after reload", () => {
    const { unmount } = render(<App />);
    select("desk");
    add();
    unmount();
    render(<App />);
    expect(screen.getByRole("list").textContent).toContain("desk");
  });
});
