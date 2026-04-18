// ============================================================
// LinePush.gs — LINE にプッシュ（テキスト1通）
// ============================================================

function pushLineText_(text) {
  const token = getLineToken_();
  const to = getLineToId_();
  if (!token || !to) throw new Error('LINE_CHANNEL_TOKEN または LINE_TO_ID が未設定です。');

  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: to,
    messages: [{ type: 'text', text: text }]
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    console.error(res.getContentText());
    throw new Error('LINE push 失敗: HTTP ' + res.getResponseCode());
  }
}

/**
 * LINE Flex（カード風）でプッシュ
 * @param {Object} bubble LINE Flex の bubble オブジェクト（type: 'bubble'）
 */
function pushLineFlex_(bubble) {
  const token = getLineToken_();
  const to = getLineToId_();
  if (!token || !to) throw new Error('LINE_CHANNEL_TOKEN または LINE_TO_ID が未設定です。');

  const payload = {
    to: to,
    messages: [
      {
        type: 'flex',
        altText: '昨日の学習サマリー（キラキラ学習日記）',
        contents: bubble
      }
    ]
  };

  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    console.error(res.getContentText());
    throw new Error('LINE Flex push 失敗: HTTP ' + res.getResponseCode());
  }
}
