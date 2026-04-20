// ============================================================
// FlexHealth.gs — mockup6「デイリーヘルスダッシュボード」に寄せた LINE Flex
// （HTML とは別物のため、同じ情報を Flex の部品で再構成している）
// ============================================================

var HC = {
  ok: '#22C55E',
  warn: '#EAB308',
  bad: '#EF4444',
  ink: '#0F172A',
  sub: '#64748B',
  bg: '#FFFFFF',
  panel: '#F8FAFC',
  accent: '#0EA5E9',
  heroBorder: '#FDA4AF',
  kicker: '#64748B'
};

var HC_SIGNAL_ORDER = [
  { key: HC_SLEEP_SCORE, sig: 'sleepScore', unit: '' },
  { key: HC_SLEEP_DURATION, sig: 'sleepHours', unit: '' },
  { key: HC_STEPS, sig: 'steps', unit: '歩' },
  { key: HC_BEDTIME, sig: 'bedtime', unit: '' },
  { key: HC_WAKEUP, sig: 'wakeup', unit: '' },
  { key: HC_MOOD, sig: 'mood', unit: '' },
  { key: HC_BOWEL, sig: 'bowel', unit: '' },
  { key: HC_WALK, sig: 'walk', unit: '' },
  { key: HC_ROOM, sig: 'roomMachine', unit: '' }
];

function flexSignalColor_(signal) {
  if (signal === 'green') return HC.ok;
  if (signal === 'yellow') return HC.warn;
  return HC.bad;
}

function worstSignalOverall_(signals) {
  var worst = 'green';
  HC_SIGNAL_ORDER.forEach(function (item) {
    var s = signals[item.sig];
    if (s === 'red') worst = 'red';
    else if (s === 'yellow' && worst !== 'red') worst = 'yellow';
  });
  return worst;
}

function flexLampSphere_(signal, sizePx) {
  return {
    type: 'box',
    layout: 'vertical',
    width: sizePx,
    height: sizePx,
    cornerRadius: sizePx,
    backgroundColor: flexSignalColor_(signal),
    margin: 'lg'
  };
}

/** mockup の説明文に近い1段落 */
function buildHeroNarrativeLine_(signals) {
  var labelBySig = {
    sleepScore: HC_SLEEP_SCORE,
    sleepHours: HC_SLEEP_DURATION,
    steps: HC_STEPS,
    bedtime: HC_BEDTIME,
    wakeup: HC_WAKEUP,
    mood: HC_MOOD,
    bowel: HC_BOWEL,
    walk: HC_WALK,
    roomMachine: HC_ROOM
  };
  var reds = [];
  var yellows = [];
  Object.keys(labelBySig).forEach(function (k) {
    if (signals[k] === 'red') reds.push(labelBySig[k]);
    else if (signals[k] === 'yellow') yellows.push(labelBySig[k]);
  });
  var parts = [];
  if (reds.length) parts.push(reds.join('・') + 'が「赤」');
  if (yellows.length) parts.push(yellows.join('・') + 'が「黄」');
  if (!parts.length) {
    return '9項目とも緑が多く、今日のコンディションは良好です。この調子で続けましょう。';
  }
  return (
    parts.join('、') +
    'など、一部に課題があります。今夜は就寝を早め、明日の歩き方を整えましょう。'
  );
}

function formatHealthDashboardMetaLine_(row) {
  var tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  var hhmm = Utilities.formatDate(new Date(), tz, 'HH:mm');
  var cell = row[HC_DATE];
  var d;
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    d = cell;
  } else {
    var ymd = normalizeHealthDate_(cell, tz);
    var m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    else d = new Date();
  }
  var wk = ['日', '月', '火', '水', '木', '金', '土'];
  var w = wk[d.getDay()];
  var ymdJa = Utilities.formatDate(d, tz, 'yyyy年M月d日');
  return ymdJa + '（' + w + '）' + hhmm + ' 集計';
}

function displayMoodOrRaw_(row) {
  var v = row[HC_MOOD];
  if (v === '' || v == null) return '—';
  var s = String(v).trim();
  if (s === '良い') return '😊';
  if (s === '普通') return '😐';
  if (s === '悪い') return '😟';
  return s;
}

function displayMetricValue_(row, hcKey) {
  if (hcKey === HC_MOOD) return displayMoodOrRaw_(row);
  return cellOrDash_(row, hcKey);
}

