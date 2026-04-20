import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeHealthDate } from './sheet.mjs';
import { buildHeroMessage, heroLampClasses, lampClass, worstSignalOverall } from './signals.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatMetaLineSync(row, tz = 'Asia/Tokyo') {
  const hhmm = new Intl.DateTimeFormat('ja-JP', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
  const cell = row.date;
  let d = new Date();
  if (cell && typeof cell === 'object' && typeof cell.getTime === 'function' && !Number.isNaN(cell.getTime())) {
    d = cell;
  } else if (cell !== '' && cell != null) {
    const ymd = normalizeHealthDate(cell);
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }
  const wk = ['日', '月', '火', '水', '木', '金', '土'];
  const w = wk[d.getDay()];
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  return `${y}年${mo}月${da}日（${w}）${hhmm} 集計`;
}

function displayValue(row, key, signalKey) {
  const v = row[key];
  if (v === '' || v == null) return '—';
  if (key === 'mood') {
    const s = String(v).trim();
    if (s === '良い') return '😊';
    if (s === '普通') return '😐';
    if (s === '悪い') return '😟';
    return escapeHtml(s);
  }
  if (typeof v === 'object' && v !== null && typeof v.getHours === 'function') {
    const h = v.getHours();
    const m = v.getMinutes();
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  if (typeof v === 'number') return escapeHtml(String(v));
  return escapeHtml(String(v));
}

function valueClass(row, key) {
  if (key === 'mood') return 'value emoji';
  const v = row[key];
  if (typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v.trim())) return 'value time';
  if (typeof v === 'object' && v !== null && typeof v.getHours === 'function') return 'value time';
  return 'value';
}

function buildCard(name, rowKey, signalKey, signals, row, unitHtml) {
  const val = displayValue(row, rowKey, signalKey);
  const cls = valueClass(row, rowKey);
  const lamp = lampClass(signals[signalKey]);
  const unit = unitHtml ? `<p class="unit">${unitHtml}</p>` : '';
  return `      <article class="item-card">
        <p class="item-name">${escapeHtml(name)}</p>
        <div class="${lamp}" aria-hidden="true"></div>
        <p class="${cls}">${val}</p>${unit}
      </article>`;
}

export function buildGridCardsHtml(row, signals) {
  const cards = [
    buildCard('睡眠スコア', 'sleepScore', 'sleepScore', signals, row, ''),
    buildCard('睡眠時間', 'sleepDuration', 'sleepHours', signals, row, ''),
    buildCard('歩数', 'steps', 'steps', signals, row, '歩'),
    buildCard('就寝', 'bedtime', 'bedtime', signals, row, ''),
    buildCard('起床', 'wakeup', 'wakeup', signals, row, ''),
    buildCard('気分', 'mood', 'mood', signals, row, ''),
    buildCard('便通', 'bowel', 'bowel', signals, row, ''),
    buildCard('朝散歩', 'walk', 'walk', signals, row, ''),
    buildCard('ルームマシン', 'roomMachine', 'roomMachine', signals, row, '')
  ];
  return `\n${cards.join('\n')}\n`;
}

export function renderDashboardHtml(row, signals, hintsText) {
  const tplPath = path.join(__dirname, '..', 'template', 'dashboard.template.html');
  let html = fs.readFileSync(tplPath, 'utf8');
  const worst = worstSignalOverall(signals);
  const heroMsg = buildHeroMessage(signals);
  const meta = formatMetaLineSync(row);
  const grid = buildGridCardsHtml(row, signals);
  const footer = escapeHtml(hintsText).replace(/\n/g, '<br/>');

  html = html
    .replace('__META_LINE__', escapeHtml(meta))
    .replace('__HERO_LAMP_CLASSES__', heroLampClasses(worst))
    .replace('__HERO_MESSAGE__', escapeHtml(heroMsg))
    .replace('__GRID_CARDS__', grid)
    .replace('__FOOTER_HINTS__', footer);
  return html;
}
