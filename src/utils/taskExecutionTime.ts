import { ListItem } from '../models/ListItem';
import { extractDateFromJST, parseJSTString } from './timeFormat';
import { ProjectDefinitionRepository } from '../models/ProjectDefinition';
import { getColorNameRgb } from './colorNameMapping';

/**
 * 特定の日付におけるListItem（TodoまたはCalendarEvent）の実行時間を秒単位で計算する
 * @param item 対象のListItem
 * @param date 日付（YYYY-MM-DD形式）
 * @returns 実行時間（秒）
 */
export function calculateExecutionTimeForDate(item: ListItem, date: string): number {
  const timeRanges = item.getTimeRanges();
  if (timeRanges.length === 0) {
    return 0;
  }

  let totalSeconds = 0;

  for (const range of timeRanges) {
    const startTime = parseJSTString(range.start);
    const startDate = extractDateFromJST(range.start);

    // このtimeRangeが指定日付に該当しない場合はスキップ
    if (startDate !== date) {
      continue;
    }

    // 終了時刻を取得（endがnullの場合は現在時刻）
    const endTime = range.end ? parseJSTString(range.end) : new Date();

    // 時間差を秒に変換
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);

    totalSeconds += durationSeconds;
  }

  return totalSeconds;
}

/**
 * 全てのListItemの特定日付における実行時間を計算する
 * @param items ListItemリスト（TodoまたはCalendarEvent）
 * @param date 日付（YYYY-MM-DD形式）
 * @returns ListItemごとの実行時間マップ（ItemID -> 秒）
 */
export function calculateExecutionTimesForDate(
  items: ListItem[],
  date: string
): Map<string, number> {
  const executionTimes = new Map<string, number>();

  for (const item of items) {
    const seconds = calculateExecutionTimeForDate(item, date);
    if (seconds > 0) {
      executionTimes.set(item.getId(), seconds);
    }
  }

  return executionTimes;
}

/**
 * ListItem（TodoまたはCalendarEvent）に対して色を割り当てる
 * プロジェクト定義から色を取得し、該当プロジェクトがない場合は灰色を返す
 * @param item 対象のListItem
 * @param date 日付（YYYY-MM-DD形式）
 * @param projectRepo プロジェクト定義リポジトリ
 * @returns CSS color値
 */
export function assignColorToItem(
  item: ListItem,
  date: string,
  projectRepo: ProjectDefinitionRepository
): string {
  // item.getTaskcode()でtaskcodeを取得
  const taskcode = item.getTaskcode();

  // ProjectDefinitionRepository.getColorForTaskcode()で色を取得
  const color = ProjectDefinitionRepository.getColorForTaskcode(projectRepo, date, taskcode);

  // 該当プロジェクトがない場合（nullの場合）は灰色 (#808080) を返す
  return color ?? '#808080';
}

/**
 * CSS色名や16進数をRGBA形式に変換する
 * @param color CSS色名または16進数色コード
 * @param alpha 透明度（0-1）
 * @returns RGBA形式の色文字列
 */
export function colorToRgba(color: string, alpha: number): string {
  const normalizedColor = color.toLowerCase().trim();

  // 16進数カラーコード (#RRGGBB または #RGB) をパース
  if (normalizedColor.startsWith('#')) {
    const hex = normalizedColor.slice(1);

    // #RGB形式を#RRGGBB形式に展開
    const fullHex = hex.length === 3
      ? hex.split('').map(c => c + c).join('')
      : hex;

    if (fullHex.length === 6) {
      const r = parseInt(fullHex.slice(0, 2), 16);
      const g = parseInt(fullHex.slice(2, 4), 16);
      const b = parseInt(fullHex.slice(4, 6), 16);

      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }

  // CSS色名をRGB値に変換
  const rgb = getColorNameRgb(normalizedColor);
  if (rgb) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  // フォールバック: 灰色
  return `rgba(128, 128, 128, ${alpha})`;
}

/**
 * 後方互換性のため残す（非推奨）
 * @deprecated assignColorToItemを使用してください
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
  seconds: number;
  color: string;
}

/**
 * 積み上げ棒グラフの表示設定
 */
export interface StackBarDisplayConfig {
  segments: TaskExecutionSegment[];
  totalSeconds: number;
  displayMaxSeconds: number;
  hourMarkers: number[];
}

/**
 * 積み上げ棒グラフの表示に必要な情報をすべて計算する
 * @param items ListItemリスト（TodoまたはCalendarEvent）
 * @param date 日付（YYYY-MM-DD形式）
 * @param projectRepo プロジェクト定義リポジトリ
 * @returns 積み上げ棒グラフの表示設定
 */
export function calculateStackBarDisplay(
  items: ListItem[],
  date: string,
  projectRepo: ProjectDefinitionRepository
): StackBarDisplayConfig {
  const segments: TaskExecutionSegment[] = [];
  let totalSeconds = 0;

  // 各ListItemの実行時間を計算してセグメント情報を作成
  for (const item of items) {
    const seconds = calculateExecutionTimeForDate(item, date);
    if (seconds > 0) {
      segments.push({
        itemId: item.getId(),
        itemText: item.getText(),
        seconds,
        color: assignColorToItem(item, date, projectRepo)
      });
      totalSeconds += seconds;
    }
  }

  // 12時間（43200秒）を基準値とする
  const BASE_SECONDS = 12 * 60 * 60;

  // 表示する最大時間（12時間以上の場合は実際の時間、未満の場合は12時間）
  const displayMaxSeconds = Math.max(totalSeconds, BASE_SECONDS);

  // 1時間ごとの目盛を生成
  const totalHours = Math.ceil(displayMaxSeconds / 3600);
  const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => i);

  return {
    segments,
    totalSeconds,
    displayMaxSeconds,
    hourMarkers
  };
}
