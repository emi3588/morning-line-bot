// ============================================================
// FlexFormat.gs — LINE Flex（明るいオレンジ）
// ============================================================

const colors = {
  header: '#FF8C00',
  title: '#FFFFFF',
  subTitle: '#FFF0E0',
  accent: '#FF4500',
  background: '#FFFFFF'
};

/** 数字＋ラベル（連続だけアクセント強め） */
function flexStatCell_(num, label, highlight) {
  var bg = highlight ? colors.subTitle : colors.background;
  var borderC = highlight ? colors.accent : colors.header;
  var borderW = highlight ? '2px' : '1px';
  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    backgroundColor: bg,
    cornerRadius: '10px',
    borderColor: borderC,
    borderWidth: borderW,
    paddingAll: '8px',
    contents: [
      {
        type: 'text',
        text: String(num),
        align: 'center',
        weight: 'bold',
        size: 'xl',
        color: colors.accent,
        wrap: false
      },
      {
        type: 'text',
        text: label,
        align: 'center',
        size: 'xxs',
        color: colors.header,
        margin: 'sm',
        wrap: false
      }
    ]
  };
}

/** ◯✕ラベル付きセル */
function flexMarkCell_(mark, label) {
  var displayMark = (mark === '◯' || mark === 'O' || mark === 'o' || mark === '○') ? '◯' : '✕';
  var markColor = (displayMark === '◯') ? '#22c55e' : '#ef4444';
  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    backgroundColor: colors.background,
    cornerRadius: '10px',
    borderColor: colors.header,
    borderWidth: '1px',
    paddingAll: '8px',
    contents: [
      {
        type: 'text',
        text: displayMark,
        align: 'center',
        weight: 'bold',
        size: 'xl',
        color: markColor,
        wrap: false
      },
      {
        type: 'text',
        text: label,
        align: 'center',
        size: 'xxs',
        color: colors.header,
        margin: 'sm',
        wrap: false
      }
    ]
  };
}

/**
 * LINE Messaging API 用 Flex bubble オブジェクト
 */
function buildLearningReportFlexBubble_(row) {
  const streak = cellDisplay_(row, HEADER_STREAK);
  const courses = cellDisplay_(row, HEADER_COURSES);
  const lessons = cellDisplay_(row, HEADER_LESSONS);
  const week = cellDisplay_(row, HEADER_WEEK);
  const month = cellDisplay_(row, HEADER_MONTH);
  const total = cellDisplay_(row, HEADER_TOTAL);
  const newNum = cellDisplay_(row, HEADER_NEW);
  const reviewNum = cellDisplay_(row, HEADER_REVIEW_NUM);
  const reviewText = cellDisplay_(row, HEADER_REVIEW_TEXT);
  const gitMark = cellDisplay_(row, HEADER_GIT);
  const webMark = cellDisplay_(row, HEADER_WEB);
  const uiMark = cellDisplay_(row, HEADER_UI);
  const datePretty = getRecordDatePretty_(row) || '—';

  const bodyContents = [];

  bodyContents.push({
    type: 'text',
    text: '記録の日付　' + datePretty,
    size: 'sm',
    color: colors.accent,
    weight: 'bold',
    wrap: true
  });

  bodyContents.push({
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    margin: 'md',
    contents: [
      flexStatCell_(streak, '連続', true),
      flexStatCell_(courses, 'コース', false),
      flexStatCell_(lessons, 'レッスン', false)
    ]
  });

  bodyContents.push({
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    margin: 'sm',
    contents: [
      flexStatCell_(week, '週間', false),
      flexStatCell_(month, '月間', false),
      flexStatCell_(total, '累計', false)
    ]
  });

  bodyContents.push({
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    margin: 'sm',
    contents: [
      flexStatCell_(newNum, '新規', false),
      flexStatCell_(reviewNum, '復習', false),
      flexStatCell_(reviewText, '復習', false)
    ]
  });

  bodyContents.push({
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    margin: 'sm',
    contents: [
      flexMarkCell_(gitMark, 'Git'),
      flexMarkCell_(webMark, 'Web'),
      flexMarkCell_(uiMark, 'UI')
    ]
  });

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '昨日の学習サマリー',
          weight: 'bold',
          size: 'lg',
          color: colors.title,
          align: 'center'
        },
        {
          type: 'text',
          text: 'キラキラ学習日記 ✨',
          size: 'xs',
          color: colors.subTitle,
          align: 'center',
          margin: 'sm'
        }
      ],
      backgroundColor: colors.header,
      paddingAll: '14px'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '14px',
      contents: bodyContents
    },
    styles: {
      body: {
        backgroundColor: colors.background
      }
    }
  };
}
