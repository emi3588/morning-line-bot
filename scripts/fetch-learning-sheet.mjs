#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHEET_ID = process.env.SHEET_ID || 'YOUR_SHEET_ID';
const SHEET_RANGE = process.env.SHEET_RANGE || 'A2:S';

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
  NEW_LESSONS: 12,
  REVIEW_LESSONS: 13,
  REVIEW_TEXT: 14,
  GIT: 15,
  WEB: 16,
  UI: 17,
};

export function toMmDdFromDate(d) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

export function normalizeMmdd(cell) {
  if (cell == null || cell === '') return '';
  const s = String(cell).trim();
  const m = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
  if (m) {
    return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}`;
  }
  return '';
}

export function formatJapaneseDateFromMmdd(mmdd, year = new Date().getFullYear()) {
  const norm = normalizeMmdd(mmdd);
  if (!norm) return '';
  const [mo, da] = norm.split('/').map(Number);
  const d = new Date(year, mo - 1, da);
  if (d.getMonth() !== mo - 1 || d.getDate() !== da) return '';
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${year}年${mo}月${da}日（${w}）`;
}

function cellStr(v) {
  if (v == null || v === '') return '';
  return String(v).trim();
}

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

export function rowToTemplateFields(row, mmdd, year = new Date().getFullYear()) {
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
    NEW_LESSONS: cellStr(row[COL.NEW_LESSONS]),
    REVIEW_LESSONS: cellStr(row[COL.REVIEW_LESSONS]),
    REVIEW_TEXT: cellStr(row[COL.REVIEW_TEXT]),
    GIT: cellStr(row[COL.GIT]),
    WEB: cellStr(row[COL.WEB]),
    UI: cellStr(row[COL.UI]),
  };
}

async function getSheetsClient() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile) {
    throw new Error('環境変数 GOOGLE_APPLICATION_CREDENTIALS を設定してください。');
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

function getYesterdayDate() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jst.setDate(jst.getDate() - 1);
  return jst;
}

export async function fetchLearningFieldsForYesterday(options = {}) {
  const sheetId = options.sheetId ?? SHEET_ID;
  const range = options.range ?? SHEET_RANGE;

  if (!sheetId || sheetId === 'YOUR_SHEET_ID') {
    throw new Error('SHEET_ID が未設定です。');
  }

  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values || [];
  const yesterday = getYesterdayDate();
  const yesterdayMmdd = toMmDdFromDate(yesterday);
  const hit = pickRowForMmdd(rows, yesterdayMmdd);

  if (!hit) {
    throw new Error(`前日（${yesterdayMmdd}）に一致する行が見つかりませんでした。`);
  }

  const fields = rowToTemplateFields(hit.row, hit.mmdd, yesterday.getFullYear());
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
  const result = await fetchLearningFieldsForYesterday();
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
