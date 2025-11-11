import { getCurrentJSTTime, parseJSTString } from '../utils/timeFormat';

/**
 * 時間計測の範囲を表す型
 */
export interface TimeRange {
  start: string;
  end: string | null;
}

/**
 * TODOアイテムを表すクラス
 * JSON互換の構造を持ち、内部表現と意味的なアクセスインターフェースを提供する
 */
export class Todo {
  private rawData: any; // 元のJSONデータを保持

  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly completedAt: string | null,
    rawData?: any
  ) {
    // 元データを保持（なければ基本プロパティ + 空のtimeRanges）
    this.rawData = rawData || { id, text, completedAt, timeRanges: [] };
  }

  /**
   * TodoのIDを取得する
   */
  getId(): string {
    return this.id;
  }

  /**
   * Todoのテキスト（タスク内容）を取得する
   */
  getText(): string {
    return this.text;
  }

  /**
   * Todoが完了しているかどうかを判定する
   */
  isCompleted(): boolean {
    return this.completedAt !== null;
  }

  /**
   * Todoが未完了かどうかを判定する
   */
  isActive(): boolean {
    return this.completedAt === null;
  }

  /**
   * 完了日時を取得する
   */
  getCompletedAt(): string | null {
    return this.completedAt;
  }

  /**
   * テキストを更新した新しいTodoインスタンスを返す
   */
  setText(newText: string): Todo {
    const newRawData = { ...this.rawData, text: newText };
    return new Todo(this.id, newText, this.completedAt, newRawData);
  }

  /**
   * 完了状態を切り替えた新しいTodoインスタンスを返す
   */
  toggleCompleted(): Todo {
    const newCompletedAt = this.completedAt === null ? getCurrentJSTTime() : null;
    const newRawData = { ...this.rawData, completedAt: newCompletedAt };
    return new Todo(this.id, this.text, newCompletedAt, newRawData);
  }

  /**
   * 完了状態を設定した新しいTodoインスタンスを返す
   */
  setCompleted(completed: boolean): Todo {
    const newCompletedAt = completed ? getCurrentJSTTime() : null;
    const newRawData = { ...this.rawData, completedAt: newCompletedAt };
    return new Todo(this.id, this.text, newCompletedAt, newRawData);
  }

  /**
   * 時間計測を開始した新しいTodoインスタンスを返す
   * 新しいTimeRange要素を追加（endはnull）
   */
  startTimer(): Todo {
    const existingRanges: TimeRange[] = this.rawData.timeRanges || [];
    const newRange: TimeRange = {
      start: getCurrentJSTTime(),
      end: null
    };
    const newRawData = {
      ...this.rawData,
      timeRanges: [...existingRanges, newRange]
    };
    return new Todo(this.id, this.text, this.completedAt, newRawData);
  }

  /**
   * 時間計測を停止した新しいTodoインスタンスを返す
   * 最新のTimeRangeのendに現在時刻を設定
   */
  stopTimer(): Todo {
    const existingRanges: TimeRange[] = this.rawData.timeRanges || [];
    if (existingRanges.length === 0) {
      return this; // タイマーが開始されていない場合は何もしない
    }

    const newRanges = [...existingRanges];
    const lastRange = newRanges[newRanges.length - 1];

    // 最後の要素のendがnullの場合のみ停止
    if (lastRange.end === null) {
      newRanges[newRanges.length - 1] = {
        ...lastRange,
        end: getCurrentJSTTime()
      };
    }

    const newRawData = {
      ...this.rawData,
      timeRanges: newRanges
    };
    return new Todo(this.id, this.text, this.completedAt, newRawData);
  }

  /**
   * タイマーが実行中かどうかを判定する
   * 最新のTimeRangeのendがnullの場合、実行中と判定
   */
  isTimerRunning(): boolean {
    const timeRanges: TimeRange[] = this.rawData.timeRanges || [];
    if (timeRanges.length === 0) {
      return false;
    }
    const lastRange = timeRanges[timeRanges.length - 1];
    return lastRange.end === null;
  }

  /**
   * 合計実行時間を分単位で取得する
   * timeRanges配列内の全ての時間範囲を秒単位で計算し、分に変換して返す
   * endがnullの場合（実行中）は現在時刻までを含めて計算する
   */
  getTotalExecutionTimeInMinutes(): number {
    const timeRanges: TimeRange[] = this.rawData.timeRanges || [];
    if (timeRanges.length === 0) {
      return 0;
    }

    const totalSeconds = timeRanges.reduce((total, range) => {
      const startTime = parseJSTString(range.start).getTime();
      const endTime = range.end ? parseJSTString(range.end).getTime() : Date.now();
      const durationMs = endTime - startTime;
      const durationSeconds = Math.floor(durationMs / 1000);
      return total + durationSeconds;
    }, 0);

    // 秒を分に変換（小数第1位まで）
    return Math.round(totalSeconds / 60);
  }

  /**
   * JSONからTodoインスタンスを作成する
   * 既存のboolean形式とstring形式の両方に対応
   */
  static fromJSON(json: any): Todo {
    // 既存データとの互換性のため、completedがbooleanの場合も対応
    let completedAt: string | null = null;

    if (typeof json.completed === 'boolean') {
      // 旧形式: completed: boolean
      completedAt = json.completed ? (json.createdAt || getCurrentJSTTime()) : null;
    } else if (json.completedAt) {
      // 新形式: completedAt: string | null
      completedAt = json.completedAt;
    }

    // timeRangesが存在しない場合は空配列で初期化
    const jsonWithDefaults = {
      ...json,
      timeRanges: json.timeRanges || []
    };

    // 元のJSONデータをそのまま保持
    return new Todo(json.id, json.text, completedAt, jsonWithDefaults);
  }

  /**
   * JSON形式に変換する
   * 元のJSONデータをそのまま返す（text, completedAtは最新の値で更新）
   */
  toJSON() {
    return this.rawData;
  }
}
