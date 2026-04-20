/**
 * LINE Messaging API で画像を push する。
 * Imgur 等は使わず、PNG バイナリを base64 の data URL にして送る。
 *
 * 注意: 公式ドキュメントは「HTTPS の画像 URL」を推奨している。
 * data: URL は仕様上の URI だが、画像が大きいと失敗することがある。
 * その場合は画像を縮小するか、別途ホストした HTTPS URL に戻す必要がある。
 */

/**
 * @param {Buffer|Uint8Array} buffer
 * @returns {string}
 */
export function pngBufferToDataUrl(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const b64 = buf.toString('base64');
  return `data:image/png;base64,${b64}`;
}

/**
 * PNG を base64 data URL の image メッセージとして push する（Imgur 不要）
 * @param {Buffer|Uint8Array} pngBuffer
 */
export async function linePushPngBuffer(pngBuffer) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_TO_ID;
  if (!token || !to) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN と LINE_TO_ID を設定してください');
  }
  const dataUrl = pngBufferToDataUrl(pngBuffer);
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      to,
      messages: [
        {
          type: 'image',
          originalContentUrl: dataUrl,
          previewImageUrl: dataUrl
        }
      ]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `LINE push 失敗: ${res.status} ${t}\n` +
        '（data URL が拒否された場合は、画像サイズを下げるか HTTPS 公開 URL 方式に切り替えてください）`
    );
  }
}
