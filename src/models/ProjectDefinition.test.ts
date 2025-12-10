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
      expect(projectDef.taskcodes).toHaveLength(2);
      expect(projectDef.taskcodes[0].taskcode).toBe('TASK-001');
      expect(projectDef.taskcodes[1].taskcode).toBe('TASK-002');
    });

    it('keywordsとquickTasksを含むJSONからインスタンスを生成できる', () => {
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
      expect(projectDef.taskcodes).toHaveLength(1);
      expect(projectDef.taskcodes[0].taskcode).toBe('TASK-003');
      expect(projectDef.taskcodes[0].keywords).toEqual(['keyword1', 'keyword2']);
      expect(projectDef.taskcodes[0].quickTasks).toEqual(['quick1', 'quick2']);
    });

    it('keywordsがない場合でも正しく読み込める（後方互換性）', () => {
      const json = {
        projectcode: 'ProjectC',
        color: 'green',
        taskcodes: [
          { taskcode: 'TASK-004' }
        ]
      };

      const projectDef = ProjectDefinition.fromJSON(json);

      expect(projectDef.taskcodes).toHaveLength(1);
      expect(projectDef.taskcodes[0].taskcode).toBe('TASK-004');
      expect(projectDef.taskcodes[0].keywords).toBeUndefined();
      expect(projectDef.taskcodes[0].quickTasks).toBeUndefined();
    });

    it('空のtaskcodes配列を扱える', () => {
      const json = {
        projectcode: 'ProjectD',
        color: 'yellow',
        taskcodes: []
      };

      const projectDef = ProjectDefinition.fromJSON(json);

      expect(projectDef.taskcodes).toEqual([]);
    });
  });

  describe('toJSON', () => {
    it('JSON形式に変換できる', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['keyword1'], quickTasks: ['quick1'] },
        { taskcode: 'TASK-002' }
      ]);

      const json = projectDef.toJSON();

      expect(json).toEqual({
        projectcode: 'ProjectA',
        color: 'red',
        taskcodes: [
          { taskcode: 'TASK-001', keywords: ['keyword1'], quickTasks: ['quick1'] },
          { taskcode: 'TASK-002', keywords: undefined, quickTasks: undefined }
        ]
      });
    });

    it('keywordsがない場合もJSON形式に変換できる', () => {
      const projectDef = new ProjectDefinition('ProjectB', 'blue', [
        { taskcode: 'TASK-003' }
      ]);

      const json = projectDef.toJSON();

      expect(json).toEqual({
        projectcode: 'ProjectB',
        color: 'blue',
        taskcodes: [
          { taskcode: 'TASK-003', keywords: undefined, quickTasks: undefined }
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
      const projectDef1 = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001' }
      ]);
      const projectDef2 = new ProjectDefinition('ProjectB', 'blue', [
        { taskcode: 'TASK-002' }
      ]);
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
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001' },
        { taskcode: 'TASK-002' }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const color = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-12-15', 'TASK-001');

      expect(color).toBe('red');
    });

    it('該当するプロジェクトがない場合はnullを返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001' }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const color = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-12-15', 'TASK-999');

      expect(color).toBeNull();
    });

    it('月が異なる場合はnullを返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001' }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const color = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-11-15', 'TASK-001');

      expect(color).toBeNull();
    });

    it('複数のプロジェクトがある場合、最初にマッチしたプロジェクトの色を返す', () => {
      const projectDef1 = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001' }
      ]);
      const projectDef2 = new ProjectDefinition('ProjectB', 'blue', [
        { taskcode: 'TASK-002' },
        { taskcode: 'TASK-003' }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef1, projectDef2]);
      const repo = new ProjectDefinitionRepository(definitions);

      const color1 = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-12-15', 'TASK-001');
      const color2 = ProjectDefinitionRepository.getColorForTaskcode(repo, '2025-12-15', 'TASK-002');

      expect(color1).toBe('red');
      expect(color2).toBe('blue');
    });
  });

  describe('findTaskcodeByKeyword', () => {
    it('キーワードにマッチするtaskcodeを返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['ProjectA', 'prja'] }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'ProjectA ミーティング'
      );

      expect(taskcode).toBe('TASK-001');
    });

    it('複数のキーワードがある場合、いずれかにマッチすればtaskcodeを返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['ProjectA', 'prja'] }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode1 = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'prja 作業'
      );
      const taskcode2 = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'ProjectA レビュー'
      );

      expect(taskcode1).toBe('TASK-001');
      expect(taskcode2).toBe('TASK-001');
    });

    it('複数のtaskcodeがマッチする場合、最初に見つかったものを返す', () => {
      const projectDef1 = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['Meeting'] },
        { taskcode: 'TASK-002', keywords: ['Meeting', 'Review'] }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef1]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'Meeting Review'
      );

      // 最初にマッチしたTASK-001が返される
      expect(taskcode).toBe('TASK-001');
    });

    it('マッチしない場合はnullを返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['ProjectA'] }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'ProjectB ミーティング'
      );

      expect(taskcode).toBeNull();
    });

    it('keywordsがない場合はスキップされる', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001' }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'TASK-001 作業'
      );

      expect(taskcode).toBeNull();
    });

    it('月が異なる場合はnullを返す', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['ProjectA'] }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-11-15',
        'ProjectA ミーティング'
      );

      expect(taskcode).toBeNull();
    });

    it('部分一致で検索する', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['生成AI'] }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        '生成AI開発ミーティング'
      );

      expect(taskcode).toBe('TASK-001');
    });

    it('大文字小文字を区別する', () => {
      const projectDef = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['ProjectA'] }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode1 = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'ProjectA ミーティング'
      );
      const taskcode2 = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'projecta ミーティング'
      );

      expect(taskcode1).toBe('TASK-001');
      expect(taskcode2).toBeNull();
    });

    it('複数のプロジェクトがある場合でも正しく検索できる', () => {
      const projectDef1 = new ProjectDefinition('ProjectA', 'red', [
        { taskcode: 'TASK-001', keywords: ['ProjectA', 'prja'] }
      ]);
      const projectDef2 = new ProjectDefinition('genAI', 'pink', [
        { taskcode: 'genAI', keywords: ['生成AI', 'genAI'] }
      ]);
      const definitions = new Map<string, ProjectDefinition[]>();
      definitions.set('2025-12', [projectDef1, projectDef2]);
      const repo = new ProjectDefinitionRepository(definitions);

      const taskcode1 = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        'ProjectA ミーティング'
      );
      const taskcode2 = ProjectDefinitionRepository.findTaskcodeByKeyword(
        repo,
        '2025-12-15',
        '生成AI開発'
      );

      expect(taskcode1).toBe('TASK-001');
      expect(taskcode2).toBe('genAI');
    });
  });

  describe('createEmpty', () => {
    it('空のリポジトリを生成できる', () => {
      const repo = ProjectDefinitionRepository.createEmpty();

      expect(repo.definitions.size).toBe(0);
    });
  });
});
