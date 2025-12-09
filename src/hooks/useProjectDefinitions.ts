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
    try {
      // window.electronAPI.loadProjectDefinitions()を呼び出し
      const json = await window.electronAPI.loadProjectDefinitions();

      // 取得したJSONをJSON.stringify()で文字列化
      const jsonText = JSON.stringify(json);

      // ProjectDefinitionRepository.fromJsonText()でパース
      const repo = ProjectDefinitionRepository.fromJsonText(jsonText);

      // setProjectRepo()で状態を更新
      setProjectRepo(repo);
    } catch (error) {
      // エラー時はconsole.errorでログ出力し、空のリポジトリを設定
      console.error('Failed to load project definitions:', error);
      setProjectRepo(ProjectDefinitionRepository.createEmpty());
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * IPC経由でプロジェクト定義を保存
   * @param repo 保存するProjectDefinitionRepository
   */
  const saveProjectDefinitions = async (repo: ProjectDefinitionRepository) => {
    // ProjectDefinitionRepository.toJsonText()でJSON文字列化
    const jsonText = ProjectDefinitionRepository.toJsonText(repo);

    // JSON.parse()でオブジェクトに変換
    const json = JSON.parse(jsonText);

    // window.electronAPI.saveProjectDefinitions()で保存
    const result = await window.electronAPI.saveProjectDefinitions(json);

    // エラー時は例外をスロー
    if (!result.success) {
      throw new Error(result.error || 'Failed to save project definitions');
    }
  };

  /**
   * JSONテキストからプロジェクト定義を置き換え
   * @param jsonText プロジェクト定義のJSON文字列
   */
  const replaceFromJson = async (jsonText: string) => {
    // ProjectDefinitionRepository.fromJsonText()でパース（エラー時は例外がスロー）
    const repo = ProjectDefinitionRepository.fromJsonText(jsonText);

    // saveProjectDefinitions()で保存
    await saveProjectDefinitions(repo);

    // 成功したらsetProjectRepo()で状態を更新
    setProjectRepo(repo);
  };

  return {
    projectRepo,
    isLoading,
    replaceFromJson
  };
}