function flexMetricCard_(row, hcKey, signalKey, signals, unit) {
  var sig = signals[signalKey] || 'yellow';
  var val = displayMetricValue_(row, hcKey);
  var contents = [
    { type: 'text', text: hcKey, size: 'xxs', weight: 'bold', color: HC.sub, align: 'center', wrap: true },
    flexLampSphere_(sig, '44px'),
    {
      type: 'text',
      text: val,
      size: 'xl',
      weight: 'bold',
      color: HC.ink,
      align: 'center',
      wrap: true
    }
  ];
  if (unit) {
    contents.push({
      type: 'text',
      text: unit,
      size: 'xxs',
      weight: 'bold',
      color: HC.sub,
      align: 'center',
      margin: 'xs'
    });
  }
  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    cornerRadius: '16px',
    paddingAll: '10px',
    margin: 'xs',
    spacing: 'xs',
    contents: contents
  };
}

function flexGridRow_(row, signals, defs) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'none',
    margin: 'sm',
    contents: defs.map(function (d) {
      return flexMetricCard_(row, d.key, d.sig, signals, d.unit);
    })
  };
}

function flexMockupPageHeader_(metaLine) {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: '#FFFFFF',
    cornerRadius: '18px',
    paddingAll: '16px',
    margin: 'md',
    spacing: 'xs',
    contents: [
      {
        type: 'text',
        text: 'HEALTH CHECK',
        size: 'xxs',
        weight: 'bold',
        color: HC.kicker,
        align: 'center',
        letterSpacing: '0.15em'
      },
      { type: 'text', text: '健康見える化', size: 'xl', weight: 'bold', color: HC.accent, align: 'center' },
      {
        type: 'text',
        text: '📊 デイリーヘルスダッシュボード',
        size: 'sm',
        weight: 'bold',
        color: '#334155',
        align: 'center',
        margin: 'sm'
      },
      { type: 'text', text: metaLine, size: 'xs', weight: 'bold', color: HC.sub, align: 'center' }
    ]
  };
}

function flexHeroSection_(worstSig, narrative, tier, emoji) {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: '#FFFFFF',
    cornerRadius: '20px',
    borderWidth: 'medium',
    borderColor: HC.heroBorder,
    paddingAll: '16px',
    margin: 'md',
    alignItems: 'center',
    contents: [
      { type: 'text', text: '💊 健康度（全体）', size: 'sm', weight: 'bold', color: '#1E293B', align: 'center' },
      {
        type: 'text',
        text: '9項目のうちいちばん重い信号を表示',
        size: 'xxs',
        weight: 'bold',
        color: HC.sub,
        align: 'center',
        margin: 'sm'
      },
      flexLampSphere_(worstSig, '100px'),
      {
        type: 'text',
        text: emoji + ' 総合: ' + tier,
        size: 'sm',
        weight: 'bold',
        color: flexSignalColor_(worstSig),
        align: 'center',
        margin: 'sm'
      },
      {
        type: 'text',
        text: narrative,
        size: 'xs',
        weight: 'bold',
        color: '#334155',
        align: 'start',
        wrap: true,
        margin: 'md',
        lineSpacing: '4px'
      }
    ]
  };
}

function flexAiFooter_(tips) {
  var body = tips.join('\n');
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: '#FFFFFF',
    cornerRadius: '16px',
    paddingAll: '14px',
    margin: 'md',
    contents: [
      {
        type: 'text',
        text: '改善のヒント',
        size: 'sm',
        weight: 'bold',
        color: '#075985',
        margin: 'sm'
      },
      { type: 'text', text: body, size: 'xs', color: HC.ink, wrap: true, lineSpacing: '4px', weight: 'bold' }
    ]
  };
}

function cellOrDash_(row, key) {
  var v = row[key];
  if (v === '' || v == null) return '—';
  return String(v).trim() === '' ? '—' : String(v);
}

/**
 * mockup6 風レイアウト
 * @param {Object} row
 * @param {Object} signals
 * @param {{ tier: string, emoji: string, reasons: string[] }} evalResult
 * @param {string[]} suggestions
 */
function buildHealthCheckFlex_(row, signals, evalResult, suggestions) {
  var meta = formatHealthDashboardMetaLine_(row);
  var worst = worstSignalOverall_(signals);
  var narrative = buildHeroNarrativeLine_(signals);
  var items = HC_SIGNAL_ORDER;
  var row1 = items.slice(0, 3);
  var row2 = items.slice(3, 6);
  var row3 = items.slice(6, 9);

  var bodyContents = [
    flexMockupPageHeader_(meta),
    flexHeroSection_(worst, narrative, evalResult.tier, evalResult.emoji),
    {
      type: 'text',
      text: '9項目の内訳',
      size: 'xs',
      weight: 'bold',
      color: '#475569',
      margin: 'md'
    },
    flexGridRow_(row, signals, row1),
    flexGridRow_(row, signals, row2),
    flexGridRow_(row, signals, row3),
    flexAiFooter_(suggestions)
  ];

  return {
    type: 'bubble',
    size: 'mega',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '8px',
      backgroundColor: HC.panel,
      contents: bodyContents
    },
    styles: { body: { backgroundColor: HC.panel } }
  };
}
