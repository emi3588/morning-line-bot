#!/usr/bin/env node
/**
 * LINE_LEARNING_IMAGE_URL（HTTPS）をFlexメッセージでプッシュします。
 * 環境変数: LINE_CHANNEL_ACCESS_TOKEN、LINE_TO_ID、LINE_LEARNING_IMAGE_URL
 */

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const to = process.env.LINE_TO_ID;
const imageUrl = process.env.LINE_LEARNING_IMAGE_URL;

if (!imageUrl || !imageUrl.trim()) {
  console.error('LINE_LEARNING_IMAGE_URL を設定してください');
  process.exit(1);
}

const flexMessage = {
  type: 'flex',
  altText: '学習レポート',
  contents: {
    type: 'bubble',
    size: 'giga',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '0px',
      contents: [
        {
          type: 'image',
          url: imageUrl.trim(),
          size: 'full',
          aspectMode: 'cover',
          aspectRatio: '1:2.2'
        }
      ]
    }
  }
};

const res = await fetch('https://api.line.me/v2/bot/message/push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({ to, messages: [flexMessage] })
});

if (!res.ok) {
  const t = await res.text();
  throw new Error(`LINE Flex push 失敗: ${res.status} ${t}`);
}

console.log('LINE学習レポート画像プッシュ完了：', imageUrl);
