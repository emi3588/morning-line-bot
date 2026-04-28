#!/usr/bin/env node
/**
 * learning-summary.template.html の {{KEY}} を差し替える最小例（Node）。
 * 使い方:
 *   node scripts/fill-learning-summary.mjs output/data.json > out.html
 *   node scripts/fill-learning-summary.mjs < data.json   （従来どおり stdin）
 * data.json 例: { "DATE": "2026年4月17日（金）", "STREAK": "40", ... }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const defaultTplPath = path.join(root, 'output', 'learning-summary.template.html');
export const LEARNING_SUMMARY_KEYS = [
  'DATE',
  'STREAK',
  'COURSES',
  'LESSONS',
  'WEEKLY',
  'MONTHLY',
  'TOTAL',
  'YESTERDAY',
  'UNDERSTOOD',
  'UNCLEAR',
  'FOCUS',
  'TERM',
  'TERM_DESCRIPTION',
  'TERM_ACTION',
  'AI_MESSAGE',
  'AI_ASIDE_YESTERDAY',
  'AI_ASIDE_UNDERSTOOD',
  'AI_ASIDE_UNCLEAR',
  'AI_ASIDE_FOCUS',
  'AI_ASIDE_TERM',
];
/**
 * @param {Record<string, unknown>} data
 * @param {{ tplPath?: string, previewTitle?: boolean }} [options] previewTitle が true のときだけタイトルを「プレビュー」に差し替え
 * @returns {{ html: string, unclosed: string[] }}
 */
export function fillLearningSummaryHtml(data, options = {}) {
  const tplPath = options.tplPath ?? defaultTplPath;
  let tpl = fs.readFileSync(tplPath, 'utf8');
  for (const k of LEARNING_SUMMARY_KEYS) {
    const v = data[k] != null ? String(data[k]) : '';
    tpl = tpl.split(`{{${k}}}`).join(v);
  }
  if (options.previewTitle) {
    tpl = tpl.replace(
      '<title>昨日の学習サマリー（テンプレート）</title>',
      '<title>昨日の学習サマリー（プレビュー）</title>'
    );
  }
  const rawLeft = tpl.match(/\{\{([A-Z0-9_]+)\}\}/g);
  const unclosed = rawLeft ? [...new Set(rawLeft)] : [];
  return { html: tpl, unclosed };
}
async function fillMain() {
  const jsonPath = process.argv[2];
  let raw = '';
  if (jsonPath) {
    raw = fs.readFileSync(path.resolve(process.cwd(), jsonPath), 'utf8');
  } else {
    raw = await new Promise((resolve, reject) => {
      const chunks = [];
      process.stdin.on('data', (c) => chunks.push(c));
      process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      process.stdin.on('error', reject);
    });
  }
  let data = {};
  try {
    data = JSON.parse(raw.trim() || '{}');
  } catch (e) {
    console.error('JSON の解析に失敗しました:', e.message);
    process.exit(1);
  }
  const outPath = process.argv[3];
  const { html: tpl, unclosed } = fillLearningSummaryHtml(data, { previewTitle: !!outPath });
  if (unclosed.length) {
    console.warn('未置換のプレースホルダ:', unclosed.join(', '));
  }
  if (outPath) {
    fs.writeFileSync(path.resolve(process.cwd(), outPath), tpl, 'utf8');
  } else {
    process.stdout.write(tpl);
  }
}
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('fill-learning-summary.mjs');
if (isMain) {
  fillMain().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
