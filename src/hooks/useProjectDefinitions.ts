import { useState, useEffect } from 'react';
import { ProjectDefinitionRepository } from '../models/ProjectDefinition';

/**
 * Controller Layer: useProjectDefinitions Hook
 * プロジェクト定義の状態管理、IPC通信、Model層への委譲を担当
 */
export function useProjectDefinitions() {
  const [projectRepo, setProjectRepo] = useState<ProjectDefinitionRepository>(
    ProjectDefinitionRepository.createEmpty()
  );
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 初回マウント時にプロジェクト定義をロード
   */
  useEffect(() => {
    loadProjectDefinitions();
  }, []);

  /**
   * IPC経由でプロジェクト定義を読み込む
   */
  const loadProjectDefinitions = async () => {
    // TODO: 実装
    // - window.electronAPI.loadProjectDefinitions()を呼び出し
    // - 取得したJSONをJSON.stringify()で文字列化
    // - ProjectDefinitionRepository.fromJsonText()でパース
    // - setProjectRepo()で状態を更新
    // - setIsLoading(false)
    // - エラー時はconsole.errorでログ出力し、空のリポジトリを設定
  };

  /**
   * IPC経由でプロジェクト定義を保存
   * @param repo 保存するProjectDefinitionRepository
   */
  const saveProjectDefinitions = async (repo: ProjectDefinitionRepository) => {
    // TODO: 実装
    // - ProjectDefinitionRepository.toJsonText()でJSON文字列化
    // - JSON.parse()でオブジェクトに変換
    // - window.electronAPI.saveProjectDefinitions()で保存
    // - エラー時は例外をスロー
  };

  /**
   * JSONテキストからプロジェクト定義を置き換え
   * @param jsonText プロジェクト定義のJSON文字列
   */
  const replaceFromJson = async (jsonText: string) => {
    // TODO: 実装
    // - ProjectDefinitionRepository.fromJsonText()でパース（エラー時は例外がスロー）
    // - saveProjectDefinitions()で保存
    // - 成功したらsetProjectRepo()で状態を更新
  };

  return {
    projectRepo,
    isLoading,
    replaceFromJson
  };
}
