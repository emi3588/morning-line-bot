// ============================================================
// Sheet.gs — 前日ぶんの1行を取得
// ============================================================

/**
 * 学習記録シートから「昨日（スクリプトのタイムゾーン基準）」の行を1件返す。
 * @return {Object|null} 列名をキーにしたオブジェクト、見つからなければ null
 */
function getYesterdayRow_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = getLearningSheetName_();
  const sheet = name ? ss.getSheetByName(name) : ss.getActiveSheet();
  if (!sheet) throw new Error('シートが見つかりません: ' + (name || '(アクティブ)'));

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(String);
  const col = function (h) {
    const i = headers.indexOf(h);
    if (i < 0) throw new Error('列がありません: ' + h);
    return i;
  };

  const iDate = col(HEADER_DATE);
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');

  for (var r = 1; r < values.length; r++) {
    const cell = values[r][iDate];
    if (cell === '' || cell == null) continue;
    const rowDateStr = normalizeDateCell_(cell, tz);
    if (rowDateStr === yStr) {
      const row = values[r];
      var o = {};
      headers.forEach(function (h, idx) {
        o[h] = row[idx];
      });
      return o;
    }
  }
  return null;
}

/**
 * セルの日付を yyyy-MM-dd に正規化（比較用）
 * 対応: Date / yyyy-MM-dd / yyyy/MM/dd / MM/dd（年なし→実行年）
 */
function normalizeDateCell_(cell, tz) {
  if (cell instanceof Date) {
    return Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
  }
  const s = String(cell).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-');

  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    const y = new Date().getFullYear();
    const mm = ('0' + md[1]).slice(-2);
    const dd = ('0' + md[2]).slice(-2);
    return y + '-' + mm + '-' + dd;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, tz, 'yyyy-MM-dd');
  return s;
}
