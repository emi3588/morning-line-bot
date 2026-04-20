// ============================================================
// HealthSignals.gs — 最新行の各項目を green / yellow / red で判定
// 列: B 睡眠スコア, C 睡眠時間, D 歩数, E 就寝, F 起床, G 気分, H 便通, I 朝散歩, J ルームマシン
// ============================================================

/** 0始まり列インデックス（A=0 → B=1 … J=9） */
var HEALTH_SIGNAL_COL = {
  SLEEP_SCORE: 1,
  SLEEP_DURATION: 2,
  STEPS: 3,
  BEDTIME: 4,
  WAKEUP: 5,
  MOOD: 6,
  BOWEL: 7,
  WALK: 8,
  ROOM_MACHINE: 9
};

/**
 * アクティブ（または SHEET_NAME）のシートで、データがある最終行を1行返す。
 * @returns {Object|null} { rowIndex1Based, values } ヘッダー行のみのとき null
 */
function getLatestDataRowFromHealthSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = getHealthSheetName_();
  var sheet = name ? ss.getSheetByName(name) : ss.getActiveSheet();
  if (!sheet) throw new Error('シートが見つかりません');

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  // getRange(row, col, numRows, numCols) … 第3・第4は「個数」（終了座標ではない）
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) lastCol = 1;
  lastCol = Math.max(lastCol, 10);
  var row = sheet.getRange(lastRow, 1, 1, lastCol).getValues()[0];
  return { rowIndex1Based: lastRow, values: row };
}

/**
 * シート1行（A列〜十分な列）から B〜J を読み、信号色オブジェクトを返す。
 * @param {Array} rowValues getValues の1行（A=row[0], B=row[1], …）
 * @return {{
 *   sleepScore: string,
 *   sleepHours: string,
 *   steps: string,
 *   bedtime: string,
 *   wakeup: string,
 *   mood: string,
 *   bowel: string,
 *   walk: string,
 *   roomMachine: string
 * }}
 */
function evaluateHealthSignalsFromRow_(rowValues) {
  var c = HEALTH_SIGNAL_COL;
  return {
    sleepScore: evaluateSleepScoreSignal_(rowValues[c.SLEEP_SCORE]),
    sleepHours: evaluateSleepDurationSignal_(rowValues[c.SLEEP_DURATION]),
    steps: evaluateStepsSignal_(rowValues[c.STEPS]),
    bedtime: evaluateBedtimeSignal_(rowValues[c.BEDTIME]),
    wakeup: evaluateWakeupSignal_(rowValues[c.WAKEUP]),
    mood: evaluateMoodSignal_(rowValues[c.MOOD]),
    bowel: evaluateCircleFieldSignal_(rowValues[c.BOWEL]),
    walk: evaluateCircleFieldSignal_(rowValues[c.WALK]),
    roomMachine: evaluateCircleFieldSignal_(rowValues[c.ROOM_MACHINE])
  };
}

/**
 * 最新データ行を判定してオブジェクトで返す（LINE送信はしない）。
 * @return {Object|null} データ行がないとき null。あるときは signals に判定、raw に生セル
 */
function evaluateLatestHealthSignals_() {
  var pack = getLatestDataRowFromHealthSheet_();
  if (!pack) return null;
  return {
    rowIndex1Based: pack.rowIndex1Based,
    raw: {
      sleepScore: pack.values[HEALTH_SIGNAL_COL.SLEEP_SCORE],
      sleepDuration: pack.values[HEALTH_SIGNAL_COL.SLEEP_DURATION],
      steps: pack.values[HEALTH_SIGNAL_COL.STEPS],
      bedtime: pack.values[HEALTH_SIGNAL_COL.BEDTIME],
      wakeup: pack.values[HEALTH_SIGNAL_COL.WAKEUP],
      mood: pack.values[HEALTH_SIGNAL_COL.MOOD],
      bowel: pack.values[HEALTH_SIGNAL_COL.BOWEL],
      walk: pack.values[HEALTH_SIGNAL_COL.WALK],
      roomMachine: pack.values[HEALTH_SIGNAL_COL.ROOM_MACHINE]
    },
    signals: evaluateHealthSignalsFromRow_(pack.values)
  };
}

