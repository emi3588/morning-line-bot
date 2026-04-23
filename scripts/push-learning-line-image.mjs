#!/usr/bin/env node
/**
 * LINE_LEARNING_IMAGE_URL（HTTPS）を health-dashboard-ci と同じ方式で Push する。
 * 環境変数: LINE_CHANNEL_ACCESS_TOKEN, LINE_TO_ID, LINE_LEARNING_IMAGE_URL
 */
import { linePushDashboardImageUrls } from '../health-dashboard-ci/src/line.mjs';

const url = process.env.LINE_LEARNING_IMAGE_URL;
if (!url || !String(url).trim()) {
  console.error(
    'LINE_LEARNING_IMAGE_URL を設定してください（GitHub Pages 上の learning-report.png の HTTPS URL）'
  );
  process.exit(1);
}

await linePushDashboardImageUrls(String(url).trim());
console.log('LINE learning report image push 完了:', url);
