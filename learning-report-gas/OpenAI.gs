// ============================================================
// OpenAI.gs — 任意：レポート文の推敲（数値は変えない）
// ============================================================

/**
 * シートから組み立てた下書きを、トーンだけ整える（事実の数値・列は変えない指示）
 * @param {string} draft
 * @param {Object} row
 * @return {string}
 */
function polishReportWithOpenAI_(draft, row) {
  const key = getOpenAiKey_();
  if (!key) throw new Error('OPENAI_API_KEY が未設定です。');

  const system =
    '学習レポートの推敲担当。入力の「事実・数値・列の内容」は変更禁止。改行と見出し構成は維持。誤字修正と読みやすい短文化のみ。前置きや注釈は出さない。';

  const user = '【下書き】\n' + draft + '\n\n【元データJSON】\n' + JSON.stringify(row);

  const payload = {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    console.error(res.getContentText());
    throw new Error('OpenAI API エラー: HTTP ' + res.getResponseCode());
  }

  const json = JSON.parse(res.getContentText());
  const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!text) throw new Error('OpenAI の応答が空です');
  return String(text).trim();
}
