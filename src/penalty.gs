// ============================================================
// penalty.gs — 遅刻記録 / 取消 / 追加 / 集計 / 履歴
// ============================================================

// --- 書き込みコマンド ---

function recordLate(targetId, targetName, recorderId, recorderName) {
  if (isDuplicateWrite_(recorderId, 'late_' + targetId)) {
    return '⚠️ 直前に同じ記録済みです。';
  }
  const ym = getCurrentYearMonth();
  appendRecord([
    new Date(), ym, targetId, targetName,
    ACTIONS.LATE, 1, recorderId, recorderName
  ]);

  const total = calcTotal_(ym, targetId);
  return '⏰ ' + targetName + ' 遅刻' + total + '回目（' + penaltyYen_(total) + '）'
    + proxySuffix(recorderId, targetId, recorderName, '記録');
}

function cancelLate(targetId, targetName, recorderId, recorderName) {
  const ym = getCurrentYearMonth();
  const total = calcTotal_(ym, targetId);
  if (total <= 0) {
    return '今月の' + targetName + 'さんの遅刻記録がないため、取り消せません。';
  }

  appendRecord([
    new Date(), ym, targetId, targetName,
    ACTIONS.CANCEL, -1, recorderId, recorderName
  ]);

  const newTotal = total - 1;
  const status = newTotal > 0
    ? '（残り' + newTotal + '回 / ' + penaltyYen_(newTotal) + '）'
    : '（今月の遅刻: 0回）';
  return '↩️ ' + targetName + ' の遅刻を1件取り消しました' + status
    + proxySuffix(recorderId, targetId, recorderName, '操作');
}

function addBulk(targetId, targetName, count, recorderId, recorderName) {
  if (isDuplicateWrite_(recorderId, 'add_' + targetId + '_' + count)) {
    return '⚠️ 直前に同じ記録済みです。';
  }
  const ym = getCurrentYearMonth();
  appendRecord([
    new Date(), ym, targetId, targetName,
    ACTIONS.ADD, count, recorderId, recorderName
  ]);

  const total = calcTotal_(ym, targetId);
  return '📝 ' + targetName + ' の遅刻を' + count + '回追加（累計' + total + '回 / ' + penaltyYen_(total) + '）'
    + proxySuffix(recorderId, targetId, recorderName, '記録');
}

// --- 参照コマンド ---

function getSummary() {
  const ym = getCurrentYearMonth();
  const agg = aggregate_(ym);

  const lines = ['📊 ' + formatYearMonthLabel(ym) + 'の遅刻集計', SEPARATOR];

  if (agg.ranked.length === 0 && agg.zeroNames.length === 0) {
    lines.push('メンバーの記録がありません。');
    lines.push('「遅刻」と投稿して記録を始めてください。');
    return lines.join('\n');
  }

  for (const entry of agg.ranked) {
    lines.push(formatEntryLine_(entry));
  }
  lines.push(SEPARATOR);
  lines.push('合計: ' + agg.grandTotal + '回（' + penaltyYen_(agg.grandTotal) + '）');

  if (agg.zeroNames.length > 0) {
    lines.push('遅刻なし: ' + agg.zeroNames.join('、'));
  }
  return lines.join('\n');
}

function getHistory() {
  const records = getRecentRecords(HISTORY_LIMIT);
  if (records.length === 0) {
    return '📋 記録がまだありません。';
  }

  const lines = ['📋 直近の記録', SEPARATOR];
  for (const record of records) {
    lines.push(formatHistoryLine_(record));
  }
  return lines.join('\n');
}

function getHelp() {
  return [
    '📖 朝活Bot コマンド一覧',
    SEPARATOR,
    '▶ 遅刻 → 自分の遅刻を記録',
    '▶ 遅刻 @名前 → 他の人の遅刻を代理で記録',
    '▶ 追加 ○回 → 自分の過去の遅刻をまとめて追加',
    '  例: 追加 3回',
    '▶ 追加 @名前 ○回 → 他の人の過去分を代理で追加',
    '▶ 集計 → 遅刻回数と罰金額を表示',
    '▶ 履歴 → 直近10件の記録を表示',
    '▶ 取消 → 自分の遅刻を1回取り消し',
    '▶ 取消 @名前 → 他の人の遅刻を代理で取り消し',
    '▶ ヘルプ → このメッセージを表示',
    '',
    '💰 遅刻1回 = ' + penaltyYen_(1),
    '📅 毎月1日に前月の集計が届きます'
  ].join('\n');
}

