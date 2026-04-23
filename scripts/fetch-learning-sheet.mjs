#!/usr/bin/env node
/**
 * 学習記録スプレッドシートから「今日の日付（MM/DD）」に一致する行を取得し、
 * HTML テンプレ用のキー（{{DATE}}〜{{TERM}}）に対応するオブジェクトを返す / JSON 出力する。
 *
 * 列（1行目ヘッダー、2行目以降がデータ）:
 *   A: 日付 MM/DD  B:連続 C:コース D:レッスン E:週間 F:月間 G:累計
 *   H:昨日の学習 I:理解 J:曖昧 K:今日のフォーカス L:今日の用語
 *
 * 環境変数:
 *   SHEET_ID                    スプレッドシート ID（未設定時はプレースホルダ YOUR_SHEET_ID）
 *   GOOGLE_APPLICATION_CREDENTIALS  サービスアカウント JSON のファイルパス（必須）
 *   SHEET_RANGE                 省略時 A2:L（先頭シートの 2 行目〜）
 *
 * 使い方:
 *   node scripts/fetch-learning-sheet.mjs
 *   node scripts/fetch-learning-sheet.mjs --json > data.json
 *
 * OpenAI でコメントを付与する例:
 *   node scripts/fetch-learning-sheet.mjs | node scripts/generate-ai-comments.mjs > filled.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHEET_ID = process.env.SHEET_ID || 'YOUR_SHEET_ID';
const SHEET_RANGE = process.env.SHEET_RANGE || 'A2:L';

const COL = {
  DATE_RAW: 0,
  STREAK: 1,
  COURSES: 2,
  LESSONS: 3,
  WEEKLY: 4,
  MONTHLY: 5,
  TOTAL: 6,
  YESTERDAY: 7,
  UNDERSTOOD: 8,
  UNCLEAR: 9,
  FOCUS: 10,
  TERM: 11,
};

/** @returns {string} MM/DD（ゼロ埋め） */
export function toMmDdFromDate(d) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * セル値を MM/DD に正規化（"4/5" → "04/05"）
 * @param {unknown} cell
 * @returns {string} MM/DD またはマッチできなければ空
 */
export function normalizeMmdd(cell) {
  if (cell == null || cell === '') return '';
  const s = String(cell).trim();
  const m = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
  if (m) {
    return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}`;
  }
  return '';
}

/**
 * 今日の日付を「2026年4月22日（水）」形式に（年はローカル日付の年）
 * @param {string} mmdd "MM/DD"
 */
export function formatJapaneseDateFromMmdd(mmdd, year = new Date().getFullYear()) {
  const norm = normalizeMmdd(mmdd);
  if (!norm) return '';
  const [mo, da] = norm.split('/').map(Number);
  const d = new Date(year, mo - 1, da);
  if (d.getMonth() !== mo - 1 || d.getDate() !== da) return '';
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${year}年${mo}月${da}日（${w}）`;
}

/** @param {unknown} v */
function cellStr(v) {
  if (v == null || v === '') return '';
  return String(v).trim();
}

/**
 * @param {string[][]} rows API の values（ヘッダー行は含まない想定）
 * @param {string} targetMmdd 今日の MM/DD
 */
export function pickRowForMmdd(rows, targetMmdd) {
  const want = normalizeMmdd(targetMmdd) || targetMmdd;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const raw = row[COL.DATE_RAW];
    const mmdd = normalizeMmdd(raw);
    if (mmdd && mmdd === want) {
      return { rowIndex: i + 2, row, mmdd };
    }
  }
  return null;
}

/**
 * @param {string[]} row
 * @param {string} mmdd マッチした MM/DD（表示年はローカル年）
 */
export function rowToTemplateFields(row, mmdd) {
  const year = new Date().getFullYear();
  const DATE = formatJapaneseDateFromMmdd(mmdd, year);
  return {
    DATE,
    STREAK: cellStr(row[COL.STREAK]),
    COURSES: cellStr(row[COL.COURSES]),
    LESSONS: cellStr(row[COL.LESSONS]),
    WEEKLY: cellStr(row[COL.WEEKLY]),
    MONTHLY: cellStr(row[COL.MONTHLY]),
    TOTAL: cellStr(row[COL.TOTAL]),
    YESTERDAY: cellStr(row[COL.YESTERDAY]),
    UNDERSTOOD: cellStr(row[COL.UNDERSTOOD]),
    UNCLEAR: cellStr(row[COL.UNCLEAR]),
    FOCUS: cellStr(row[COL.FOCUS]),
    TERM: cellStr(row[COL.TERM]),
  };
}

async function getSheetsClient() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile) {
    throw new Error(
      '環境変数 GOOGLE_APPLICATION_CREDENTIALS に、サービスアカウント JSON のパスを設定してください。'
    );
  }
  const resolved = path.isAbsolute(keyFile) ? keyFile : path.resolve(process.cwd(), keyFile);
  if (!fs.existsSync(resolved)) {
    throw new Error(`認証ファイルが見つかりません: ${resolved}`);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: resolved,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/**
 * スプレッドシートから本日 MM/DD に一致する行を取得し、テンプレ用フィールドに変換する。
 */
export async function fetchLearningFieldsForToday(options = {}) {
  const sheetId = options.sheetId ?? SHEET_ID;
  const range = options.range ?? SHEET_RANGE;

  if (!sheetId || sheetId === 'YOUR_SHEET_ID') {
    throw new Error(
      'SHEET_ID が未設定です。環境変数 SHEET_ID にスプレッドシート ID を設定するか、YOUR_SHEET_ID を置き換えてください。'
    );
  }

  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values || [];
  const todayMmdd = toMmDdFromDate(new Date());
  const hit = pickRowForMmdd(rows, todayMmdd);

  if (!hit) {
    throw new Error(
      `本日（${todayMmdd}）に一致する行が ${range} 内に見つかりませんでした。A列の日付形式を MM/DD で確認してください。`
    );
  }

  const fields = rowToTemplateFields(hit.row, hit.mmdd);
  return {
    meta: {
      sheetId,
      range,
      rowIndex: hit.rowIndex,
      matchedMmdd: hit.mmdd,
      dateLabel: fields.DATE,
    },
    fields,
  };
}

async function main() {
  const jsonFlag = process.argv.includes('--json');
  const result = await fetchLearningFieldsForToday();
  const out = jsonFlag ? JSON.stringify(result, null, 2) : JSON.stringify(result.fields, null, 2);
  process.stdout.write(out + '\n');
}

const isMain = process.argv[1]?.endsWith('fetch-learning-sheet.mjs');
if (isMain) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
