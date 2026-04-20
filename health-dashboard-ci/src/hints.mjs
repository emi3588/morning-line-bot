const FALLBACK =
  '1. 就寝は22時前を目指す\n2. 睡眠時間を7時間に近づける\n3. 歩数8000を目標に軽い散歩を足す';

/**
 * 改善ヒント3件。OPENAI_API_KEY があるときだけ AI、なければ固定文。
 */
export async function buildHints(row, signals) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return FALLBACK;

  const summary = JSON.stringify(signals);
  const data = JSON.stringify({
    sleepScore: row.sleepScore,
    sleepDuration: row.sleepDuration,
    steps: row.steps,
    bedtime: row.bedtime,
    wakeup: row.wakeup,
    mood: row.mood,
    bowel: row.bowel,
    walk: row.walk,
    roomMachine: row.roomMachine
  });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'あなたは健康コーチです。日本語で、箇条書きではなく「1. 」「2. 」「3. 」で始まる3行だけ返してください。各行は60文字以内。'
        },
        {
          role: 'user',
          content: `以下の今日の健康データと信号（green/yellow/red）に基づき、具体的な改善ヒントを3行で。\nデータ: ${data}\n信号: ${summary}`
        }
      ],
      max_tokens: 400,
      temperature: 0.5
    })
  });

  if (!res.ok) {
    const t = await res.text();
    console.warn('OpenAI 失敗、固定ヒントにフォールバック:', res.status, t);
    return FALLBACK;
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim() || '';
  if (!text) return FALLBACK;
  return text;
}
