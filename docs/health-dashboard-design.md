# 健康ダッシュボード／夜LINE — 設計メモ

**構成フロー図（完成イメージ）** は次の HTML と同一内容です。ブラウザで開くとカード型の図解が表示され、印刷から PDF も保存できます。

- **リポジトリ内（編集用）:** [`output/health-evening-line-flow.html`](../output/health-evening-line-flow.html)（ローカルではファイルを直接開く）
- **公開例（Surge）:** [健康・食事・気分 → 夜LINE｜構成フロー図](https://diagram-health-evening-line-20260411.surge.sh/health-evening-line-flow.html)

### 発行される HTTPS URL（GitHub Pages）

健康チェックのワークフローが成功すると、**同じサイト**に次の URL が載ります（`main` 既定・リポジトリ名が `morning-line-bot` の場合）。

| 内容 | URL |
|------|-----|
| 一覧（index） | [https://emi3588.github.io/morning-line-bot/](https://emi3588.github.io/morning-line-bot/) |
| **ダッシュボード見本（mockup-6）** | [https://emi3588.github.io/morning-line-bot/health-check-mockup-6.html](https://emi3588.github.io/morning-line-bot/health-check-mockup-6.html) |
| **夜 LINE 構成フロー図（いまの版）** | [https://emi3588.github.io/morning-line-bot/health-evening-line-flow.html](https://emi3588.github.io/morning-line-bot/health-evening-line-flow.html) |
| 当日生成 PNG（LINE 用） | [https://emi3588.github.io/morning-line-bot/dashboard.png](https://emi3588.github.io/morning-line-bot/dashboard.png) |

※ 初回は **Settings → Pages → GitHub Actions** を有効にし、**少なくとも 1 回ワークフローを通す**と上記が開けます。Fork した場合は `emi3588` を自分のユーザー名に読み替えてください。

**404 のとき:** `output/health-evening-line-flow.html` と `output/health-pages-index.html` が **リポジトリにコミットされていない**と、CI にファイルが無く Pages に載らず 404 になります。`git push` 後に Actions の **Health dashboard to LINE** を手動実行し、**deploy** ジョブまで緑になるか確認してください。

GitHub の **blob 画面**だけでは HTML がプレビューされないことがあるので、基本は上の **Pages の URL** を使ってください。

---

## 自動化している報告（一文・完成イメージ）

**毎日 21:00 に、記録（自動）と体調（手入力）をまとめ、AI 総合判定と一言コメント付きで LINE に 1 通届ける。**

（いまの `health-dashboard-ci` は、そのうち **スプレッドシートの記録＋ルール判定＋ダッシュボード画像を LINE に送る** ところまで。下に「実装との対応」を書いています。）

---

## 4つのパーツ（講義の言い方）

| パーツ | 内容 |
|--------|------|
| **トリガー** | 毎日 21:00 · 自動実行 |
| **ソース元** | ① 自動：睡眠・歩数・運動・**座り時間**・就寝起床　② 手入力：食事・**気分（😊😐😞）**・**便通** |
| **処理する場所** | 整形 → **AI 総合判定**（全データ＋気分強め＋便通は補助）→ 一言コメント |
| **出力（届け先）** | LINE（指定フォーマットの 1 通） |

メインフロー（時系列）・ソースの内訳・AI 判定ルールの詳細は、**上記 HTML** の見出しどおりに書いてあります（Surge 版と同じ構成）。

---

## 本リポジトリ（`health-dashboard-ci`）との対応

| 設計メモ（夜 LINE 完成イメージ） | いまのコードベース |
|----------------------------------|---------------------|
| トリガー 21:00 | **GitHub Actions** `.github/workflows/health-dashboard.yml`（cron 12:00 UTC ≒ 21:00 JST） |
| ソース元 ① 自動記録 | **Google スプレッドシート**（睡眠スコア・時間・歩数・就寝・起床 … シート列に準拠。座り時間・運動時間は列がなければ未対応） |
| ソース元 ② 手入力（食事・写真など） | **未実装**（シートの既存列＋気分・便通などに寄せる余地あり） |
| 処理：整形 | **Node** … `sheet.mjs` → `signals.mjs`（赤黄緑）→ `render.mjs`（HTML テンプレ） |
| 処理：AI 総合判定（😊😐😞 バッジ） | **一部のみ** … `hints.mjs` で短文ヒント（OpenAI 任意）。総合判定バッジは HTML モックの範囲 |
| 処理：一言コメント | ヒント文に近い。**専用の 1 文フォーマットは設計メモの次段** |
| 出力 LINE | **画像メッセージ**（GitHub Pages の `dashboard.png` の HTTPS URL）＋ローカルではテキストフォールバック可 |

---

## AI の出力を安定させる 3 つのコツ（このリポジトリ）

1. **完成形の絵から作る** … 夜 LINE の流れは `health-evening-line-flow.html`、ダッシュボードの見た目は `output/health-check-mockup-6.html` → `health-dashboard-ci/template/dashboard.template.html`。
2. **専門家に磨かせる** … テンプレ・4 パーツの割り当てを先にレビュー。
3. **ブレをコードで止める** … `signals.mjs` の閾値、`render.mjs` の穴埋め、`line.mjs` の HTTPS チェックなど。

---

## 関連 URL

| 説明 | URL |
|------|-----|
| **図解・mockup（Pages・HTTPS）** | 上の表「発行される HTTPS URL」を参照 |
| 構成フロー図（Surge・別ホストの例） | [https://diagram-health-evening-line-20260411.surge.sh/health-evening-line-flow.html](https://diagram-health-evening-line-20260411.surge.sh/health-evening-line-flow.html) |
| リポジトリ（トップ） | [https://github.com/emi3588/morning-line-bot](https://github.com/emi3588/morning-line-bot) |
| この設計メモ（GitHub） | [https://github.com/emi3588/morning-line-bot/blob/HEAD/docs/health-dashboard-design.md](https://github.com/emi3588/morning-line-bot/blob/HEAD/docs/health-dashboard-design.md) |
| フロー図 HTML（ソース・blob） | [https://github.com/emi3588/morning-line-bot/blob/HEAD/output/health-evening-line-flow.html](https://github.com/emi3588/morning-line-bot/blob/HEAD/output/health-evening-line-flow.html) |
| ワークフロー YAML | [https://github.com/emi3588/morning-line-bot/blob/HEAD/.github/workflows/health-dashboard.yml](https://github.com/emi3588/morning-line-bot/blob/HEAD/.github/workflows/health-dashboard.yml) |
| ダッシュボード見本（ソース・blob） | [https://github.com/emi3588/morning-line-bot/blob/HEAD/output/health-check-mockup-6.html](https://github.com/emi3588/morning-line-bot/blob/HEAD/output/health-check-mockup-6.html) |

---

## 主要パス（実装の入口）

| 種別 | パス |
|------|------|
| ワークフロー | `.github/workflows/health-dashboard.yml` |
| パイプライン本体 | `health-dashboard-ci/src/run.mjs` |
| Sheets | `health-dashboard-ci/src/sheet.mjs` |
| 判定 | `health-dashboard-ci/src/signals.mjs` |
| HTML 生成 | `health-dashboard-ci/src/render.mjs` |
| ヒント（任意 AI） | `health-dashboard-ci/src/hints.mjs` |
| PNG | `health-dashboard-ci/src/screenshot.mjs` |
| LINE | `health-dashboard-ci/src/line.mjs`, `health-dashboard-ci/src/pushLineImage.mjs` |

Secrets / Pages 初回設定は `health-dashboard-ci/README.md` を参照。

---

このファイルは **夜 LINE の設計メモ（Surge と同じ内容）** と **いまのリポジトリ実装の対応** をまとめたものです。フロー図の文言を変えたら `output/health-evening-line-flow.html` とセットで更新してください。
