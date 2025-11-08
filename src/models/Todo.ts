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
    // 元データを保持（なければ基本プロパティのみ）
    this.rawData = rawData || { id, text, completedAt };
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
    const newCompletedAt = this.completedAt === null ? new Date().toISOString() : null;
    const newRawData = { ...this.rawData, completedAt: newCompletedAt };
    return new Todo(this.id, this.text, newCompletedAt, newRawData);
  }

  /**
   * 完了状態を設定した新しいTodoインスタンスを返す
   */
  setCompleted(completed: boolean): Todo {
    const newCompletedAt = completed ? new Date().toISOString() : null;
    const newRawData = { ...this.rawData, completedAt: newCompletedAt };
    return new Todo(this.id, this.text, newCompletedAt, newRawData);
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
      completedAt = json.completed ? (json.createdAt || new Date().toISOString()) : null;
    } else if (json.completedAt) {
      // 新形式: completedAt: string | null
      completedAt = json.completedAt;
    }

    // 元のJSONデータをそのまま保持
    return new Todo(json.id, json.text, completedAt, json);
  }

  /**
   * JSON形式に変換する
   * 元のJSONデータをそのまま返す（text, completedAtは最新の値で更新）
   */
  toJSON() {
    return this.rawData;
  }
}
