// ============================================================
// Main.gs — 健康チェック（「健康チェック」シート → HEALTH_LINE_* で送信）
// 学習レポート用の LINE_CHANNEL_TOKEN / LINE_TO_ID は使いません。
// ============================================================

function sendHealthDashboardReport() {
  var token = getLineToken_();
  var to = getLineToId_();
  if (!token || !to) {
    throw new Error(
      '健康チェック用 LINE が未設定です。スクリプトのプロパティに HEALTH_LINE_CHANNEL_TOKEN と HEALTH_LINE_TO_ID を追加してください（学習レポートの LINE_CHANNEL_TOKEN とは別名です）。'
    );
  }

  var row = getHealthCheckReportRow_();
  if (!row) {
    var sheetLabel = getHealthCheckSheetName_();
    pushLineTextHealth_(
      '【健康チェック】「' +
        sheetLabel +
        '」で、日付列「' +
        HC_DATE +
        '」が ' +
        DAYS_OFFSET +
        ' 日前の日付と一致する行がありません。日付の書式（例: 4/18 や 4/18 (土)）を確認してください。'
    );
    return;
  }

  var vals = healthCheckRowToValuesArray_(row);
  var signals = evaluateHealthSignalsFromRow_(vals);
  var ev = summarizeHealthFromSignals_(signals, row);
  var tips = buildHealthSuggestionsForHealthCheck_(ev.tier, ev.reasons);
  var plain = PropertiesService.getScriptProperties().getProperty('USE_LINE_PLAIN_TEXT') === 'true';

  if (plain) {
    pushLineTextHealth_(formatHealthCheckPlain_(row, signals, ev, tips));
    return;
  }
  try {
    pushLineFlexHealth_(buildHealthCheckFlex_(row, signals, ev, tips));
  } catch (e) {
    console.error(e);
    pushLineTextHealth_(formatHealthCheckPlain_(row, signals, ev, tips));
  }
}

function formatHealthCheckPlain_(row, signals, ev, tips) {
  var lines = [
    '【健康チェック】',
    ev.emoji + ' まとめ: ' + ev.tier,
    '',
    HC_SLEEP_SCORE + ': ' + cellOrDashPlain_(row, HC_SLEEP_SCORE) + '（' + signalLabelJa_(signals.sleepScore) + '）',
    HC_SLEEP_DURATION + ': ' + cellOrDashPlain_(row, HC_SLEEP_DURATION) + '（' + signalLabelJa_(signals.sleepHours) + '）',
    HC_STEPS + ': ' + cellOrDashPlain_(row, HC_STEPS) + '（' + signalLabelJa_(signals.steps) + '）',
    HC_BEDTIME + ': ' + cellOrDashPlain_(row, HC_BEDTIME) + '（' + signalLabelJa_(signals.bedtime) + '）',
    HC_WAKEUP + ': ' + cellOrDashPlain_(row, HC_WAKEUP) + '（' + signalLabelJa_(signals.wakeup) + '）',
    HC_MOOD + ': ' + cellOrDashPlain_(row, HC_MOOD) + '（' + signalLabelJa_(signals.mood) + '）',
    HC_BOWEL + ': ' + cellOrDashPlain_(row, HC_BOWEL) + '（' + signalLabelJa_(signals.bowel) + '）',
    HC_WALK + ': ' + cellOrDashPlain_(row, HC_WALK) + '（' + signalLabelJa_(signals.walk) + '）',
    HC_ROOM + ': ' + cellOrDashPlain_(row, HC_ROOM) + '（' + signalLabelJa_(signals.roomMachine) + '）',
    '',
    '■ 気になる点',
    ev.reasons.join('\n'),
    '',
    '■ 改善ヒント',
    tips.map(function (t, i) {
      return i + 1 + '. ' + t;
    }).join('\n')
  ];
  return lines.join('\n');
}

function signalLabelJa_(s) {
  if (s === 'green') return '緑';
  if (s === 'yellow') return '黄';
  return '赤';
}

function cellOrDashPlain_(row, key) {
  var v = row[key];
  if (v === undefined || v === null) return '—';
  if (typeof v === 'number') return isNaN(v) ? '—' : String(v);
  if (v instanceof Date) {
    var tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
    return Utilities.formatDate(v, tz, 'HH:mm');
  }
  if (String(v).trim() === '') return '—';
  return String(v);
}

/**
 * 信号から総合ティア（順調 / 注意 / 危険）
 * @param {Object} signals
 * @param {Object} row ログ用
 */