// --- 月次レポート（Push 用） ---

function getMonthlyReport(yearMonth) {
  const agg = aggregate_(yearMonth);

  const lines = ['📊 ' + formatYearMonthLabel(yearMonth) + ' 最終集計', SEPARATOR];

  for (const e of agg.all) {
    lines.push(e.count > 0 ? formatEntryLine_(e) : e.name + ': 0回');
  }
  lines.push(SEPARATOR);
  lines.push('合計: ' + agg.grandTotal + '回（' + penaltyYen_(agg.grandTotal) + '）');
  lines.push('');
  lines.push('💰 メンバー同士で精算をお願いします。');

  const parts = yearMonth.split('-');
  let nextMonth = parseInt(parts[1], 10) + 1;
  let nextYear = parseInt(parts[0], 10);
  if (nextMonth > 12) { nextMonth = 1; nextYear++; }
  lines.push(nextMonth + '月の記録がスタートしました！');

  return lines.join('\n');
}

// --- 内部ヘルパー ---

function penaltyYen_(count) {
  return formatYen(count * PENALTY_AMOUNT);
}

function formatEntryLine_(entry) {
  return entry.name + ': ' + entry.count + '回（' + penaltyYen_(entry.count) + '）';
}

function formatHistoryLine_(r) {
  const ts = r.timestamp;
  const dateStr = (ts.getMonth() + 1) + '/' + ts.getDate() + ' '
    + ('0' + ts.getHours()).slice(-2) + ':' + ('0' + ts.getMinutes()).slice(-2);

  let line = dateStr + ' ' + r.action + ' ' + r.targetName;
  if (r.action === ACTIONS.ADD && r.count > 1) {
    line += ' ×' + r.count + '回';
  }
  if (r.recorderId !== r.targetId) {
    line += ' ※' + r.recorderName + 'が記録';
  }
  return line;
}

/**
 * 月の記録を集計する。
 * ranked: 遅刻 > 0 を回数降順  /  zeroNames: 遅刻 0 の名前リスト
 * all: 全員を回数降順（月次レポート用）  /  grandTotal: 合計
 */
function aggregate_(yearMonth) {
  const records = getMonthRecords(yearMonth);
  const members = getMembers();

  const totals = {};
  for (const member of members) {
    totals[member.userId] = { name: member.displayName, count: 0 };
  }
  for (const r of records) {
    if (!totals[r.targetId]) {
      totals[r.targetId] = { name: r.targetName, count: 0 };
    }
    totals[r.targetId].count += r.count;
  }

  const ranked = [];
  const zeroNames = [];
  const all = [];
  let grandTotal = 0;

  for (const key of Object.keys(totals)) {
    const t = totals[key];
    const c = Math.max(0, t.count);
    const entry = { name: t.name, count: c };
    all.push(entry);
    if (c > 0) {
      ranked.push(entry);
      grandTotal += c;
    } else {
      zeroNames.push(t.name);
    }
  }

  const byCountDesc = (a, b) => b.count - a.count;
  ranked.sort(byCountDesc);
  all.sort(byCountDesc);

  return { ranked, zeroNames, all, grandTotal };
}

function calcTotal_(yearMonth, targetId) {
  const records = getMonthRecords(yearMonth);
  let total = 0;
  for (const r of records) {
    if (r.targetId === targetId) {
      total += r.count;
    }
  }
  return Math.max(0, total);
}

function isDuplicateWrite_(userId, actionKey) {
  const cache = CacheService.getScriptCache();
  const key = 'dup_' + userId + '_' + actionKey;
  if (cache.get(key)) return true;
  cache.put(key, '1', DUPLICATE_GUARD_SECONDS);
  return false;
}
