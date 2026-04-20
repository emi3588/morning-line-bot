// ============================================================
// LinePush.gs — LINE Messaging API（push）
// ============================================================
//
// Main.gs が呼ぶ関数名（この2つだけを使います）:
//   pushLineTextHealth_(text)
//   pushLineFlexHealth_(bubble)
//
// 実装は Main.gs 末尾にあります（LinePush.gs をコピーし忘れても動くように集約）。
// このファイルを Apps Script に置かなくても動作します。
//
// 古いプロジェクトに「同じ名前の function」が LinePush.gs に残っていると
// 二重定義になるので、貼り替えるか LinePush.gs を削除してください。
//
var LINE_PUSH_LOGIC_IN_MAIN_GS = true;
