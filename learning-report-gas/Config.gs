// ============================================================
// Config.gs — スクリプトプロパティ名・列ヘッダー（1行目と完全一致）
// ============================================================
// スクリプトプロパティ:
//   LINE_CHANNEL_TOKEN … LINE Messaging API のチャネルアクセストークン（長期）
//   LINE_TO_ID         … プッシュ先（ユーザID または グループID）
//
// 任意:
//   SHEET_NAME         … 学習記録シート名（未設定ならアクティブシート）
//   OPENAI_API_KEY     … 設定時のみ「AIで推敲」メニューで利用
//   USE_LINE_PLAIN_TEXT … "true" のときだけ従来のテキスト送信（既定は Flex カード）

function getOpenAiKey_() {
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
}

function getLineToken_() {
  return PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_TOKEN');
}

function getLineToId_() {
  return PropertiesService.getScriptProperties().getProperty('LINE_TO_ID');
}

function getLearningSheetName_() {
  return PropertiesService.getScriptProperties().getProperty('SHEET_NAME') || '';
}

/** シート1行目の列名と同じ文字列にすること */
const HEADER_DATE = '日付';
const HEADER_STREAK = '連続';
const HEADER_COURSES = '完了コース数';
const HEADER_LESSONS = '完了レッスン';
const HEADER_WEEK = '週間';
const HEADER_MONTH = '月間';
const HEADER_TOTAL = '累計';
const HEADER_YESTERDAY = '昨日の学習';
const HEADER_UNDERSTOOD = '理解できたこと';
const HEADER_VAGUE = 'まだ曖昧なこと';
/** フォーカス列（シート1行目はどれか1つでOK） */
const FOCUS_COLUMN_HEADERS_ = ['今日のフォーカス', '今日やる１つ', '今日やる1つ'];

const HEADER_TERM = '今日の用語';
