// ============================================================
// line.gs — LINE Messaging API ラッパー
// ============================================================

const LINE_API_BASE = 'https://api.line.me/v2/bot';

function replyMessage(replyToken, text) {
  const url = LINE_API_BASE + '/message/reply';
  const payload = {
    replyToken: replyToken,
    messages: [{ type: 'text', text: text }]
  };
  const res = callLineApi_(url, payload);
  if (res && res.getResponseCode() !== 200) {
    console.error('replyMessage failed: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

function pushMessage(to, text) {
  const url = LINE_API_BASE + '/message/push';
  const payload = {
    to: to,
    messages: [{ type: 'text', text: text }]
  };
  const res = callLineApi_(url, payload);
  if (res && res.getResponseCode() !== 200) {
    console.error('pushMessage failed: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

function getGroupMemberProfile(groupId, userId) {
  const url = LINE_API_BASE + '/group/' + groupId + '/member/' + userId;
  const options = {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + getChannelToken() },
    muteHttpExceptions: true
  };
  try {
    const res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() !== 200) {
      console.warn('getGroupMemberProfile failed for ' + userId + ': ' + res.getResponseCode());
      return null;
    }
    return JSON.parse(res.getContentText());
  } catch (e) {
    console.error('getGroupMemberProfile error: ' + e.message);
    return null;
  }
}

function callLineApi_(url, payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + getChannelToken() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    return UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error('LINE API call failed: ' + e.message);
    return null;
  }
}
