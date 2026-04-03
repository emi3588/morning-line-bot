// ============================================================
// commands.gs — コマンド解析 + ディスパッチ
// ============================================================

/**
 * テキストメッセージを解析し、コマンドを実行して返信テキストを返す。
 * コマンドに一致しない場合は null を返す（グループ会話には無反応）。
 *
 * senderResolver: () => { id, name } | null
 *   LINE API 呼び出しを含むため、コマンドがマッチした場合のみ呼ばれる。
 */
function dispatch(text, senderResolver, groupId, mentionees) {
  const trimmed = text.trim();
  if (trimmed.includes('\n')) return null;

  const cmd = parseCommand_(trimmed);
  if (!cmd) return null;

  if (cmd.type === 'hint')    return cmd.message;
  if (cmd.type === 'summary') return getSummary();
  if (cmd.type === 'history') return getHistory();
  if (cmd.type === 'help')    return getHelp();

  // --- 以下、書き込み系コマンド ---

  if (cmd.type === 'add') {
    const err = validateCount_(cmd.count);
    if (err) return err;
  }

  const sender = senderResolver();
  if (!sender) return null;

  let target;
  if (cmd.targetName) {
    const resolved = resolveTarget_(cmd.targetName, groupId, mentionees);
    if (resolved.error) return resolved.error;
    target = resolved;
  } else {
    target = sender;
  }

  switch (cmd.type) {
    case 'late':
      return recordLate(target.id, target.name, sender.id, sender.name);
    case 'cancel':
      return cancelLate(target.id, target.name, sender.id, sender.name);
    case 'add':
      return addBulk(target.id, target.name, cmd.count, sender.id, sender.name);
    default:
      return null;
  }
}

// --- コマンドパース（純粋関数 — 副作用なし、バリデーションなし） ---

function parseCommand_(text) {
  if (text === 'ヘルプ') return { type: 'help' };
  if (text === '集計')   return { type: 'summary' };
  if (text === '履歴')   return { type: 'history' };
  if (text === '遅刻')   return { type: 'late', targetName: null };
  if (text === '取消')   return { type: 'cancel', targetName: null };

  let m;

  m = text.match(/^遅刻\s+@(.+)$/);
  if (m) return { type: 'late', targetName: m[1].trim() };

  m = text.match(/^取消\s+@(.+)$/);
  if (m) return { type: 'cancel', targetName: m[1].trim() };

  m = text.match(/^追加\s+@(.+?)\s+(\d+)\s*回$/);
  if (m) return { type: 'add', targetName: m[1].trim(), count: parseInt(m[2], 10) };

  m = text.match(/^追加\s+(\d+)\s*回$/);
  if (m) return { type: 'add', targetName: null, count: parseInt(m[1], 10) };

  // 惜しいコマンド — ヒントを返す
  if (/^遅刻\s+[^@]/.test(text)) {
    return { type: 'hint', message: '他の人を記録するには「遅刻 @名前」と@を付けてください。' };
  }
  if (/^(取り消し|とりけし)$/.test(text)) {
    return { type: 'hint', message: '取り消しは「取消」と入力してください。' };
  }

  return null;
}

/**
 * 追加回数のバリデーション。不正ならエラーメッセージ文字列、正常なら null を返す。
 */
function validateCount_(n) {
  if (isNaN(n) || n < 1) {
    return '「追加 3回」のように、1以上の数字を指定してください。';
  }
  if (n > MAX_BULK_ADD) {
    return '一度に追加できるのは最大' + MAX_BULK_ADD + '回までです。';
  }
  return null;
}

/**
 * @名前テキストを User ID に解決する。
 * mention メタデータ → テキスト完全一致 の二段構え。
 */
function resolveTarget_(nameText, groupId, mentionees) {
  if (mentionees && mentionees.length > 0) {
    for (const m of mentionees) {
      if (m.type === 'user' && m.userId) {
        const profile = getGroupMemberProfile(groupId, m.userId);
        if (profile) {
          upsertMember(m.userId, profile.displayName);
          return { id: m.userId, name: profile.displayName };
        }
      }
    }
  }

  const matches = findMemberByName(nameText);
  if (matches.length === 1) {
    return { id: matches[0].userId, name: matches[0].displayName };
  }
  if (matches.length > 1) {
    return { error: '「' + nameText + '」に該当するメンバーが' + matches.length + '名います。フルネームで指定してください。' };
  }
  return { error: '@' + nameText + ' に該当するメンバーが見つかりません。LINEの表示名を確認してください。' };
}
