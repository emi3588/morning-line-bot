// ============================================================
// store.gs — スプレッドシート読み書き（LockService 排他制御）
// ============================================================

// --- シート取得（なければ自動作成） ---

function getRecordSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.LOG);
    sheet.appendRow([
      'タイムスタンプ', '年月', '対象者ID', '対象者名',
      '操作', '回数', '記録者ID', '記録者名'
    ]);
    sheet.getRange('B:B').setNumberFormat('@');
  }
  return sheet;
}

function getMemberSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.MEMBERS);
    sheet.appendRow(['User ID', '表示名', '登録日']);
  }
  return sheet;
}

// --- 行 → オブジェクト変換 ---

function parseLogRow_(row) {
  return {
    timestamp:    row[0],
    yearMonth:    normalizeYearMonth_(row[1]),
    targetId:     String(row[2]),
    targetName:   row[3],
    action:       row[4],
    count:        row[5],
    recorderId:   String(row[6]),
    recorderName: row[7]
  };
}

function normalizeYearMonth_(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = ('0' + (value.getMonth() + 1)).slice(-2);
    return y + '-' + m;
  }
  return String(value);
}

function parseMemberRow_(row) {
  return {
    userId:       String(row[0]),
    displayName:  row[1],
    registeredAt: row[2]
  };
}

// --- 記録ログ ---

function appendRecord(record) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getRecordSheet_().appendRow(record);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function getMonthRecords(yearMonth) {
  const data = getRecordSheet_().getDataRange().getValues();
  return data.slice(1)
    .filter(row => normalizeYearMonth_(row[1]) === yearMonth)
    .map(parseLogRow_);
}

function getRecentRecords(limit) {
  const sheet = getRecordSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const startRow = Math.max(2, lastRow - limit + 1);
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, 8).getValues();

  return data.reverse().slice(0, limit).map(parseLogRow_);
}

// --- メンバー ---

function getMembers() {
  const data = getMemberSheet_().getDataRange().getValues();
  return data.slice(1).map(parseMemberRow_);
}

function findMemberByName(name) {
  return getMembers().filter(m => m.displayName === name);
}

function upsertMember(userId, displayName) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getMemberSheet_();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(userId)) {
        if (data[i][1] !== displayName) {
          sheet.getRange(i + 1, 2).setValue(displayName);
          SpreadsheetApp.flush();
        }
        return;
      }
    }
    sheet.appendRow([userId, displayName, new Date()]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}
