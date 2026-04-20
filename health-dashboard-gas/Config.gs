// ============================================================
// Config.gs — 健康チェック（LINE・シート名・列名）
// ============================================================
//
// スクリプトプロパティ（健康ダッシュボード用 LINE のみ。学習レポートの LINE_* は使いません）
//   HEALTH_LINE_CHANNEL_TOKEN … Messaging API のチャネルアクセストークン
//   HEALTH_LINE_TO_ID … 送信先（ユーザーID または グループID）
//
// 任意:
//   HEALTH_SHEET_NAME … データシート名（未設定なら「健康チェック」）
//   USE_LINE_PLAIN_TEXT = true … Flex ではなくテキスト送信
//
// 送信で参照するシート上の「日付」: 今日から何日前か（0 = 当日、1 = 前日）
const DAYS_OFFSET = 0;

/** 1行目と完全一致（「健康チェック」シート） */
const HC_DATE = '日付';
const HC_SLEEP_SCORE = '睡眠スコア';
const HC_SLEEP_DURATION = '睡眠時間';
const HC_STEPS = '歩数';
const HC_BEDTIME = '就寝';
const HC_WAKEUP = '起床';
const HC_MOOD = '気分';
const HC_BOWEL = '便通';
const HC_WALK = '朝散歩';
const HC_ROOM = 'ルームマシン';

/** 旧ひな型・他ファイル互換（日付列名のみ共通で使う場合） */
const H_DATE = HC_DATE;

function getLineToken_() {
  return PropertiesService.getScriptProperties().getProperty('HEALTH_LINE_CHANNEL_TOKEN') || '';
}

function getLineToId_() {
  return PropertiesService.getScriptProperties().getProperty('HEALTH_LINE_TO_ID') || '';
}

/** 常に名前付きシート（既定「健康チェック」）。アクティブシートにはフォールバックしない。 */
function getHealthCheckSheetName_() {
  var p = PropertiesService.getScriptProperties().getProperty('HEALTH_SHEET_NAME');
  if (p != null && String(p).trim() !== '') return String(p).trim();
  return '健康チェック';
}

/** HealthSignals.gs 等の既存名向けエイリアス */
function getHealthSheetName_() {
  return getHealthCheckSheetName_();
}

/**
 * HealthSignals 用に A〜J の並びの配列にする（A=日付, B=睡眠スコア, …）
 * @param {Object} row ヘッダ名→セル値
 * @return {Array}
 */
function healthCheckRowToValuesArray_(row) {
  return [
    row[HC_DATE],
    row[HC_SLEEP_SCORE],
    row[HC_SLEEP_DURATION],
    row[HC_STEPS],
    row[HC_BEDTIME],
    row[HC_WAKEUP],
    row[HC_MOOD],
    row[HC_BOWEL],
    row[HC_WALK],
    row[HC_ROOM]
  ];
}
