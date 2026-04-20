/**
 * Imgur（匿名）に PNG を上げ HTTPS URL を得る → LINE に画像送信
 * LINE の image メッセージは publicly accessible HTTPS URL が必須のため。
 */

export async function uploadPngToImgur(buffer) {
  const clientId = process.env.IMGUR_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'IMGUR_CLIENT_ID が未設定です。LINE 画像送信には HTTPS の画像 URL が必要なため、Imgur Client ID（匿名アップロード可）を Secrets に登録してください。'
    );
  }
  const form = new FormData();
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  form.append('image', new Blob([u8], { type: 'image/png' }), 'health-dashboard.png');

  const res = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { Authorization: `Client-ID ${clientId}` },
    body: form
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Imgur アップロード失敗: ${res.status} ${t}`);
  }
  const json = await res.json();
  const link = json?.data?.link;
  if (!link) throw new Error('Imgur 応答に link がありません');
  return link.replace(/^http:/, 'https:');
}

export async function linePushImage(imageUrl) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_TO_ID;
  if (!token || !to) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN と LINE_TO_ID を GitHub Secrets に設定してください');
  }
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
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        }
      ]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LINE push 失敗: ${res.status} ${t}`);
  }
}
