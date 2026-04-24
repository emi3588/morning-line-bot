import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs';

/**
 * 生成済み HTML を file:// で開き、PNG バッファを返す（保存は呼び出し側で行う）
 */
export async function captureDashboardPng(htmlPath, pngPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 520, height: 1200 },
    deviceScaleFactor: 3
  });
  const fileUrl = pathToFileURL(path.resolve(htmlPath)).href;
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 400));
  const dir = path.dirname(pngPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const el = await page.locator('.container').first();
  const buf = await el.screenshot({ type: 'png' });
  await browser.close();
  return buf;
}
