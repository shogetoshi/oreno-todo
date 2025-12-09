/**
 * Model Layer: ProjectDefinition Entity & Repository
 * プロジェクト定義のドメインモデル
 */

/**
 * プロジェクト定義を表すクラス
 * 月別にプロジェクトとそれに紐づくtaskcodeを管理する
 */
export class ProjectDefinition {
  constructor(
    public readonly projectcode: string,
    public readonly color: string,
    public readonly taskcodes: string[]
  ) {}

  /**
   * JSONからProjectDefinitionインスタンスを作成する
   * @param json プロジェクト定義のJSONオブジェクト
   * @returns ProjectDefinitionインスタンス
   */
  static fromJSON(json: any): ProjectDefinition {
    // TODO: 実装
    // - projectcode, colorを取得
    // - taskcodes配列から各taskcode.taskcodeを抽出して配列にする
    // - 未使用フィールド（assign, keywords, quickTasks, projectnameなど）は無視
    throw new Error('Not implemented');
  }

  /**
   * JSON形式に変換する
   * @returns JSONオブジェクト
   */
  toJSON(): any {
    // TODO: 実装
    // - projectcode, color, taskcodesをオブジェクトに変換
    // - taskcodes配列は各要素を { taskcode: string } 形式にする
    throw new Error('Not implemented');
  }
}

/**
 * プロジェクト定義のコレクション管理クラス
 * 月別のプロジェクト定義を管理し、taskcodeから色を解決する
 */
export class ProjectDefinitionRepository {
  /**
   * @param definitions 月別のプロジェクト定義マップ (例: "2025-12" -> ProjectDefinition[])
   */
  constructor(
    public readonly definitions: Map<string, ProjectDefinition[]>
  ) {}

  /**
   * JSONテキストからProjectDefinitionRepositoryインスタンスを作成する
   * @param jsonText プロジェクト定義のJSON文字列
   * @returns ProjectDefinitionRepositoryインスタンス
   */
  static fromJsonText(jsonText: string): ProjectDefinitionRepository {
    // TODO: 実装
    // - JSON.parse()でパース
    // - { "2025-12": [...], "2025-11": [...] } 形式を想定
    // - 各月のプロジェクト定義配列をProjectDefinition.fromJSON()で変換
    // - Map<string, ProjectDefinition[]>を構築
    throw new Error('Not implemented');
  }

  /**
   * ProjectDefinitionRepositoryをJSON文字列に変換する
   * @param repo ProjectDefinitionRepositoryインスタンス
   * @returns JSON文字列
   */
  static toJsonText(repo: ProjectDefinitionRepository): string {
    // TODO: 実装
    // - definitions MapをObjectに変換
    // - 各ProjectDefinitionをtoJSON()でJSONに変換
    // - JSON.stringify()で文字列化（インデント2）
    throw new Error('Not implemented');
  }

  /**
   * 指定日付・taskcodeからプロジェクト色を取得する
   * @param repo ProjectDefinitionRepositoryインスタンス
   * @param date 日付（YYYY-MM-DD形式）
   * @param taskcode タスクコード
   * @returns プロジェクト色（CSS color値）、該当なしの場合はnull
   */
  static getColorForTaskcode(
    repo: ProjectDefinitionRepository,
    date: string,
    taskcode: string
  ): string | null {
    // TODO: 実装
    // - dateから月（YYYY-MM）を抽出
    // - repo.definitions.get(month)で該当月のプロジェクト定義を取得
    // - 各ProjectDefinitionのtaskcodesにtaskcodeが含まれているか確認
    // - マッチしたプロジェクトのcolorを返す、見つからない場合はnull
    throw new Error('Not implemented');
  }

  /**
   * 空のProjectDefinitionRepositoryを生成する
   * @returns 空のProjectDefinitionRepositoryインスタンス
   */
  static createEmpty(): ProjectDefinitionRepository {
    return new ProjectDefinitionRepository(new Map());
  }
}
