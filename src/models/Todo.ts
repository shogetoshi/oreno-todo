import { getCurrentJSTTime, parseJSTString } from '../utils/timeFormat';
import { ListItem, ListItemType } from './ListItem';

/**
 * Model Layer: Todo Entity
 * TODOアイテムのドメインモデル
 */

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
 * イミュータブルな設計: すべての更新メソッドは新しいインスタンスを返す
 * ListItemインターフェースを実装し、カレンダーイベントと共通のインターフェースで扱える
 */
export class Todo implements ListItem {
  constructor(
    public readonly id: string,
    public readonly taskcode: string,
    public readonly text: string,
    public readonly completedAt: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly timeRanges: TimeRange[]
  ) {}

  /**
   * TodoのIDを取得する
   */
  getId(): string {
    return this.id;
  }

  /**
   * Todoのタイプを取得する
   */
  getType(): ListItemType {
    return ListItemType.TODO;
  }

  /**
   * Todoのタスクコードを取得する
   */
  getTaskcode(): string {
    return this.taskcode;
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
   * 完了日時を取得する
   */
  getCompletedAt(): string | null {
    return this.completedAt;
  }

  /**
   * タスクコードを更新した新しいTodoインスタンスを返す
   */
  setTaskcode(newTaskcode: string): Todo {
    const now = getCurrentJSTTime();
    return new Todo(this.id, newTaskcode, this.text, this.completedAt, this.createdAt, now, this.timeRanges);
  }

  /**
   * テキストを更新した新しいTodoインスタンスを返す
   */
  setText(newText: string): Todo {
    const now = getCurrentJSTTime();
    return new Todo(this.id, this.taskcode, newText, this.completedAt, this.createdAt, now, this.timeRanges);
  }

  /**
   * 完了状態を切り替えた新しいTodoインスタンスを返す
   */
  toggleCompleted(): Todo {
    return this.setCompleted(!this.isCompleted());
  }

  /**
   * 完了状態を設定した新しいTodoインスタンスを返す
   */
  setCompleted(completed: boolean): Todo {
    const now = getCurrentJSTTime();
    const newCompletedAt = completed ? now : null;
    return new Todo(this.id, this.taskcode, this.text, newCompletedAt, this.createdAt, now, this.timeRanges);
  }

  /**
   * 時間計測を開始した新しいTodoインスタンスを返す
   * 新しいTimeRange要素を追加（endはnull）
   */
  startTimer(): Todo {
    const now = getCurrentJSTTime();
    const newRange: TimeRange = {
      start: now,
      end: null
    };
    const newTimeRanges = [...this.timeRanges, newRange];
    return new Todo(this.id, this.taskcode, this.text, this.completedAt, this.createdAt, now, newTimeRanges);
  }

  /**
   * 時間計測を停止した新しいTodoインスタンスを返す
   * 最新のTimeRangeのendに現在時刻を設定
   */
  stopTimer(): Todo {
    if (this.timeRanges.length === 0) {
      return this; // タイマーが開始されていない場合は何もしない
    }

    const newRanges = [...this.timeRanges];
    const lastRange = newRanges[newRanges.length - 1];

    // 最後の要素のendがnullの場合のみ停止
    if (lastRange.end === null) {
      const now = getCurrentJSTTime();
      newRanges[newRanges.length - 1] = {
        ...lastRange,
        end: now
      };
      return new Todo(this.id, this.taskcode, this.text, this.completedAt, this.createdAt, now, newRanges);
    }

    return this;
  }

  /**
   * タイマーが実行中かどうかを判定する
   * 最新のTimeRangeのendがnullの場合、実行中と判定
   */
  isTimerRunning(): boolean {
    if (this.timeRanges.length === 0) {
      return false;
    }
    const lastRange = this.timeRanges[this.timeRanges.length - 1];
    return lastRange.end === null;
  }

  /**
   * 合計実行時間を分単位で取得する
   * timeRanges配列内の全ての時間範囲を秒単位で計算し、分に変換して返す
   * endがnullの場合（実行中）は現在時刻までを含めて計算する
   */
  getTotalExecutionTimeInMinutes(): number {
    if (this.timeRanges.length === 0) {
      return 0;
    }

    const totalSeconds = this.timeRanges.reduce((total, range) => {
      const startTime = parseJSTString(range.start).getTime();
      const endTime = range.end ? parseJSTString(range.end).getTime() : parseJSTString(getCurrentJSTTime()).getTime();
      const durationMs = endTime - startTime;
      const durationSeconds = Math.floor(durationMs / 1000);
      return total + durationSeconds;
    }, 0);

    // 秒を分に変換（小数第1位まで）
    return Math.round(totalSeconds / 60);
  }

  /**
   * 指定日付における実行時間を分単位で取得する
   * @param date 日付（YYYY-MM-DD形式）
   * @returns 指定日付における実行時間（分）
   */
  getExecutionTimeForDate(_date: string): number {
    // TODO: 実装
    // timeRangesをループし、指定日付のものだけを集計
    // extractDateFromJST, parseJSTStringを使用
    return 0;
  }

  /**
   * 時間範囲の配列を取得する
   */
  getTimeRanges(): TimeRange[] {
    return this.timeRanges;
  }

  /**
   * JSONからTodoインスタンスを作成する
   */
  static fromJSON(json: any): Todo {
    const now = getCurrentJSTTime();

    // completedAt: string | null
    const completedAt: string | null = json.completedAt || null;

    // タイムスタンプのフォールバック処理
    const createdAt = json.createdAt || now;
    const updatedAt = json.updatedAt || now;

    // taskcodeが存在しない場合は空文字列で初期化（既存データとの互換性）
    const taskcode = json.taskcode || '';

    // timeRangesは必須プロパティ（デフォルト値は空配列）
    const timeRanges: TimeRange[] = json.timeRanges || [];

    return new Todo(json.id, taskcode, json.text, completedAt, createdAt, updatedAt, timeRanges);
  }

  /**
   * JSON形式に変換する
   */
  toJSON() {
    return {
      id: this.id,
      type: this.getType(),
      taskcode: this.taskcode,
      text: this.text,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      timeRanges: this.timeRanges
    };
  }
}
