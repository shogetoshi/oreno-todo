/**
 * Model Layer: Date Grouping Utility
 * ListItemを日付ごとにグループ化するためのユーティリティ
 */

/**
 * 日付グループを表すインターフェース
 */
export interface DateGroup {
  date: string; // YYYY-MM-DD形式
  displayDate: string; // 表示用の日付文字列
}

/**
 * 今日から指定日数前までの日付グループを生成する
 * @param daysBack 何日前まで遡るか（デフォルト: 35日）
 * @returns 日付グループの配列（今日から過去に向かって並ぶ）
 */
export function generateDateGroups(daysBack: number = 35): DateGroup[] {
  const groups: DateGroup[] = [];
  const today = new Date();

  for (let i = 0; i <= daysBack; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const dateString = formatDateToYYYYMMDD(date);
    const displayDate = formatDateForDisplay(date, i);

    groups.push({
      date: dateString,
      displayDate,
    });
  }

  return groups;
}

/**
 * DateオブジェクトをYYYY-MM-DD形式の文字列に変換する
 * @param date Dateオブジェクト
 * @returns YYYY-MM-DD形式の文字列
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付を表示用の文字列に変換する
 * @param date Dateオブジェクト
 * @param daysAgo 何日前か
 * @returns 表示用の日付文字列（例: "今日 (2025-11-24)", "昨日 (2025-11-23)", "2025-11-22"）
 */
export function formatDateForDisplay(date: Date, daysAgo: number): string {
  const dateString = formatDateToYYYYMMDD(date);

  if (daysAgo === 0) {
    return `今日 (${dateString})`;
  } else if (daysAgo === 1) {
    return `昨日 (${dateString})`;
  } else {
    return dateString;
  }
}
