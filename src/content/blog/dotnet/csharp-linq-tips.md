---
title: 'C# LINQを使いこなす実践テクニック'
description: 'C#のLINQを活用してコレクション操作をシンプルに書く方法を、実践的なコード例とともに解説します。'
pubDate: '2026-05-20'
heroImage: '../../../assets/blog-placeholder-2.jpg'
category: 'dotnet'
---

これはダミー記事です。後で本番コンテンツに差し替えてください。

## LINQとは

LINQ（Language Integrated Query）は、C#でコレクションやデータベースを統一的なクエリ構文で操作できる機能です。

## よく使うメソッド

```csharp
var numbers = new[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

// Where: フィルタリング
var evens = numbers.Where(n => n % 2 == 0);

// Select: 変換
var squared = numbers.Select(n => n * n);

// GroupBy: グループ化
var grouped = numbers.GroupBy(n => n % 2 == 0 ? "偶数" : "奇数");

// Aggregate: 集計
var sum = numbers.Aggregate((acc, n) => acc + n);
```

## パフォーマンスの注意点

LINQは遅延評価されます。`ToList()` や `ToArray()` を呼んで初めて評価が走ります。ループ内で繰り返し評価されないよう注意してください。

## まとめ

LINQを活用するとコードが宣言的になり、可読性が向上します。
