# 健康チェック CI（第3回講義「進捗管理ダッシュボード」型）

Google スプレッドシートの当日行を取得し、**プログラムで赤黄緑判定** → **mockup ベースの HTML** に流し込み → **Playwright で画像化** → **LINE に画像送信**します。  
（表示は GAS のテキスト／Flex ではなく、**HTML テンプレート一本**です。）

## 4つのパーツの対応

| 講義 | 本プロジェクト |
|------|------------------|
| トリガー | **GitHub Actions**（`.github/workflows/health-dashboard.yml`）毎日 21:00 JST |
| ソース元 | **Google スプレッドシート**（Sheets API） |
| 処理 | **GitHub のランナー上の Node**（判定・HTML・任意で OpenAI 3 行だけ・Playwright） |
| 届け先 | **LINE Messaging API**（画像メッセージ） |

## 必要な GitHub Secrets

| Secret | 内容 |
|--------|------|
| `GOOGLE_CREDENTIALS_JSON` | GCP サービスアカウント鍵の **JSON 全文**（1 行に潰して貼るか、そのまま複数行で登録できる場合はそのまま） |
| `SPREADSHEET_ID` | スプレッドシート ID（URL の `/d/` と `/edit` の間） |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API の **チャネルアクセストークン** |
| `LINE_TO_ID` | 送信先ユーザー ID またはグループ ID |

任意:

| Secret / Vars | 内容 |
|---------------|------|
| `SHEET_NAME` | シート名（未設定時は `健康チェック`） |
| `OPENAI_API_KEY` | あるときだけ **改善ヒント 3 行**を AI 生成。なければ固定の 3 行 |
| `OPENAI_MODEL` | Repository variable（既定 `gpt-4o-mini`） |

## スプレッドシート側の準備

1. GCP でプロジェクト作成 → **Google Sheets API** を有効化 → **サービスアカウント**作成 → JSON 鍵をダウンロード。
2. 対象スプレッドシートを、そのサービスアカウントのメールアドレス（`...@...iam.gserviceaccount.com`）に **閲覧者で共有**。
3. シートの **1 行目**は見出し、**A 列＝日付**（`日付` という見出し推奨）、**B〜J** が次の順であること:

   `睡眠スコア` / `睡眠時間` / `歩数` / `就寝` / `起床` / `気分` / `便通` / `朝散歩` / `ルームマシン`

   （見出しがずれていても、**A〜J の位置**で値を読む実装です。）

4. `DAYS_OFFSET` は Actions の `env` で変更可能（ワークフロー YAML 内、既定 `0`＝当日）。

## 手元で動かす（任意）

```bash
cd health-dashboard-ci
export GOOGLE_CREDENTIALS_JSON="$(cat /path/to/sa.json)"
export SPREADSHEET_ID="..."
export LINE_CHANNEL_ACCESS_TOKEN="..."
export LINE_TO_ID="..."
npm ci
npx playwright install chromium
npm run run
```

## ファイル構成

```
health-dashboard-ci/
  package.json
  template/
    dashboard.template.html   # mockup6 相当の本番テンプレ（__META_LINE__ 等の穴埋め）
  src/
    sheet.mjs       # Sheets 取得・日付正規化
    signals.mjs     # 赤黄緑（GAS HealthSignals と同じ閾値）
    render.mjs      # テンプレートへデータ流し込み
    hints.mjs       # 改善ヒント（AI はここだけ）
    screenshot.mjs  # Playwright
    line.mjs        # LINE push（PNG を base64 data URL で image メッセージ）
    run.mjs         # 上記を直列実行
.github/workflows/
  health-dashboard.yml
```

## LINE 画像の送り方（Imgur 不使用）

`line.mjs` は PNG を **`data:image/png;base64,...` の data URL** にし、`type: "image"` の `originalContentUrl` / `previewImageUrl` にそのまま指定して push します。**`IMGUR_CLIENT_ID` は不要**です。

公式は **HTTPS の画像 URL** を推奨しており、data URL は環境・画像サイズによって **拒否やエラー**になることがあります。その場合は PNG を小さくするか、HTTPS ホスト方式に戻す必要があります。

## 時刻

ワークフローの `cron: "0 12 * * *"` は **UTC 12:00 = 日本時間 21:00**（日本は夏時間なし）です。
