#!/usr/bin/env node
import { linePushDashboardFlex } from './line.mjs';

const url = process.env.LINE_DASHBOARD_IMAGE_URL;
if (!url || !String(url).trim()) {
  console.error('LINE_DASHBOARD_IMAGE_URL を設定してください');
  process.exit(1);
}

await linePushDashboardFlex(String(url).trim());
console.log('LINE Flex push 完了:', url);
