// ============================================================
// main.gs — エントリポイント（Webhook / メニュー / 月次トリガー）
// ============================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const events = body.events;
    if (!events || events.length === 0) return;

    for (const event of events) {
      processEvent_(event);
    }
  } catch (err) {
    console.error('doPost error: ' + err.message + '\n' + err.stack);
  }
}

// --- イベント処理 ---

function processEvent_(event) {
  try {
    const cache = CacheService.getScriptCache();
    const eventId = event.webhookEventId;
    if (eventId) {
      if (cache.get(eventId)) return;
      cache.put(eventId, '1', 21600);
    }

    if (event.source && event.source.type === 'group' && !getGroupId()) {
      setGroupId(event.source.groupId);
    }

    switch (event.type) {
      case 'join':
        handleJoin_(event);
        break;
      case 'message':
        if (event.message && event.message.type === 'text') {
          handleTextMessage_(event);
        }
        break;
    }
  } catch (err) {
    console.error('processEvent_ error: ' + err.message + '\n' + err.stack);
    if (event.replyToken) {
      try {
        replyMessage(event.replyToken, '処理中にエラーが発生しました。もう一度お試しください。');
      } catch (replyErr) {
        console.error('Error reply failed: ' + replyErr.message);
      }
    }
  }
}

function handleJoin_(event) {
  if (event.source && event.source.groupId) {
    setGroupId(event.source.groupId);
  }
  const welcome = [
    '朝活Botがグループに参加しました！',
    '',
    '「遅刻」→ 遅刻を記録',
    '「集計」→ 今月の遅刻回数と罰金額',
    '「ヘルプ」→ 全コマンド一覧',
    '',
    'まずは「ヘルプ」と送ってみてください。'
  ].join('\n');
  replyMessage(event.replyToken, welcome);
}

function handleTextMessage_(event) {
  if (!event.source || event.source.type !== 'group') {
    replyMessage(event.replyToken, 'このBotはグループチャットで使ってください。');
    return;
  }

  const senderId = event.source.userId;
  const groupId = event.source.groupId;
  if (!senderId) return;

  const mentionees = (event.message.mention && event.message.mention.mentionees) || [];

  const senderResolver = () => {
    const profile = getGroupMemberProfile(groupId, senderId);
    if (!profile) return null;
    upsertMember(senderId, profile.displayName);
    return { id: senderId, name: profile.displayName };
  };

  const result = dispatch(event.message.text, senderResolver, groupId, mentionees);
  if (result === null) return;

  replyMessage(event.replyToken, result);
}

// --- 月次精算レポート ---

function sendMonthlyReport() {
  const gid = getGroupId();
  if (!gid) {
    console.error('GROUP_ID が未設定です。Bot をグループに追加してください。');
    return;
  }

  const now = new Date();
  let prevMonth = now.getMonth();
  let prevYear = now.getFullYear();
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear--;
  }
  const ym = prevYear + '-' + ('0' + prevMonth).slice(-2);

  pushMessage(gid, getMonthlyReport(ym));
}

// --- GAS メニュー ---

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('朝活Bot')
    .addItem('初期設定', 'showSetupDialog')
    .addItem('月次レポートトリガーを設定', 'setupMonthlyTrigger')
    .addItem('月次レポートトリガーを削除', 'removeMonthlyTrigger')
    .addToUi();
}

function showSetupDialog() {
  const ui = SpreadsheetApp.getUi();

  const tokenRes = ui.prompt(
    '初期設定',
    'LINE Developers Console の「Messaging API設定」タブで発行した\nチャネルアクセストークン（長期）を入力してください:',
    ui.ButtonSet.OK_CANCEL
  );
  if (tokenRes.getSelectedButton() !== ui.Button.OK) return;
  const token = tokenRes.getResponseText().trim();
  if (!token) {
    ui.alert('エラー', 'トークンが空です。LINE Developers Console で発行してから再度お試しください。', ui.ButtonSet.OK);
    return;
  }
  setChannelToken(token);

  ui.alert('設定完了', 'トークンを保存しました。\n次は Web App としてデプロイしてください。', ui.ButtonSet.OK);
}

function setupMonthlyTrigger() {
  removeMonthlyTrigger();
  ScriptApp.newTrigger('sendMonthlyReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(7)
    .create();
  SpreadsheetApp.getUi().alert('毎月1日 7:00〜8:00 に月次レポートを配信するトリガーを設定しました。');
}

function removeMonthlyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'sendMonthlyReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}
