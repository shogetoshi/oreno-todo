/**
 * Model Layer: Time Utility
 * JST（日本標準時 UTC+9）での時刻フォーマット用ユーティリティ
 * ビジネスロジックで使用する時刻処理を提供
 */

/**
 * 現在のJST時刻を "YYYY-MM-DD HH:MI:SS" フォーマットで取得
 * @returns JST時刻文字列（例: "2025-10-22 10:22:41"）
 */
export function getCurrentJSTTime(): string {
  const now = new Date();
  return formatToJST(now);
}

/**
 * DateオブジェクトをJST "YYYY-MM-DD HH:MI:SS" フォーマットに変換
 * @param date 変換するDateオブジェクト
 * @returns JST時刻文字列（例: "2025-10-22 10:22:41"）
 */
export function formatToJST(date: Date): string {
  // JSTはUTC+9時間
  const jstOffset = 9 * 60; // 分単位
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const jstTime = new Date(utcTime + jstOffset * 60 * 1000);

  const year = jstTime.getFullYear();
  const month = String(jstTime.getMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getDate()).padStart(2, '0');
  const hours = String(jstTime.getHours()).padStart(2, '0');
  const minutes = String(jstTime.getMinutes()).padStart(2, '0');
  const seconds = String(jstTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * JST時刻文字列をDateオブジェクトに変換
 * @param jstString JST時刻文字列（"YYYY-MM-DD HH:MI:SS"）
 * @returns Dateオブジェクト
 */
export function parseJSTString(jstString: string): Date {
  // "YYYY-MM-DD HH:MI:SS" を Date オブジェクトとしてパース
  // JavaScriptのDateコンストラクタは "YYYY-MM-DD HH:MI:SS" をローカルタイムとして解釈するため、
  // JST時刻として明示的に扱う
  const [datePart, timePart] = jstString.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);

  // JST（UTC+9）としてDateオブジェクトを作成
  const jstOffset = 9 * 60; // 分単位
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

  // UTC時刻からJSTオフセット分を引く（JSTで入力された時刻なので）
  return new Date(utcDate.getTime() - jstOffset * 60 * 1000);
}

/**
 * JST時刻文字列から日付部分のみを抽出する（YYYY-MM-DD形式）
 * @param jstString JST時刻文字列（"YYYY-MM-DD HH:MI:SS" or "YYYY-MM-DD"）
 * @returns 日付文字列（"YYYY-MM-DD"）
 */
export function extractDateFromJST(jstString: string): string {
  if (jstString.includes(' ')) {
    return jstString.split(' ')[0];
  }
  return jstString;
}

/**
 * 日付文字列の比較（YYYY-MM-DD形式）
 * @param date1 日付文字列1
 * @param date2 日付文字列2
 * @returns date1 < date2 なら負の数、date1 === date2 なら0、date1 > date2 なら正の数
 */
export function compareDates(date1: string, date2: string): number {
  return date1.localeCompare(date2);
}
