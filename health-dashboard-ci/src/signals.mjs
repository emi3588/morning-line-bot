/**
 * 健康チェックの赤黄緑（GAS HealthSignals.gs と同じ閾値）
 */

export function parseNumberLoose(cell) {
  if (cell === '' || cell == null) return null;
  if (typeof cell === 'number' && !Number.isNaN(cell)) return cell;
  const s = String(cell).trim().replace(/,/g, '');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

export function parseJapaneseDurationToMinutes(cell) {
  if (cell === '' || cell == null) return null;
  if (typeof cell === 'number' && !Number.isNaN(cell)) return Math.round(cell * 60);
  const s = String(cell).trim().replace(/\s+/g, '');
  if (!s) return null;
  const re = /^(\d+(?:\.\d+)?)時間(?:(\d+)分)?$/;
  const m = s.match(re);
  if (!m) return null;
  const h = parseFloat(m[1]);
  if (Number.isNaN(h)) return null;
  const minPart = m[2] != null && m[2] !== '' ? parseInt(m[2], 10) : 0;
  if (Number.isNaN(minPart)) return null;
  return Math.round(h * 60) + minPart;
}

export function parseClockToMinutesFromMidnight(cell) {
  if (cell === '' || cell == null) return null;
  if (typeof cell === 'object' && cell !== null && typeof cell.getHours === 'function') {
    return cell.getHours() * 60 + cell.getMinutes();
  }
  const s = String(cell).trim();
  const md = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!md) return null;
  const h = parseInt(md[1], 10);
  const mi = parseInt(md[2], 10);
  if (Number.isNaN(h) || Number.isNaN(mi) || h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

export function isCircleMark(cell) {
  if (cell === '' || cell == null) return false;
  const s = String(cell).trim();
  if (!s) return false;
  return s === '○' || s === '〇' || s === '◯';
}

export function evaluateSleepScoreSignal(cell) {
  const n = parseNumberLoose(cell);
  if (n == null) return 'red';
  if (n >= 80) return 'green';
  if (n >= 60) return 'yellow';
  return 'red';
}

export function evaluateSleepDurationSignal(cell) {
  const minutes = parseJapaneseDurationToMinutes(cell);
  if (minutes == null) return 'red';
  if (minutes >= 7 * 60) return 'green';
  if (minutes >= 6 * 60) return 'yellow';
  return 'red';
}

export function evaluateStepsSignal(cell) {
  const n = parseNumberLoose(cell);
  if (n == null) return 'red';
  if (n >= 8000) return 'green';
  if (n >= 5000) return 'yellow';
  return 'red';
}

export function evaluateBedtimeSignal(cell) {
  const m = parseClockToMinutesFromMidnight(cell);
  if (m == null) return 'red';
  if (m <= 22 * 60) return 'green';
  if (m <= 23 * 60) return 'yellow';
  return 'red';
}

export function evaluateWakeupSignal(cell) {
  const m = parseClockToMinutesFromMidnight(cell);
  if (m == null) return 'red';
  if (m <= 4 * 60 + 59) return 'red';
  if (m <= 5 * 60 + 59) return 'green';
  return 'yellow';
}

export function evaluateMoodSignal(cell) {
  if (cell === '' || cell == null) return 'yellow';
  const s = String(cell).trim();
  if (s === '良い') return 'green';
  if (s === '普通') return 'yellow';
  if (s === '悪い') return 'red';
  return 'yellow';
}

export function evaluateCircleFieldSignal(cell) {
  return isCircleMark(cell) ? 'green' : 'red';
}

/**
 * row: { sleepScore, sleepDuration, steps, bedtime, wakeup, mood, bowel, walk, roomMachine } 生値
 */
export function evaluateSignalsFromRow(row) {
  return {
    sleepScore: evaluateSleepScoreSignal(row.sleepScore),
    sleepHours: evaluateSleepDurationSignal(row.sleepDuration),
    steps: evaluateStepsSignal(row.steps),
    bedtime: evaluateBedtimeSignal(row.bedtime),
    wakeup: evaluateWakeupSignal(row.wakeup),
    mood: evaluateMoodSignal(row.mood),
    bowel: evaluateCircleFieldSignal(row.bowel),
    walk: evaluateCircleFieldSignal(row.walk),
    roomMachine: evaluateCircleFieldSignal(row.roomMachine)
  };
}

export function worstSignalOverall(signals) {
  let worst = 'green';
  const order = ['sleepScore', 'sleepHours', 'steps', 'bedtime', 'wakeup', 'mood', 'bowel', 'walk', 'roomMachine'];
  for (const k of order) {
    const s = signals[k];
    if (s === 'red') worst = 'red';
    else if (s === 'yellow' && worst !== 'red') worst = 'yellow';
  }
  return worst;
}

export const SIGNAL_ITEM_LABELS = {
  sleepScore: '睡眠スコア',
  sleepHours: '睡眠時間',
  steps: '歩数',
  bedtime: '就寝',
  wakeup: '起床',
  mood: '気分',
  bowel: '便通',
  walk: '朝散歩',
  roomMachine: 'ルームマシン'
};

export function buildHeroMessage(signals) {
  const reds = [];
  const yellows = [];
  for (const k of Object.keys(SIGNAL_ITEM_LABELS)) {
    if (signals[k] === 'red') reds.push(SIGNAL_ITEM_LABELS[k]);
    else if (signals[k] === 'yellow') yellows.push(SIGNAL_ITEM_LABELS[k]);
  }
  const parts = [];
  if (reds.length) parts.push(reds.join('・') + 'が「赤」');
  if (yellows.length) parts.push(yellows.join('・') + 'が「黄」');
  if (!parts.length) return '9項目とも緑が多く、今日のコンディションは良好です。この調子で続けましょう。';
  return parts.join('、') + 'など、一部に課題があります。今夜は就寝を早め、明日の歩き方を整えましょう。';
}

export function lampClass(signal) {
  if (signal === 'green') return 'lamp lamp--green lamp-sm';
  if (signal === 'yellow') return 'lamp lamp--yellow lamp-sm';
  return 'lamp lamp--red lamp-sm';
}

export function heroLampClasses(worst) {
  if (worst === 'green') return 'lamp lamp--green lamp-hero';
  if (worst === 'yellow') return 'lamp lamp--yellow lamp-hero';
  return 'lamp lamp--red lamp-hero';
}
