import { google } from 'googleapis';
const TZ = process.env.TIMEZONE || 'Asia/Tokyo';

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
  // シリアル値（数値）の場合 → 1900年1月1日起算のExcel日付
  if (typeof cell === 'number') {
    const d = new Date((cell - 25569) * 86400000);
    return formatYmdInTz(d, 'UTC');
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

export function targetYmd(daysOffset = 0) {
  const ms = Date.now() - Number(daysOffset || 0) * 86400000;
  return formatYmdInTz(new Date(ms), TZ);
}

function getAuth() {
  const raw = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!raw) throw new Error('GOOGLE_CREDENTIALS_JSON が未設定です');
  const creds = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
}

function fractionalDayToHhmm(v) {
  const totalMinutes = Math.round(v * 24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function normalizeTimeCell(cell) {
  if (cell == null || cell === '') return '';
  if (typeof cell === 'number') {
    return fractionalDayToHhmm(cell);
  }
  const s = String(cell).trim();
  const hms = s.match(/^(\d{1,2}):(\d{2}):\d{2}$/);
  if (hms) return `${parseInt(hms[1], 10)}:${hms[2]}`;
  const hm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return `${parseInt(hm[1], 10)}:${hm[2]}`;
  return s;
}

export async function fetchTodayHealthRow() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheetName = process.env.SHEET_NAME || '健康チェック';
  const daysOffset = parseInt(process.env.DAYS_OFFSET || '0', 10);
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID が未設定です');
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `'${sheetName.replace(/'/g, "''")}'!A1:J200`;

  // 日付列は FORMATTED_VALUE、時刻列は UNFORMATTED_VALUE が必要なので
  // まず FORMATTED_VALUE で全体取得して日付マッチ、
  // 次に UNFORMATTED_VALUE で時刻セルだけ取得する
  const resFmt = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'FORMATTED_VALUE'
  });
  const resRaw = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const valuesFmt = resFmt.data.values;
  const valuesRaw = resRaw.data.values;
  if (!valuesFmt || valuesFmt.length < 2) throw new Error('シートにデータがありません');

  const headers = valuesFmt[0].map((x) => String(x).trim());
  let iDate = headers.indexOf('日付');
  if (iDate < 0) iDate = 0;
  const yStr = targetYmd(daysOffset);

  for (let r = 1; r < valuesFmt.length; r++) {
    const rowFmt = valuesFmt[r];
    const rowRaw = valuesRaw[r] || [];
    const cell = rowFmt[iDate];
    if (cell === '' || cell == null) continue;
    const rowStr = normalizeHealthDate(cell);
    if (rowStr === yStr) {
      return mapRow(rowFmt, rowRaw);
    }
  }
  throw new Error(`日付 ${yStr} の行が見つかりません`);
}

function mapRow(rowFmt, rowRaw) {
  const g = (i) => (rowFmt[i] !== undefined && rowFmt[i] !== '' ? rowFmt[i] : '');
  const gRaw = (i) => (rowRaw[i] !== undefined && rowRaw[i] !== '' ? rowRaw[i] : '');
  return {
    date: g(0),
    sleepScore: g(1),
    sleepDuration: normalizeTimeCell(gRaw(2)),
    steps: g(3),
    bedtime: normalizeTimeCell(gRaw(4)),
    wakeup: normalizeTimeCell(gRaw(5)),
    mood: g(6),
    bowel: g(7),
    walk: g(8),
    roomMachine: g(9)
  };
}
