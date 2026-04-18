// ============================================================
// Main.gs — 毎朝の実行・手動テスト・トリガー設定
// ============================================================

/**
 * 時間トリガーから呼ぶ（毎朝7時用）
 * シートの数値・本文をそのまま LINE 文面に反映（OpenAI 不要）
 */
function sendDailyLearningReport() {
  try {
    const row = getYesterdayRow_();
    if (!row) {
      pushLineText_('【学習レポート】昨日分の行が見つかりませんでした。日付列（MM/dd など）を確認してください。');
      return;
    }
    sendLearningReportToLine_(row);
  } catch (e) {
    console.error(e);
    try {
      pushLineText_('【学習レポート】エラー: ' + e.message);
    } catch (ignore) {}
    throw e;
  }
}

/** ダミー行で LINE まで一気に試す（シート不要） */
function debugSendSampleReport() {
  const dummy = {};
  dummy[HEADER_DATE] = '04/16';
  dummy[HEADER_STREAK] = 39;
  dummy[HEADER_COURSES] = 7;
  dummy[HEADER_LESSONS] = 58;
  dummy[HEADER_WEEK] = '';
  dummy[HEADER_MONTH] = 154;
  dummy[HEADER_TOTAL] = 231;
  dummy[HEADER_YESTERDAY] = 'ひな型1を見本にモックアップ作成';
  dummy[HEADER_UNDERSTOOD] = 'githubflow';
  dummy[HEADER_VAGUE] = 'hotfix';
  dummy['今日のフォーカス'] = 'ひな型1（コミネコ）に近づける修正';
  dummy[HEADER_TERM] = 'githubflow出国ゲート';
  sendLearningReportToLine_(dummy);
}

/** Flex（デフォルト）またはプレーンテキスト。Flex が拒否されたらテキストにフォールバック */
function sendLearningReportToLine_(row) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('USE_LINE_PLAIN_TEXT') === 'true') {
    pushLineText_(formatLearningReportFromSheetRow_(row));
    return;
  }
  try {
    pushLineFlex_(buildLearningReportFlexBubble_(row));
  } catch (e) {
    console.error('Flex 送信に失敗したためテキストで送ります: ' + e);
    pushLineText_(formatLearningReportFromSheetRow_(row));
  }
}

/**
 * 任意: OpenAI で推敲してから送信（OPENAI_API_KEY が必要）
 */
function sendDailyLearningReportWithAI() {
  const key = getOpenAiKey_();
  if (!key) {
    SpreadsheetApp.getUi().alert('OPENAI_API_KEY が未設定です。');
    return;
  }
  const row = getYesterdayRow_();
  if (!row) {
    SpreadsheetApp.getUi().alert('昨日分の行が見つかりません。');
    return;
  }
  const base = formatLearningReportFromSheetRow_(row);
  const polished = polishReportWithOpenAI_(base, row);
  pushLineText_(polished);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('学習レポート')
    .addItem('▶ 昨日の行でレポート送信（Flexカード）', 'sendDailyLearningReport')
    .addItem('▶ サンプルで送信テスト（Flex）', 'debugSendSampleReport')
    .addItem('▶ 昨日の行→AI推敲→送信（任意）', 'sendDailyLearningReportWithAI')
    .addSeparator()
    .addItem('⏰ 毎朝7時トリガーを設定（東京）', 'setupDailyTrigger7am_')
    .addItem('⏰ 毎朝7時トリガーを削除', 'removeDailyTrigger_')
    .addToUi();
}

function setupDailyTrigger7am_() {
  removeDailyTrigger_();
  ScriptApp.newTrigger('sendDailyLearningReport')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .nearMinute(0)
    .inTimezone('Asia/Tokyo')
    .create();
  SpreadsheetApp.getUi().alert('毎朝 7:00〜8:00（東京）に sendDailyLearningReport を実行するトリガーを設定しました。');
}

function removeDailyTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDailyLearningReport') ScriptApp.deleteTrigger(t);
  });
}
