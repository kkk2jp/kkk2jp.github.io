---
title: '.NET 9 入門：最初のWebAPIを作る'
description: '.NET 9とASP.NET Core Minimal APIを使って、シンプルなREST APIをゼロから構築する手順を解説します。'
pubDate: '2026-06-01'
heroImage: '../../../assets/blog-placeholder-1.jpg'
category: 'dotnet'
---

これはダミー記事です。後で本番コンテンツに差し替えてください。

## はじめに

.NET 9 と ASP.NET Core Minimal API を使って、シンプルな REST API を構築する方法を紹介します。

## プロジェクトの作成

```bash
dotnet new webapi -n MyApi --use-minimal-apis
cd MyApi
dotnet run
```

## エンドポイントの追加

```csharp
app.MapGet("/hello", () => "Hello, World!");

app.MapGet("/users/{id}", (int id) =>
    Results.Ok(new { Id = id, Name = "Sample User" }));
```

## まとめ

Minimal API は記述量が少なく、シンプルなAPIに最適です。次回はEF CoreによるDB連携を紹介します。
