// ============================================================
// FormatReport.gs — シート1行から LINE 用テキストを組み立て
// ============================================================

/** 空なら「—」 */
function cellDisplay_(row, header) {
  if (!row || row[header] === undefined || row[header] === '') return '—';
  const v = row[header];
  if (v instanceof Date) {
    const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
    return Utilities.formatDate(v, tz, 'MM/dd');
  }
  const s = String(v).trim();
  return s === '' ? '—' : s;
}

/** 複数ヘッダーのうち、最初に値がある列を使う（今日のフォーカス / 今日やる１つ など） */
function cellDisplayFirst_(row, headers) {
  if (!row || !headers || !headers.length) return '—';
  for (var i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '') {
      return cellDisplay_(row, h);
    }
  }
  return '—';
}

var WEEKDAY_JA_ = ['日', '月', '火', '水', '木', '金', '土'];

/** 日付セルから「yyyy年M月d日（木）」のみ。取れなければ空文字 */
function getRecordDatePretty_(row) {
  if (!row || row[HEADER_DATE] === undefined || row[HEADER_DATE] === '') return '';
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  var d = null;
  const v = row[HEADER_DATE];
  if (v instanceof Date) {
    d = v;
  } else {
    const s = String(v).trim();
    const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
      d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    } else {
      const md = s.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (md) {
        const y = new Date().getFullYear();
        d = new Date(y, Number(md[1]) - 1, Number(md[2]));
      } else {
        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
    }
  }
  if (!d || isNaN(d.getTime())) return '';
  const wd = WEEKDAY_JA_[d.getDay()];
  return Utilities.formatDate(d, tz, 'yyyy年M月d日') + '（' + wd + '）';
}

/** シートの「日付」セルから表示用の1行（例: 記録の日付　2026年4月16日（木）） */
function formatRecordDateLine_(row) {
  const label = getRecordDatePretty_(row);
  if (!label) return '記録の日付　' + (row && row[HEADER_DATE] !== undefined ? String(row[HEADER_DATE]) : '—');
  return '記録の日付　' + label;
}

function separatorLine_() {
  return '━━━━━━━━━━━━━━━━';
}

/**
 * LINE 用プレーンテキスト（HTMLモックとは別物。区切り・絵文字で読みやすく）
 * モックに近い「順番・塊」は再現するが、色・角丸は不可。
 */
function formatLearningReportFromSheetRow_(row) {
  const streak = cellDisplay_(row, HEADER_STREAK);
  const courses = cellDisplay_(row, HEADER_COURSES);
  const lessons = cellDisplay_(row, HEADER_LESSONS);
  const week = cellDisplay_(row, HEADER_WEEK);
  const month = cellDisplay_(row, HEADER_MONTH);
  const total = cellDisplay_(row, HEADER_TOTAL);

  const lines = [];
  lines.push('昨日の学習サマリー');
  lines.push('キラキラ学習日記 ✨');
  lines.push('');
  lines.push('📅 ' + formatRecordDateLine_(row));
  lines.push(separatorLine_());
  lines.push('');
  lines.push('【記録サマリー】');
  lines.push('🔥 連続　　　' + streak);
  lines.push('　完了コース　' + courses);
  lines.push('　完了レッスン ' + lessons);
  lines.push('　週間　　　　' + week);
  lines.push('　月間　　　　' + month);
  lines.push('　累計　　　　' + total);
  lines.push(separatorLine_());
  lines.push('');
  lines.push('【昨日の学習】');
  lines.push(cellDisplay_(row, HEADER_YESTERDAY));
  lines.push('');
  lines.push('【理解できたこと】（覚えた用語）');
  lines.push(cellDisplay_(row, HEADER_UNDERSTOOD));
  lines.push('');
  lines.push('【まだ曖昧なこと】（課題）');
  lines.push(cellDisplay_(row, HEADER_VAGUE));
  lines.push('');
  lines.push('【今日のフォーカス】');
  lines.push(cellDisplayFirst_(row, FOCUS_COLUMN_HEADERS_));
  lines.push('');
  lines.push('【今日の用語】');
  lines.push(cellDisplay_(row, HEADER_TERM));

  return lines.join('\n');
}
