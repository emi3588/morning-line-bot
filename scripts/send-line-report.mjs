#!/usr/bin/env node
/**
 * 学習サマリーを「取得 → AI コメント → HTML 埋め → PNG（Playwright）→ LINE Messaging API」まで実行する。
 * LINE 送信は health-dashboard-ci の linePushDashboardImageUrls と同じ（/message/push・type: image・HTTPS URL）。
 *
 * 環境変数:
 *   LINE_CHANNEL_ACCESS_TOKEN … Messaging API チャネルアクセストークン（必須・--dry-run では不要）
 *   LINE_TO_ID … プッシュ先ユーザー／グループ ID（必須・--dry-run では不要）
 *   LINE_LEARNING_IMAGE_URL … GitHub Pages 等に置いた PNG の HTTPS URL（送信時必須）
 *   SHEET_ID, GOOGLE_APPLICATION_CREDENTIALS … fetch-learning-sheet と同じ
 *   OPENAI_API_KEY … generate-ai-comments と同じ
 *   SKIP_LINE_PUSH … "1" のとき PNG まで実行し LINE のみスキップ（GitHub Actions の Pages デプロイ前ジョブ用）
 *
 * PNG は常に output/learning-report.png に保存する（CI で Pages に載せる想定）。
 *
 * 初回のみ: npx playwright install chromium
 *
 * オプション:
 *   --dry-run         PNG 保存のみ（LINE 送信しない）。シート／OpenAI を読まないには --from-json と併用すること。
 *   --from-json path  スプレッドシート／OpenAI を使わず、完成済み JSON から HTML→PNG→（送信）
 *
 * 全部つなげて一気に動かす例（PowerShell）:
 *   $env:SHEET_ID="..."
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="..."
 *   $env:OPENAI_API_KEY="sk-..."
 *   $env:LINE_CHANNEL_ACCESS_TOKEN="..."
 *   $env:LINE_TO_ID="..."
 *   $env:LINE_LEARNING_IMAGE_URL="https://（あなた）.github.io/（repo）/learning-report.png"
 *   node scripts/send-line-report.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { linePushDashboardImageUrls } from '../health-dashboard-ci/src/line.mjs';
import { fetchLearningFieldsForYesterday } from './fetch-learning-sheet.mjs';
import { generateAiComments } from './generate-ai-comments.mjs';
import { fillLearningSummaryHtml } from './fill-learning-summary.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pngPath = path.join(root, 'output', 'learning-report.png');

function parseArgs(argv) {
  let fromJson = null;
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--from-json' && argv[i + 1]) {
      fromJson = argv[++i];
    }
  }
  return { fromJson, dryRun };
}

/**
 * @param {string} html
 * @param {string} outPngPath
 */
const VIEWPORT_WIDTH = 390;

export async function renderLearningSummaryPng(html, outPngPath) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: VIEWPORT_WIDTH, height: 900 },
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForSelector('.shell', { timeout: 10_000 });
    await page.addStyleTag({
      content: `body{margin:0;padding:0;} html{overflow-x:hidden;}`,
    });
    const shellH = await page.evaluate(() => {
      const el = document.querySelector('.shell');
      if (!el) return 0;
      return Math.ceil(el.getBoundingClientRect().height);
    });
    const h = Math.max(200, shellH + 24);
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: h });
    await page.locator('.shell').screenshot({ path: outPngPath, type: 'png' });
  } finally {
    await browser.close();
  }
}

/** fetch の --json 形式またはフラットな完成 JSON をテンプレ用オブジェクトにそろえる */
function normalizeMergedInput(parsed) {
  if (parsed && typeof parsed.fields === 'object' && parsed.fields !== null) {
    return { ...parsed.fields };
  }
  return { ...parsed };
}

async function main() {
  const { fromJson, dryRun } = parseArgs(process.argv);

  let merged;
  if (fromJson) {
    const raw = fs.readFileSync(path.resolve(process.cwd(), fromJson), 'utf8');
    merged = normalizeMergedInput(JSON.parse(raw.trim()));
  } else {
    const { fields } = await fetchLearningFieldsForYesterday();
    const ai = await generateAiComments(fields);
    merged = { ...fields, ...ai };
  }

  const { html, unclosed } = fillLearningSummaryHtml(merged, { previewTitle: true });
  if (unclosed.length) {
    console.warn('未置換のプレースホルダ:', unclosed.join(', '));
  }

  fs.mkdirSync(path.dirname(pngPath), { recursive: true });
  await renderLearningSummaryPng(html, pngPath);
  console.error('PNG を書き出しました:', pngPath);

  if (dryRun) {
    console.error('（--dry-run のため LINE Messaging API は呼び出していません）');
    return;
  }

  const skipLine = String(process.env.SKIP_LINE_PUSH || '').trim();
  if (skipLine === '1' || /^true$/i.test(skipLine) || /^yes$/i.test(skipLine)) {
    console.error('（SKIP_LINE_PUSH のため LINE Messaging API は呼び出していません）');
    return;
  }

  const imageUrl = String(process.env.LINE_LEARNING_IMAGE_URL || '').trim();
  if (!imageUrl) {
    throw new Error(
      '環境変数 LINE_LEARNING_IMAGE_URL に、GitHub Pages 上の learning-report.png の HTTPS URL を設定してください。'
    );
  }
  if (!/^https:\/\//i.test(imageUrl)) {
    throw new Error('LINE_LEARNING_IMAGE_URL は https:// で始まる必要があります。');
  }

  await linePushDashboardImageUrls(imageUrl);
  console.error('LINE Messaging API で画像メッセージを送信しました。');
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('send-line-report.mjs');
if (isMain) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
