import { ListItem } from '../models/ListItem';
import { extractDateFromJST, parseJSTString } from './timeFormat';

/**
 * 特定の日付におけるListItem（TodoまたはCalendarEvent）の実行時間を分単位で計算する
 * @param item 対象のListItem
 * @param date 日付（YYYY-MM-DD形式）
 * @returns 実行時間（分）
 */
export function calculateExecutionTimeForDate(item: ListItem, date: string): number {
  const timeRanges = item.getTimeRanges();
  if (timeRanges.length === 0) {
    return 0;
  }

  let totalMinutes = 0;

  for (const range of timeRanges) {
    const startTime = parseJSTString(range.start);
    const startDate = extractDateFromJST(range.start);

    // このtimeRangeが指定日付に該当しない場合はスキップ
    if (startDate !== date) {
      continue;
    }

    // 終了時刻を取得（endがnullの場合は現在時刻）
    const endTime = range.end ? parseJSTString(range.end) : new Date();

    // 時間差を分に変換
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    totalMinutes += durationMinutes;
  }

  return totalMinutes;
}

/**
 * 全てのListItemの特定日付における実行時間を計算する
 * @param items ListItemリスト（TodoまたはCalendarEvent）
 * @param date 日付（YYYY-MM-DD形式）
 * @returns ListItemごとの実行時間マップ（ItemID -> 分）
 */
export function calculateExecutionTimesForDate(
  items: ListItem[],
  date: string
): Map<string, number> {
  const executionTimes = new Map<string, number>();

  for (const item of items) {
    const minutes = calculateExecutionTimeForDate(item, date);
    if (minutes > 0) {
      executionTimes.set(item.getId(), minutes);
    }
  }

  return executionTimes;
}

/**
 * ListItem（TodoまたはCalendarEvent）に対して一貫性のある色を割り当てる
 * 現在は仮実装として、IDから決定論的に色を生成する
 * @param itemId ListItemのID
 * @returns CSS color値（hex形式）
 */
export function assignColorToTodo(itemId: string): string {
  // IDをハッシュ化して色を生成（仮実装）
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = itemId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // HSL色空間で色相を分散させ、彩度と明度を固定
  // 色相: 0-360度をハッシュから計算
  // 彩度: 70% (鮮やかすぎず淡すぎない)
  // 明度: 60% (視認性を確保)
  const hue = Math.abs(hash) % 360;
  const saturation = 70;
  const lightness = 60;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * 積み上げ棒グラフの1セグメント（1つのListItem）の表示情報
 */
export interface TaskExecutionSegment {
  itemId: string;
  itemText: string;
  minutes: number;
  color: string;
}

/**
 * 積み上げ棒グラフの表示設定
 */
export interface StackBarDisplayConfig {
  segments: TaskExecutionSegment[];
  totalMinutes: number;
  displayMaxMinutes: number;
  hourMarkers: number[];
}

/**
 * 積み上げ棒グラフの表示に必要な情報をすべて計算する
 * @param items ListItemリスト（TodoまたはCalendarEvent）
 * @param date 日付（YYYY-MM-DD形式）
 * @returns 積み上げ棒グラフの表示設定
 */
export function calculateStackBarDisplay(
  items: ListItem[],
  date: string
): StackBarDisplayConfig {
  const segments: TaskExecutionSegment[] = [];
  let totalMinutes = 0;

  // 各ListItemの実行時間を計算してセグメント情報を作成
  for (const item of items) {
    const minutes = calculateExecutionTimeForDate(item, date);
    if (minutes > 0) {
      segments.push({
        itemId: item.getId(),
        itemText: item.getText(),
        minutes,
        color: assignColorToTodo(item.getId())
      });
      totalMinutes += minutes;
    }
  }

  // 12時間（720分）を基準値とする
  const BASE_MINUTES = 12 * 60;

  // 表示する最大時間（12時間以上の場合は実際の時間、未満の場合は12時間）
  const displayMaxMinutes = Math.max(totalMinutes, BASE_MINUTES);

  // 1時間ごとの目盛を生成
  const totalHours = Math.ceil(displayMaxMinutes / 60);
  const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => i);

  return {
    segments,
    totalMinutes,
    displayMaxMinutes,
    hourMarkers
  };
}
