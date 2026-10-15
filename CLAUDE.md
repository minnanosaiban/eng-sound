# CLAUDE.md — English Sound Selector

このファイルは、Claude Code が本リポジトリで作業する際の常設ルールです。
リポジトリのルートに `CLAUDE.md` というファイル名で配置してください。
詳細な要件は `sound_selector.md`（English Sound Selector 開発指示書 v3。リポジトリ直下）を正とします。以下「仕様書」と呼びます。
本ファイルと仕様書が矛盾する場合は、仕様書を優先してください。

---

## 1. プロジェクト概要

英文を貼り付け、選択した単語・フレーズを音声リストへ追加し、独立した発話として間隔を空けて聞き比べるWebアプリ。

中核の操作：

> 選ぶ → 追加する → 間を空けて聞き比べる

この操作が迷わず安定して動くことを、すべての判断で最優先にする。

---

## 2. 作業の進め方

- 作業開始時に `sound_selector.md` を全文読むこと
- 要件間の矛盾・利用できないAPI・既存ファイルとの衝突は、実装前に確認して報告する
- 軽微な判断では確認質問をせず、仕様書の「設計上の優先順位」（第4章）に従って決める
- **依頼されていない機能を追加しない**。仕様書第6章「MVPで実装しない機能」に該当するものは、便利に見えても実装しない
- 教材登録・和訳・復習は English Reading Review 側の機能であり、本アプリには入れない
- 仕様書に記載のない判断をした場合は、READMEの「実装上の判断」に1行で記録する

---

## 3. 技術スタック

- React + TypeScript（strict）
- Vite（`base` は `./`）
- Vitest（実行環境は `jsdom`。`speechSynthesis` はモックする）
- 読み上げ：Web Speech API
- 一時保存：`sessionStorage`

使用禁止：

- バックエンド、DBサーバー、認証
- 外部音声API、有料API、APIキー
- 大規模UIライブラリ、状態管理ライブラリ、CSSフレームワーク

公開：GitHub Pagesへ静的サイトとして公開する。

---

### ファイル構成（仕様書第20章に準拠）

```text
eng-sound/
├── CLAUDE.md
├── sound_selector.md          # 仕様書（正）
├── README.md                  # 仕様書第29章の項目
├── index.html / vite.config.ts / tsconfig.json / package.json
└── src/
    ├── main.tsx / App.tsx
    ├── types/speech.ts        # TextSelection, SpeechItem, SpeakResult, AppState
    ├── utils/                 # 純粋関数。副作用なし
    │   ├── normalizeText.ts   # 9.5
    │   ├── selection.ts       # 選択の保持・更新判定（9.3）
    │   ├── splitForFullText.ts# 13.9
    │   ├── voice.ts           # 12.2
    │   └── sessionStore.ts    # 22章
    ├── hooks/
    │   └── useSpeechPlayback.ts  # 再生制御の中核（13章）。セッションID・タイマー・停止を集約
    └── components/            # Header, SourceTextPanel, CurrentSelectionPanel,
                               # PlaybackSettings, SpeechList(+Item), PlaybackControls
```

- 状態は `App` に置き、`useState` / `useRef` / `useEffect` のみで管理する（仕様書第19章）
- 再生のロジックは `useSpeechPlayback` に閉じ込め、コンポーネントから `speechSynthesis` を直接呼ばない
- テストは対象ファイルの隣に `*.test.ts(x)` として置く

## 4. コマンド

```bash
npm install
npm run dev        # 開発サーバー
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run build      # 本番ビルド
```

---

## 5. 実装順序

仕様書第28章の順序に従う。各ステップ完了時に `typecheck` と `test` を通してから次へ進む。

---

## 6. 守るべき実装ルール

### 選択

- 範囲選択は選択モード（`textarea` を `readOnly`）で行い、スマートフォンでキーボードを出さない
- 選択は変化時に `TextSelection` として保持し、ボタン押下時に再取得しない
- ブラウザ上の選択が解除されても、保持中の選択をクリアしない（クリア条件は仕様書9.3）
- `selectionchange` を併用する
- 句読点は除去しない（`street` と `street.` の聞き比べのため）

### 再生

- 複数項目を連結して1回のTTSへ渡さない
- 再生はセッションIDで管理し、停止後に古い非同期処理を続行させない
- 再生中の `SpeechSynthesisUtterance` は参照を保持する
- `onend` が届かない場合に備えた上限タイマーを使う。ただし通常の進行・休止の制御には使わない
- `onerror` の `interrupted` / `canceled` はエラー表示しない
- `visibilitychange` で非表示になったら停止する
- 全文再生のみ、文・行ごとに分割して休止なしで読み上げる。選択範囲・リスト項目は分割しない
- リピートはリスト全体の再生のみに適用する
- リスト全体の再生は開始時のコピーを再生し、再生中は上下移動・削除を無効にする（追加は可能）

### 音声選択

- `lang` は `_` を `-` に置き換え、大文字小文字を区別せずに比較する
- 端末内・オンラインの音声を区別しない

### アクセシビリティ

- 状態表示を色だけに依存させない
- `aria-live` は再生状態とエラーにのみ付ける（`現在の選択` には付けない）
- フォーカスリングを消さない

---

## 7. コーディング規約

- TypeScript strict、`any` 禁止
- 関数コンポーネントのみ
- UIの文言は日本語
- コメントは「なぜそうしたか」が分かりにくい箇所にのみ日本語で書く

---

## 8. 完了報告

作業完了時は、次を報告すること。

1. `typecheck` / `test` / `build` の結果
2. 仕様書第27章「MVP完成条件」の各項目の達成状況
3. 実装しなかった・できなかった要件と理由
4. 仕様書に記載のない判断の一覧
5. 手動確認が必要な項目
