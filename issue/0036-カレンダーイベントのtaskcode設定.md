- Googleカレンダーからイベント取得時にtaskcodeを自動で割り当てる
    - プロジェクト定義のtaskcodesに`keywords`項目を追加
    - keywordsに指定された単語がイベント名に入っていたらそのtaskcodeを設定
        - 複数に該当することはない前提で、最初に見つかったら決定で良い

```
{
  "2025-12": [
    {
      "projectcode": "ProjectA",
      "color": "red",
      "assign": 0.6,
      "taskcodes": [
        {
          "taskcode": "ProjectA",
          "keywords": [
            "ProjectA",
            "prja"
          ],
          "quickTasks": [
            "ProjectA"
          ]
        }
      ]
    },
    {
      "projectcode": "genAI",
      "color": "pink",
      "assign": 0,
      "taskcodes": [
        {
          "taskcode": "genAI",
          "keywords": [
            "生成AI",
            "genAI"
          ],
          "quickTasks": [
            "生成AI"
          ]
        }
      ]
    },
    {
      "projectcode": "c",
      "projectname": "部門共通",
      "color": "orange",
      "taskcodes": [
        {
          "taskcode": "c110",
          "keywords": [
            "全社昼礼"
          ]
        },
        {
          "taskcode": "c120",
          "keywords": [
            "四半期報告会"
          ]
        }
      ]
    }
  ]
}
```
