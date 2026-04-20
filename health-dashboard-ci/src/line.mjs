/**
 * LINE Messaging API でテキストを push する。
 * PNG は data URL では送れないため、バッファはローカルファイルに保存し、
 * ダッシュボード要約は type: "text" のみ送信する。
 */

import fs from 'fs';
import path from 'path';
import { formatMetaLineSync } from './render.mjs';
import { buildHeroMessage, SIGNAL_ITEM_LABELS } from './signals.mjs';

/** LINE テキストメッセージは最大 5000 文字（余裕を見て分割） */
const MAX_TEXT_LEN = 4800;
const MAX_MESSAGES = 5;

/**
 * @param {string} filePath
 * @param {Buffer|Uint8Array} pngBuffer
 */
export function saveDashboardPngLocal(filePath, pngBuffer) {
  const buf = Buffer.isBuffer(pngBuffer) ? pngBuffer : Buffer.from(pngBuffer);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buf);
}

function signalMark(signal) {
  if (signal === 'green') return '🟢';
  if (signal === 'yellow') return '🟡';
  return '🔴';
}

function formatCellPlain(row, key) {
  const v = row[key];
  if (v === '' || v == null) return '—';
  if (key === 'mood') {
    const s = String(v).trim();
    if (s === '良い') return '😊';
    if (s === '普通') return '😐';
    if (s === '悪い') return '😟';
    return s;
  }
  if (typeof v === 'object' && v !== null && typeof v.getHours === 'function') {
    const h = v.getHours();
    const m = v.getMinutes();
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  if (typeof v === 'number') return String(v);
  return String(v);
}

/** シート列キー → 信号キー（evaluateSignalsFromRow と同じ対応） */
const DASHBOARD_ROWS = [
  ['sleepScore', 'sleepScore'],
  ['sleepDuration', 'sleepHours'],
  ['steps', 'steps'],
  ['bedtime', 'bedtime'],
  ['wakeup', 'wakeup'],
  ['mood', 'mood'],
  ['bowel', 'bowel'],
  ['walk', 'walk'],
  ['roomMachine', 'roomMachine']
];

/**
 * @param {object} row
 * @param {object} signals
 * @param {string} hints
 * @returns {string}
 */
export function buildDashboardPushText(row, signals, hints) {
  const lines = [];
  lines.push('【健康ダッシュボード】');
  lines.push(formatMetaLineSync(row));
  lines.push('');
  lines.push(buildHeroMessage(signals));
  lines.push('');
  for (const [rowKey, sigKey] of DASHBOARD_ROWS) {
    const label = SIGNAL_ITEM_LABELS[sigKey];
    const val = formatCellPlain(row, rowKey);
    const mark = signalMark(signals[sigKey]);
    lines.push(`${mark} ${label}: ${val}`);
  }
  if (hints && String(hints).trim()) {
    lines.push('');
    lines.push('【ヒント】');
    lines.push(String(hints).trim());
  }
  return lines.join('\n');
}

/**
 * @param {string} fullText
 * @returns {string[]}
 */
function splitForLinePush(fullText) {
  if (fullText.length <= MAX_TEXT_LEN) return [fullText];
  const parts = [];
  let rest = fullText;
  while (rest.length > 0 && parts.length < MAX_MESSAGES) {
    if (rest.length <= MAX_TEXT_LEN) {
      parts.push(rest);
      break;
    }
    let cut = rest.lastIndexOf('\n', MAX_TEXT_LEN);
    if (cut < Math.floor(MAX_TEXT_LEN * 0.25)) cut = MAX_TEXT_LEN;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, '');
  }
  if (rest.length > 0 && parts.length >= MAX_MESSAGES) {
    const last = parts[parts.length - 1];
    parts[parts.length - 1] = `${last}\n…(以降省略)`;
  }
  return parts;
}

/**
 * @param {string} text
 */
export async function linePushDashboardText(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_TO_ID;
  if (!token || !to) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN と LINE_TO_ID を設定してください');
  }
  const chunks = splitForLinePush(text);
  const messages = chunks.map((t) => ({ type: 'text', text: t }));
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ to, messages })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LINE push 失敗: ${res.status} ${t}`);
  }
}
