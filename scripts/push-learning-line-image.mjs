#!/usr/bin/env node
/**
 * LINE_LEARNING_IMAGE_URL（HTTPS）をFlexメッセージでプッシュします。
 * 環境変数: LINE_CHANNEL_ACCESS_TOKEN、LINE_TO_ID、LINE_LEARNING_IMAGE_URL
 */
import { linePushDashboardFlex } from '../health-dashboard-ci/src/line.mjs';

const URL = process.env.LINE_LEARNING_IMAGE_URL;
if (!URL || !URL.trim()) {
  console.error(
    'LINE_LEARNING_IMAGE_URL を設定してください（GitHub Pages 上の learning-report.png の HTTPS URL）'
  );
  process.exit(1);
}

await linePushDashboardFlex(String(URL).trim());
console.log('LINE学習レポート画像プッシュ完了：', URL);
