import { describe, it, expect } from 'vitest';
import { ProjectDefinition, ProjectDefinitionRepository } from './ProjectDefinition';

describe('ProjectDefinition', () => {
  describe('fromJSON', () => {
    it('正常なJSONからインスタンスを生成できる', () => {
      const json = {
        projectcode: 'ProjectA',
        color: 'red',
        taskcodes: [
          { taskcode: 'TASK-001' },
          { taskcode: 'TASK-002' }
        ]
      };

      const projectDef = ProjectDefinition.fromJSON(json);

      expect(projectDef.projectcode).toBe('ProjectA');
      expect(projectDef.color).toBe('red');
      expect(projectDef.taskcodes).toEqual(['TASK-001', 'TASK-002']);
    });

    it('未使用フィールドを無視する', () => {
      const json = {
        projectcode: 'ProjectB',
        color: 'blue',
        assign: 0.5,
        projectname: 'Project Name',
        taskcodes: [
          {
            taskcode: 'TASK-003',
            keywords: ['keyword1', 'keyword2'],
            quickTasks: ['quick1', 'quick2']
          }
        ]
      };

      const projectDef = ProjectDefinition.fromJSON(json);

      expect(projectDef.projectcode).toBe('ProjectB');
      expect(projectDef.color).toBe('blue');
      expect(projectDef.taskcodes).toEqual(['TASK-003']);
    });

    it('空のtaskcodes配列を扱える', () => {
      const json = {
        projectcode: 'ProjectC',
        color: 'green',
        taskcodes: []
      };

      const projectDef = ProjectDefinition.fromJSON(json);

      expect(projectDef.taskcodes).toEqual([]);
    });
  });

  describe('toJSON', () => {
    it('JSON形式に変換できる', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', ['TASK-001', 'TASK-002']);

      const json = projectDef.toJSON();

      expect(json).toEqual({
        projectcode: 'ProjectA',
        color: 'red',
        taskcodes: [
          { taskcode: 'TASK-001' },
          { taskcode: 'TASK-002' }
        ]
      });
    });
  });
});

describe('ProjectDefinitionRepository', () => {
  describe('fromJsonText', () => {
    it('JSONテキストからインスタンスを生成できる', () => {
      const jsonText = JSON.stringify({
        '2025-12': [
          {
            projectcode: 'ProjectA',
            color: 'red',
            taskcodes: [
              { taskcode: 'TASK-001' }
            ]
          }
        ],
        '2025-11': [
          {
            projectcode: 'ProjectB',
            color: 'blue',
            taskcodes: [
              { taskcode: 'TASK-002' }
            ]
          }
        ]
      });

      const repo = ProjectDefinitionRepository.fromJsonText(jsonText);

      expect(repo.definitions.size).toBe(2);
      expect(repo.definitions.get('2025-12')?.length).toBe(1);
      expect(repo.definitions.get('2025-12')?.[0].projectcode).toBe('ProjectA');
      expect(repo.definitions.get('2025-11')?.length).toBe(1);
      expect(repo.definitions.get('2025-11')?.[0].projectcode).toBe('ProjectB');
    });

    it('空のJSONテキストから空のリポジトリを生成できる', () => {
      const jsonText = '{}';

      const repo = ProjectDefinitionRepository.fromJsonText(jsonText);

      expect(repo.definitions.size).toBe(0);
    });
  });

  describe('toJsonText', () => {
    it('JSON文字列に変換できる', () => {
      const projectDef1 = new ProjectDefinition('ProjectA', 'red', ['TASK-001']);
      const projectDef2 = new ProjectDefinition('ProjectB', 'blue', ['TASK-002']);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef1]);
      definitions.set('2025-11', [projectDef2]);
      const repo = new ProjectDefinitionRepository(definitions);

      const jsonText = ProjectDefinitionRepository.toJsonText(repo);
      const parsed = JSON.parse(jsonText);

      expect(parsed['2025-12']).toHaveLength(1);
      expect(parsed['2025-12'][0].projectcode).toBe('ProjectA');
      expect(parsed['2025-11']).toHaveLength(1);
      expect(parsed['2025-11'][0].projectcode).toBe('ProjectB');
    });

    it('空のリポジトリをJSON文字列に変換できる', () => {
      const repo = ProjectDefinitionRepository.createEmpty();

      const jsonText = ProjectDefinitionRepository.toJsonText(repo);

      expect(jsonText).toBe('{}');
    });
  });

  describe('getColorForTaskcode', () => {
    it('該当するプロジェクトの色を返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', ['TASK-001', 'TASK-002']);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const color = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-12-15', 'TASK-001');

      expect(color).toBe('red');
    });

    it('該当するプロジェクトがない場合はnullを返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', ['TASK-001']);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const color = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-12-15', 'TASK-999');

      expect(color).toBeNull();
    });

    it('月が異なる場合はnullを返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', ['TASK-001']);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const color = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-11-15', 'TASK-001');

      expect(color).toBeNull();
    });

    it('複数のプロジェクトがある場合、最初にマッチしたプロジェクトの色を返す', () => {
      const projectDef1 = new ProjectDefinition('ProjectA', 'red', ['TASK-001']);
      const projectDef2 = new ProjectDefinition('ProjectB', 'blue', ['TASK-002', 'TASK-003']);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef1, projectDef2]);
      const repo = new ProjectDefinitionRepository(definitions);

      const color1 = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-12-15', 'TASK-001');
      const color2 = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-12-15', 'TASK-002');

      expect(color1).toBe('red');
      expect(color2).toBe('blue');
    });
  });

  describe('createEmpty', () => {
    it('空のリポジトリを生成できる', () => {
      const repo = ProjectDefinitionRepository.createEmpty();

      expect(repo.definitions.size).toBe(0);
    });
  });
});
