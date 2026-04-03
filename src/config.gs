// ============================================================
// config.gs — 定数 + PropertiesService ラッパー
// ============================================================

const PENALTY_AMOUNT = 500;
const MAX_BULK_ADD = 31;
const DUPLICATE_GUARD_SECONDS = 5;
const HISTORY_LIMIT = 10;
const SEPARATOR = '━━━━━━━━━━━━━━━';

const SHEET_NAMES = {
  LOG: '記録ログ',
  MEMBERS: 'メンバー'
};

const ACTIONS = {
  LATE: '遅刻',
  ADD: '追加',
  CANCEL: '取消'
};

// --- PropertiesService ラッパー ---

function getProps_() {
  return PropertiesService.getScriptProperties();
}

function getChannelToken() {
  return getProps_().getProperty('CHANNEL_ACCESS_TOKEN') || '';
}

function setChannelToken(token) {
  getProps_().setProperty('CHANNEL_ACCESS_TOKEN', token);
}

function getGroupId() {
  return getProps_().getProperty('GROUP_ID') || '';
}

function setGroupId(id) {
  getProps_().setProperty('GROUP_ID', id);
}

// --- フォーマッター ---

function getCurrentYearMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = ('0' + (now.getMonth() + 1)).slice(-2);
  return y + '-' + m;
}

function formatYen(amount) {
  return amount.toLocaleString('ja-JP') + '円';
}

function formatYearMonthLabel(ym) {
  const parts = ym.split('-');
  return parts[0] + '年' + parseInt(parts[1], 10) + '月';
}

function proxySuffix(recorderId, targetId, recorderName, verb) {
  if (recorderId === targetId) return '';
  return ' ※' + recorderName + 'が' + verb;
}
