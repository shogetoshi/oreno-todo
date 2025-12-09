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
    // projectcode, colorを取得
    const projectcode = json.projectcode;
    const color = json.color;

    // taskcodes配列から各taskcode.taskcodeを抽出
    const taskcodes: string[] = [];
    if (Array.isArray(json.taskcodes)) {
      for (const item of json.taskcodes) {
        if (item && typeof item === 'object' && item.taskcode) {
          taskcodes.push(item.taskcode);
        }
      }
    }

    // 未使用フィールド(assign, keywords, quickTasks, projectnameなど)は無視
    return new ProjectDefinition(projectcode, color, taskcodes);
  }

  /**
   * JSON形式に変換する
   * @returns JSONオブジェクト
   */
  toJSON(): any {
    return {
      projectcode: this.projectcode,
      color: this.color,
      taskcodes: this.taskcodes.map(taskcode => ({ taskcode }))
    };
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
    // JSON.parse()でパース
    const json = JSON.parse(jsonText);

    // Map<string, ProjectDefinition[]>を構築
    const definitions = new Map<string, ProjectDefinition[]>();

    // { "2025-12": [...], "2025-11": [...] } 形式を想定
    for (const month in json) {
      if (Array.isArray(json[month])) {
        // 各月のプロジェクト定義配列をProjectDefinition.fromJSON()で変換
        const projectDefs = json[month].map((item: any) => ProjectDefinition.fromJSON(item));
        definitions.set(month, projectDefs);
      }
    }

    return new ProjectDefinitionRepository(definitions);
  }

  /**
   * ProjectDefinitionRepositoryをJSON文字列に変換する
   * @param repo ProjectDefinitionRepositoryインスタンス
   * @returns JSON文字列
   */
  static toJsonText(repo: ProjectDefinitionRepository): string {
    // definitions MapをObjectに変換
    const obj: Record<string, any[]> = {};

    // 各ProjectDefinitionをtoJSON()でJSONに変換
    repo.definitions.forEach((projectDefs, month) => {
      obj[month] = projectDefs.map(def => def.toJSON());
    });

    // JSON.stringify()で文字列化（インデント2）
    return JSON.stringify(obj, null, 2);
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
    // dateから月（YYYY-MM）を抽出
    const month = date.substring(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"

    // repo.definitions.get(month)で該当月のプロジェクト定義を取得
    const projectDefs = repo.definitions.get(month);
    if (!projectDefs) {
      return null;
    }

    // 各ProjectDefinitionのtaskcodesにtaskcodeが含まれているか確認
    for (const projectDef of projectDefs) {
      if (projectDef.taskcodes.includes(taskcode)) {
        // マッチしたプロジェクトのcolorを返す
        return projectDef.color;
      }
    }

    // 見つからない場合はnull
    return null;
  }

  /**
   * 空のProjectDefinitionRepositoryを生成する
   * @returns 空のProjectDefinitionRepositoryインスタンス
   */
  static createEmpty(): ProjectDefinitionRepository {
    return new ProjectDefinitionRepository(new Map());
  }
}
