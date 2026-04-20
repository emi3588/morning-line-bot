// ============================================================
// Sheet.gs — 「健康チェック」シートから対象日の1行
// ============================================================
//
// getRange(row, column, numRows, numColumns) の第3・第4引数は「行数・列数」
// データは 2 行目以降。値の取り込みは「見出しの列番号」を優先し、空なら A〜J の位置で補完。
// ============================================================

/** Config のキー順＝通常は A〜J の列順（0 始まりインデックスと一致） */
var HEALTH_CHECK_KEY_ORDER = [
  HC_DATE,
  HC_SLEEP_SCORE,
  HC_SLEEP_DURATION,
  HC_STEPS,
  HC_BEDTIME,
  HC_WAKEUP,
  HC_MOOD,
  HC_BOWEL,
  HC_WALK,
  HC_ROOM
];

/**
 * シート「健康チェック」（または HEALTH_SHEET_NAME）から、DAYS_OFFSET に対応する日付の行。
 * @return {Object|null} Config の HC_* をキーにした1行
 */
function getHealthCheckReportRow_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = getHealthCheckSheetName_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('シート「' + name + '」が見つかりません。名前を確認するか、スクリプトプロパティ HEALTH_SHEET_NAME を設定してください。');

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) lastCol = 1;
  lastCol = Math.max(lastCol, 10);

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  if (values.length < 2) return null;

  var headers = values[0].map(function (x) {
    return String(x).trim();
  });
  var iDate = headers.indexOf(HC_DATE);
  if (iDate < 0) iDate = 0;

  var tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  var target = new Date();
  target.setDate(target.getDate() - DAYS_OFFSET);
  var yStr = Utilities.formatDate(target, tz, 'yyyy-MM-dd');

  for (var r = 1; r < values.length; r++) {
    var dataRow = values[r];
    var cell = dataRow[iDate];
    if (cell === '' || cell == null) continue;
    var rowStr = normalizeHealthDate_(cell, tz);
    if (rowStr === yStr) {
      return buildHealthCheckRowObject_(headers, dataRow, iDate);
    }
  }
  return null;
}

/**
 * 1行分を { 睡眠スコア: … } 形式にまとめる。
 * 1) 見出し名が Config と一致する列を優先
 * 2) 日付はマッチに使った列 iDate を必ず採用
 * 3) まだ空のキーは「A=0列目が日付、B=1…」の位置で上書き（見出し表記ゆれ用）
 */
function buildHealthCheckRowObject_(headers, dataRow, iDate) {
  var o = {};
  var keys = HEALTH_CHECK_KEY_ORDER;

  for (var ki = 0; ki < keys.length; ki++) {
    var k = keys[ki];
    var hi = headers.indexOf(k);
    if (hi >= 0 && hi < dataRow.length) o[k] = dataRow[hi];
    else o[k] = '';
  }
  o[HC_DATE] = dataRow[iDate] !== undefined && dataRow[iDate] !== null ? dataRow[iDate] : o[HC_DATE];

  for (var i = 0; i < keys.length && i < dataRow.length; i++) {
    var k = keys[i];
    if (k === HC_DATE) continue;
    var v = dataRow[i];
    if (isHealthCellEmpty_(o[k]) && !isHealthCellEmpty_(v)) o[k] = v;
  }
  return o;
}

function isHealthCellEmpty_(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'number') return isNaN(v);
  if (typeof v === 'boolean') return false;
  return String(v).trim() === '';
}

/** @deprecated 後方互換。buildHealthCheckRowObject_ 内で統合済み */
function mergeHealthRowByFixedColumns_(rowArr, o) {
  var keys = HEALTH_CHECK_KEY_ORDER;
  for (var i = 0; i < keys.length && i < rowArr.length; i++) {
    var k = keys[i];
    if (k === HC_DATE) continue;
    var v = rowArr[i];
    if (isHealthCellEmpty_(o[k]) && !isHealthCellEmpty_(v)) o[k] = v;
  }
}

/** 後方互換 */
function getYesterdayHealthRow_() {
  return getHealthCheckReportRow_();
}

function normalizeHealthDate_(cell, tz) {
  if (cell instanceof Date) return Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
  var s = String(cell).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-');
  var mdw = s.match(/^(\d{1,2})\/(\d{1,2})\s*(?:\([^)]*\))?\s*$/);
  if (mdw) {
    var y = new Date().getFullYear();
    return y + '-' + ('0' + mdw[1]).slice(-2) + '-' + ('0' + mdw[2]).slice(-2);
  }
  var md = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    var y2 = new Date().getFullYear();
    return y2 + '-' + ('0' + md[1]).slice(-2) + '-' + ('0' + md[2]).slice(-2);
  }
  var p = new Date(s);
  if (!isNaN(p.getTime())) return Utilities.formatDate(p, tz, 'yyyy-MM-dd');
  return s;
}
