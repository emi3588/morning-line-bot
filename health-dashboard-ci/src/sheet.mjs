import { google } from 'googleapis';

const TZ = process.env.TIMEZONE || 'Asia/Tokyo';

/**
 * シートの日付セルを yyyy-MM-dd に正規化（GAS normalizeHealthDate_ 相当）
 */
export function normalizeHealthDate(cell) {
  if (cell == null || cell === '') return '';
  if (typeof cell === 'object' && cell !== null && typeof cell.getTime === 'function') {
    return formatYmdInTz(cell, TZ);
  }
  const s = String(cell).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-');
  const mdw = s.match(/^(\d{1,2})\/(\d{1,2})\s*(?:\([^)]*\))?\s*$/);
  if (mdw) {
    const y = new Date().getFullYear();
    return `${y}-${pad2(mdw[1])}-${pad2(mdw[2])}`;
  }
  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    const y = new Date().getFullYear();
    return `${y}-${pad2(md[1])}-${pad2(md[2])}`;
  }
  const p = new Date(s);
  if (!Number.isNaN(p.getTime())) return formatYmdInTz(p, TZ);
  return s;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatYmdInTz(d, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** DAYS_OFFSET: 0=当日, 1=前日（東京の日付。境界は日単位の近似） */
export function targetYmd(daysOffset = 0) {
  const ms = Date.now() - Number(daysOffset || 0) * 86400000;
  return formatYmdInTz(new Date(ms), TZ);
}

function getAuth() {
  const raw = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!raw) throw new Error('GOOGLE_CREDENTIALS_JSON が未設定です（サービスアカウント JSON 全文を Secrets に登録）');
  const creds = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
}

/**
 * スプレッドシートから当日行を取得
 * A=日付, B=睡眠スコア … J=ルームマシン（1行目は見出し）
 */
export async function fetchTodayHealthRow() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheetName = process.env.SHEET_NAME || '健康チェック';
  const daysOffset = parseInt(process.env.DAYS_OFFSET || '0', 10);

  if (!spreadsheetId) throw new Error('SPREADSHEET_ID が未設定です');

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const range = `'${sheetName.replace(/'/g, "''")}'!A1:J200`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values;
  if (!values || values.length < 2) throw new Error('シートにデータがありません');

  const headers = values[0].map((x) => String(x).trim());
  let iDate = headers.indexOf('日付');
  if (iDate < 0) iDate = 0;

  const yStr = targetYmd(daysOffset);

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const cell = row[iDate];
    if (cell === '' || cell == null) continue;
    const rowStr = normalizeHealthDate(cell);
    if (rowStr === yStr) {
      return mapRow(row);
    }
  }
  throw new Error(`日付 ${yStr} の行が見つかりません（列「日付」または A 列の書式を確認）`);
}

function mapRow(row) {
  const g = (i) => (row[i] !== undefined && row[i] !== '' ? row[i] : '');
  return {
    date: g(0),
    sleepScore: g(1),
    sleepDuration: g(2),
    steps: g(3),
    bedtime: g(4),
    wakeup: g(5),
    mood: g(6),
    bowel: g(7),
    walk: g(8),
    roomMachine: g(9)
  };
}
