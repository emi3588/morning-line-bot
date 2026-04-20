#!/usr/bin/env node
import { linePushDashboardImageUrls } from './line.mjs';

const url = process.env.LINE_DASHBOARD_IMAGE_URL;
if (!url || !String(url).trim()) {
  console.error('LINE_DASHBOARD_IMAGE_URL を設定してください（GitHub Pages 上の dashboard.png の HTTPS URL）');
  process.exit(1);
}

await linePushDashboardImageUrls(String(url).trim());
console.log('LINE image push 完了:', url);