function summarizeHealthFromSignals_(signals, row) {
  var labels = {
    sleepScore: HC_SLEEP_SCORE,
    sleepHours: HC_SLEEP_DURATION,
    steps: HC_STEPS,
    bedtime: HC_BEDTIME,
    wakeup: HC_WAKEUP,
    mood: HC_MOOD,
    bowel: HC_BOWEL,
    walk: HC_WALK,
    roomMachine: HC_ROOM
  };
  var reds = [];
  var yellows = [];
  Object.keys(labels).forEach(function (k) {
    if (signals[k] === 'red') reds.push(labels[k]);
    else if (signals[k] === 'yellow') yellows.push(labels[k]);
  });

  var reasons = [];
  if (reds.length) reasons.push('赤信号: ' + reds.join('、'));
  if (yellows.length) reasons.push('黄信号: ' + yellows.join('、'));
  if (!reasons.length) reasons.push('大きな問題は見つかりませんでした');

  var worst = reds.length >= 4 ? 2 : reds.length >= 1 ? 1 : yellows.length >= 5 ? 1 : 0;
  var tier;
  var emoji;
  if (worst >= 2) {
    tier = '危険';
    emoji = '🔴';
  } else if (worst >= 1) {
    tier = '注意';
    emoji = '🟡';
  } else {
    tier = '順調';
    emoji = '🟢';
  }
  return { tier: tier, emoji: emoji, reasons: reasons };
}

function buildHealthSuggestionsForHealthCheck_(tier, reasons) {
  var base = [
    '就寝は22時前を目指す',
    '睡眠時間を7時間に近づける',
    '歩数8000を目標に散歩を足す'
  ];
  if (tier === '危険') {
    return ['今夜はスマホを早めに置く', '明日の予定を1つ減らす', 'こまめに水分を取る'];
  }
  if (tier === '注意') {
    return ['睡眠を30分伸ばす目標をつける', reasons[0] + ' を次の1週間のテーマにする', base[2]];
  }
  return base;
}

function debugHealthSample() {
  if (!getLineToken_() || !getLineToId_()) {
    throw new Error('HEALTH_LINE_CHANNEL_TOKEN と HEALTH_LINE_TO_ID を設定してからサンプル送信を実行してください。');
  }
  var row = {};
  row[HC_DATE] = '4/18';
  row[HC_SLEEP_SCORE] = 66;
  row[HC_SLEEP_DURATION] = '5時間17分';
  row[HC_STEPS] = 6070;
  row[HC_BEDTIME] = '23:30';
  row[HC_WAKEUP] = '5:23';
  row[HC_MOOD] = '普通';
  row[HC_BOWEL] = '〇';
  row[HC_WALK] = '○';
  row[HC_ROOM] = '○';
  var vals = healthCheckRowToValuesArray_(row);
  var signals = evaluateHealthSignalsFromRow_(vals);
  var ev = summarizeHealthFromSignals_(signals, row);
  var tips = buildHealthSuggestionsForHealthCheck_(ev.tier, ev.reasons);
  var plain = PropertiesService.getScriptProperties().getProperty('USE_LINE_PLAIN_TEXT') === 'true';
  if (plain) pushLineTextHealth_(formatHealthCheckPlain_(row, signals, ev, tips));
  else pushLineFlexHealth_(buildHealthCheckFlex_(row, signals, ev, tips));
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('健康ダッシュボード')
    .addItem('▶ LINE送信（健康チェック・当日など DAYS_OFFSET）', 'sendHealthDashboardReport')
    .addItem('▶ サンプル送信（デモ行）', 'debugHealthSample')
    .addSeparator()
    .addItem('⏰ 平日9時トリガー（東京）', 'setupWeekday9am_')
    .addItem('⏰ トリガー削除', 'removeHealthTriggers_')
    .addToUi();
}

function setupWeekday9am_() {
  removeHealthTriggers_();
  var tz = 'Asia/Tokyo';
  var days = [
    ScriptApp.WeekDay.MONDAY,
    ScriptApp.WeekDay.TUESDAY,
    ScriptApp.WeekDay.WEDNESDAY,
    ScriptApp.WeekDay.THURSDAY,
    ScriptApp.WeekDay.FRIDAY
  ];
  days.forEach(function (wd) {
    ScriptApp.newTrigger('sendHealthDashboardReport')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(wd)
      .atHour(9)
      .inTimezone(tz)
      .create();
  });
  SpreadsheetApp.getUi().alert(
    '平日 9:00台（' + tz + '）に sendHealthDashboardReport が走るよう、月〜金のトリガーを5つ設定しました。'
  );
}

function removeHealthTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendHealthDashboardReport') ScriptApp.deleteTrigger(t);
  });
}

// ============================================================
// LINE Push
// ============================================================

function pushLineTextHealth_(text) {
  var token = getLineToken_();
  var to = getLineToId_();
  if (!token || !to) {
    throw new Error('HEALTH_LINE_CHANNEL_TOKEN または HEALTH_LINE_TO_ID が未設定です。');
  }
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      to: to,
      messages: [{ type: 'text', text: text }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('LINE text: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

function pushLineFlexHealth_(bubble) {
  var token = getLineToken_();
  var to = getLineToId_();
  if (!token || !to) {
    throw new Error('HEALTH_LINE_CHANNEL_TOKEN または HEALTH_LINE_TO_ID が未設定です。');
  }
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      to: to,
      messages: [{ type: 'flex', altText: '健康チェック', contents: bubble }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('LINE Flex: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}
