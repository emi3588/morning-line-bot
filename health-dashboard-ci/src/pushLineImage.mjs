#!/usr/bin/env node
import { linePushDashboardImageUrls } from './line.mjs';

console.log('[LINE] pushLineImage 開始');

const url = process.env.LINE_DASHBOARD_IMAGE_URL;
console.log(`[LINE] LINE_DASHBOARD_IMAGE_URL=${url ? url : '未設定'}`);
if (!url || !String(url).trim()) {
  console.error('[LINE] LINE_DASHBOARD_IMAGE_URL を設定してください');
  process.exit(1);
}

try {
  await linePushDashboardImageUrls(String(url).trim());
  console.log('[LINE] image push 完了:', url);
} catch (err) {
  console.error('[LINE] image push 失敗で終了:', err && err.message ? err.message : err);
  process.exit(1);
}
