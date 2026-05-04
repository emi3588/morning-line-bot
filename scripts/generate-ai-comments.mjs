#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const AI_KEYS = ['AI_MESSAGE'];

export function charCount(s) {
  return [...String(s ?? '')].length;
}

export function truncateChars(s, max) {
  const str = String(s ?? '');
  const chars = [...str];
  if (chars.length <= max) return str;
  return chars.slice(0, max - 1).join('') + '…';
}

function parseInputJson(raw) {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('入力 JSON が空です。');
  const obj = JSON.parse(trimmed);
  if (obj && typeof obj.fields === 'object' && obj.fields !== null) {
    return { ...obj.fields };
  }
  return { ...obj };
}

function buildUserPayload(fields) {
  return {
    記録日: fields.DATE ?? '',
    連続日数: fields.STREAK ?? '',
    コース数: fields.COURSES ?? '',
    レッスン数: fields.LESSONS ?? '',
    週間: fields.WEEKLY ?? '',
    月間: fields.MONTHLY ?? '',
    累計: fields.TOTAL ?? '',
    新規: fields.NEW_LESSONS ?? '',
    復習: fields.REVIEW_LESSONS ?? '',
    復習項目: fields.REVIEW_TEXT ?? '',
    Git: fields.GIT ?? '',
    Web: fields.WEB ?? '',
    UI: fields.UI ?? '',
  };
}

const SYSTEM_PROMPT = `あなたは学習記録の応援コメントを書くアシスタントです。
学習者の名前は「えみりん」と呼びます。温かく、具体的にほめ、背中を押すトーンで書いてください。
出力は必ず有効な JSON オブジェクトのみ（前後に説明文を付けない）。

必須キー（すべて文字列）:
- AI_MESSAGE … 全体を通した今日の励ましメッセージ。だいたい2文。60〜80文字（厳守）。

文字数は日本語の記号・句読点・絵文字も1文字として数えます。
JSON 以外の文字は一切出力しないでください。`;

async function readStdinText() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function generateAiComments(fields, options = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('環境変数 OPENAI_API_KEY を設定してください。');
  }
  const model = options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const userContent = JSON.stringify(buildUserPayload(fields));

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `次の学習データに基づき、指定キーだけの JSON を生成してください。\n${userContent}` },
      ],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || JSON.stringify(body);
    throw new Error(`OpenAI API エラー (${res.status}): ${msg}`);
  }

  const text = body?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('OpenAI から本文が返りませんでした。');
  }

  let parsed;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('返却 JSON の解析に失敗しました。');
    parsed = JSON.parse(m[0]);
  }

  const out = {};
  for (const k of AI_KEYS) {
    const v = parsed[k];
    if (v == null || String(v).trim() === '') {
      throw new Error(`返却 JSON に必須キー "${k}" がありません。`);
    }
    out[k] = String(v).trim();
  }

  let s = out['AI_MESSAGE'];
  if (charCount(s) > 80) {
    out['AI_MESSAGE'] = truncateChars(s, 80);
  }

  return out;
}

async function main() {
  const fileArg = process.argv[2];
  let raw;
  if (fileArg) {
    const p = path.resolve(process.cwd(), fileArg);
    raw = fs.readFileSync(p, 'utf8');
  } else if (process.stdin.isTTY) {
    console.error('使い方: node scripts/generate-ai-comments.mjs [入力.json]');
    process.exit(1);
  } else {
    raw = await readStdinText();
  }

  const base = parseInputJson(raw);
  const generated = await generateAiComments(base);
  const merged = { ...base, ...generated };
  process.stdout.write(JSON.stringify(merged, null, 2) + '\n');
}

const entry = process.argv[1]?.replace(/\\/g, '/');
const isMain = entry?.endsWith('generate-ai-comments.mjs');
if (isMain) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
