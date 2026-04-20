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
const tplPath = path.join(root, 'output', 'learning-summary.template.html');

const KEYS = [
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
  'AI_MESSAGE',
  'AI_ASIDE_YESTERDAY',
  'AI_ASIDE_UNDERSTOOD',
  'AI_ASIDE_UNCLEAR',
  'AI_ASIDE_FOCUS',
  'AI_ASIDE_TERM'
];

let tpl = fs.readFileSync(tplPath, 'utf8');

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

for (const k of KEYS) {
  const v = data[k] != null ? String(data[k]) : '';
  tpl = tpl.split(`{{${k}}}`).join(v);
}

const outPath = process.argv[3];
if (outPath) {
  tpl = tpl.replace(
    '<title>昨日の学習サマリー（テンプレート）</title>',
    '<title>昨日の学習サマリー（プレビュー）</title>'
  );
}

const left = tpl.match(/\{\{([A-Z0-9_]+)\}\}/g);
if (left?.length) {
  console.warn('未置換のプレースホルダ:', [...new Set(left)].join(', '));
}

if (outPath) {
  fs.writeFileSync(path.resolve(process.cwd(), outPath), tpl, 'utf8');
} else {
  process.stdout.write(tpl);
}
