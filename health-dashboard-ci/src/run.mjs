#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchTodayHealthRow } from './sheet.mjs';
import { evaluateSignalsFromRow } from './signals.mjs';
import { renderDashboardHtml } from './render.mjs';
import { buildHints } from './hints.mjs';
import { captureDashboardPng } from './screenshot.mjs';
import { saveDashboardPngLocal, buildDashboardPushText, linePushDashboardText } from './line.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const htmlPath = path.join(dist, 'dashboard.html');
const pngPath = path.join(dist, 'dashboard.png');

async function main() {
  console.log('1) スプレッドシート取得…');
  const row = await fetchTodayHealthRow();
  console.log('   行:', JSON.stringify(row));

  console.log('2) 赤黄緑判定…');
  const signals = evaluateSignalsFromRow(row);
  console.log('   信号:', signals);

  console.log('3) 改善ヒント…');
  const hints = await buildHints(row, signals);

  console.log('4) HTML 生成…');
  const html = renderDashboardHtml(row, signals, hints);
  if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(htmlPath, html, 'utf8');

  console.log('5) Playwright スクリーンショット…');
  const pngBuffer = await captureDashboardPng(htmlPath, pngPath);
  saveDashboardPngLocal(pngPath, pngBuffer);

  console.log('6) LINE 送信（テキスト要約のみ）…');
  await linePushDashboardText(buildDashboardPushText(row, signals, hints));
  console.log('完了');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
