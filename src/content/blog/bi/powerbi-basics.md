---
title: 'Power BI 入門：データ可視化の第一歩'
description: 'Power BIを使ってExcelデータをインタラクティブなダッシュボードに変換する方法を、スクリーンショットを交えて解説します。'
pubDate: '2026-05-15'
heroImage: '../../../assets/blog-placeholder-3.jpg'
category: 'bi'
---

これはダミー記事です。後で本番コンテンツに差し替えてください。

## Power BI とは

Microsoft が提供するBIツールです。Excel データや各種データソースを接続し、インタラクティブなレポートを作成できます。

## 基本的な手順

1. **データの取り込み**: 「データを取得」からExcelやCSVを読み込む
2. **データの整形**: Power Queryエディタでクレンジング
3. **リレーションシップの設定**: テーブル間の結合キーを定義
4. **ビジュアルの作成**: 棒グラフ・折れ線グラフ・マップを配置
5. **フィルター・スライサー**: ユーザーが絞り込めるUIを追加

## DAX の基本

```dax
売上合計 = SUM(Sales[Amount])
前年比 = DIVIDE([売上合計], CALCULATE([売上合計], SAMEPERIODLASTYEAR('Date'[Date])))
```

## まとめ

Power BIは無料のDesktop版から始められます。まずは手元のExcelデータを読み込んで試してみてください。
