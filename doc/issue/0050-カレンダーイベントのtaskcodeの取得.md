- カレンダーイベント取得時にtaskcodeを設定する
    - taskcodeを決める処理は必ず関数として切り出すこと
    - taskcodeは以下の2つをみて決める
        - GoogleCalendarイベントのsummary名
        - プロジェクト定義に記載れたkeyword
    - keywordがsummaryに含まれていればそれをtaskcodeとする
        - 複数該当することもあるが、まずは一番最初に該当したものを採用するので良い
    - プロジェクトは年月ごとにあるが、そのイベントの日付の年月を使用すること