/** Apps Script エディタで実行 → ログで確認 */
function logLatestHealthSignalsForDebug() {
  var result = evaluateLatestHealthSignals_();
  if (!result) {
    Logger.log('データ行がありません（2行目以降が必要です）。');
    return;
  }
  Logger.log('row=' + result.rowIndex1Based);
  Logger.log('raw=' + JSON.stringify(result.raw));
  Logger.log('signals=' + JSON.stringify(result.signals, null, 2));
}

// ----- 個別判定 -----

function evaluateSleepScoreSignal_(cell) {
  var n = parseNumberLoose_(cell);
  if (n == null) return 'red';
  if (n >= 80) return 'green';
  if (n >= 60) return 'yellow';
  return 'red';
}

/** 「5時間17分」「7時間」「6時間59分」など */
function evaluateSleepDurationSignal_(cell) {
  var minutes = parseJapaneseDurationToMinutes_(cell);
  if (minutes == null) return 'red';
  if (minutes >= 7 * 60) return 'green';
  if (minutes >= 6 * 60) return 'yellow';
  return 'red';
}

function evaluateStepsSignal_(cell) {
  var n = parseNumberLoose_(cell);
  if (n == null) return 'red';
  if (n >= 8000) return 'green';
  if (n >= 5000) return 'yellow';
  return 'red';
}

/** 「23:30」形式。同日の分・秒として比較 */
function evaluateBedtimeSignal_(cell) {
  var m = parseClockToMinutesFromMidnight_(cell);
  if (m == null) return 'red';
  if (m <= 22 * 60) return 'green';
  if (m <= 23 * 60) return 'yellow';
  return 'red';
}

/** 「5:23」形式 */
function evaluateWakeupSignal_(cell) {
  var m = parseClockToMinutesFromMidnight_(cell);
  if (m == null) return 'red';
  if (m <= 4 * 60 + 59) return 'red';
  if (m <= 5 * 60 + 59) return 'green';
  return 'yellow';
}

function evaluateMoodSignal_(cell) {
  if (cell === '' || cell == null) return 'yellow';
  var s = String(cell).trim();
  if (s === '良い') return 'green';
  if (s === '普通') return 'yellow';
  if (s === '悪い') return 'red';
  return 'yellow';
}

/** ○（緑） / × または空欄（赤） */
function evaluateCircleFieldSignal_(cell) {
  if (isCircleMark_(cell)) return 'green';
  return 'red';
}

// ----- パース・ユーティリティ -----

function parseNumberLoose_(cell) {
  if (cell === '' || cell == null) return null;
  if (typeof cell === 'number' && !isNaN(cell)) return cell;
  var s = String(cell).trim().replace(/,/g, '');
  if (!s) return null;
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * @param {*} cell
 * @return {number|null} 合計分
 */
function parseJapaneseDurationToMinutes_(cell) {
  if (cell === '' || cell == null) return null;
  if (typeof cell === 'number' && !isNaN(cell)) {
    // 数値だけ入っている場合は「時間」の小数として扱う
    return Math.round(cell * 60);
  }
  var s = String(cell).trim().replace(/\s+/g, '');
  if (!s) return null;
  var re = /^(\d+(?:\.\d+)?)時間(?:(\d+)分)?$/;
  var m = s.match(re);
  if (!m) return null;
  var h = parseFloat(m[1]);
  if (isNaN(h)) return null;
  var minPart = m[2] != null && m[2] !== '' ? parseInt(m[2], 10) : 0;
  if (isNaN(minPart)) return null;
  return Math.round(h * 60) + minPart;
}

/**
 * @param {*} cell Date または "HH:mm" / "H:mm"
 * @return {number|null} 0時からの経過分
 */
function parseClockToMinutesFromMidnight_(cell) {
  if (cell === '' || cell == null) return null;
  if (cell instanceof Date) {
    return cell.getHours() * 60 + cell.getMinutes();
  }
  var s = String(cell).trim();
  var md = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!md) return null;
  var h = parseInt(md[1], 10);
  var mi = parseInt(md[2], 10);
  if (isNaN(h) || isNaN(mi) || h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

function isCircleMark_(cell) {
  if (cell === '' || cell == null) return false;
  var s = String(cell).trim();
  if (!s) return false;
  // ○ U+25CB, 〇 U+3007, ◯ U+25EF
  return s === '○' || s === '〇' || s === '◯';
}
