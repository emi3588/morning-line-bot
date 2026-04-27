#!/usr/bin/env node
/**
 * スプレッドシート由来の fields に、OpenAI API で以下を付与して JSON 出力する。
 *   TERM_DESCRIPTION, TERM_ACTION, AI_ASIDE_*, AI_MESSAGE
 */

import fs from 'fs';
import path from 'path';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const AI_KEYS = [
  'TERM_DESCRIPTION',
  'TERM_ACTION',
  'AI_ASIDE_YESTERDAY',
  'AI_ASIDE_UNDERSTOOD',
  'AI_ASIDE_UNCLEAR',
  'AI_ASIDE_FOCUS',
  'AI_ASIDE_TERM',
  'AI_MESSAGE',
];

/** @param {string} s */
export function charCount(s) {
  return [...String(s ?? '')].length;
}

/**
 * @param {string} s
 * @param {number} max
 */
export function truncateChars(s, max) {
  const str = String(s ?? '');
  const chars = [...str];
  if (chars.length <= max) return str;
  return chars.slice(0, max - 1).join('') + '…';
}

/**
 * @param {string} raw
 * @returns {Record<string, string>}
 */
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
    昨日の学習: fields.YESTERDAY ?? '',
    理解できたこと: fields.UNDERSTOOD ?? '',
    まだ曖昧なこと: fields.UNCLEAR ?? '',
    今日のフォーカス: fields.FOCUS ?? '',
    今日の用語: fields.TERM ?? '',
    KPI: {
      連続: fields.STREAK ?? '',
      コース: fields.COURSES ?? '',
      レッスン: fields.LESSONS ?? '',
      週間: fields.WEEKLY ?? '',
      月間: fields.MONTHLY ?? '',
      累計: fields.TOTAL ?? '',
    },
  };
}

const SYSTEM_PROMPT = `あなたは学習記録の応援コメントを書くアシスタントです。
学習者の名前は「えみりん」と呼びます。温かく、具体的にほめ、背中を押すトーンで書いてください。
出力は必ず有効な JSON オブジェクトのみ（前後に説明文を付けない）。

必須キー（すべて文字列）:
- TERM_DESCRIPTION … 今日の用語の意味を、えみりん向けに短く1〜2文で。30〜50文字（厳守）。
- TERM_ACTION … 今日の用語を使って「今日1回だけできる具体的な行動」を1文で。例：「GitHubで1ファイル編集してコミットしてみよう！」。20〜40文字（厳守）。
- AI_ASIDE_YESTERDAY … 「昨日の学習」へのひとこと。応援より「次にやること」を1文で。30〜50文字（厳守）。
- AI_ASIDE_UNDERSTOOD … 「理解できたこと」へのひとこと。次の行動につながる1文で。30〜50文字（厳守）。
- AI_ASIDE_UNCLEAR … 「まだ曖昧なこと」へのひとこと。今日試せる行動を1文で。30〜50文字（厳守）。
- AI_ASIDE_FOCUS … 「今日のフォーカス」へのひとこと。具体的な行動を1文で。30〜50文字（厳守）。
- AI_ASIDE_TERM … 「今日の用語」へのひとこと。用語を使った行動を1文で。30〜50文字（厳守）。
- AI_MESSAGE … 全体を通した今日の行動指示。だいたい2文。60〜80文字（厳守）。

文字数は日本語の記号・句読点・絵文字も1文字として数えます。範囲を超えないよう、短く整えてください。
JSON 以外の文字は一切出力しないでください。`;

async function readStdinText() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * @param {Record<string, string>} fields
 * @param {{ model?: string, apiKey?: string }} [options]
 * @returns {Promise<Record<string, string>>}
 */
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

  const limits = {
    TERM_DESCRIPTION: [30, 50],
    TERM_ACTION: [20, 40],
    AI_ASIDE_YESTERDAY: [30, 50],
    AI_ASIDE_UNDERSTOOD: [30, 50],
    AI_ASIDE_UNCLEAR: [30, 50],
    AI_ASIDE_FOCUS: [30, 50],
    AI_ASIDE_TERM: [30, 50],
    AI_MESSAGE: [60, 80],
  };

  for (const k of AI_KEYS) {
    const [minLen, maxLen] = limits[k];
    let s = out[k];
    const n = charCount(s);
    if (n > maxLen) {
      s = truncateChars(s, maxLen);
      out[k] = s;
    }
    if (charCount(out[k]) < minLen) {
      console.warn(`警告: "${k}" が ${minLen} 文字未満です（${charCount(out[k])} 文字）。そのまま出力します。`);
    }
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
    console.error(
      '使い方: node scripts/generate-ai-comments.mjs [入力.json]\n' +
        '  または: node scripts/fetch-learning-sheet.mjs | node scripts/generate-ai-comments.mjs'
    );
    process.exit(1);
  } else {
    raw = await readStdinText();
  }

  const base = parseInputJson(raw);
  const needed = ['DATE', 'YESTERDAY', 'UNDERSTOOD', 'UNCLEAR', 'FOCUS', 'TERM'];
  for (const k of needed) {
    if (base[k] == null) {
      throw new Error(`入力に "${k}" がありません。スプレッドシート取得結果を渡してください。`);
    }
  }

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
