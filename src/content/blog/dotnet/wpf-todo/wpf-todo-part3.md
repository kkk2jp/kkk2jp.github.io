---
title: 'WPF TodoアプリでMVVMを学ぶ Part3：EF Core + SQLiteでデータ永続化'
description: 'Entity Framework CoreとSQLiteを導入してTodoデータをファイルに保存します。DbContextの設計、マイグレーション、非同期CRUDの実装まで、実践的なデータアクセス層の作り方を解説します。'
pubDate: '2026-06-11'
heroImage: '../../../../assets/blog-placeholder-5.jpg'
category: 'dotnet'
---

## この記事について

[Part 2](/dotnet/wpf-todo/wpf-todo-part2/) まででMVVMの仕組みを理解しました。しかし現状はアプリを閉じるとTodoが消えます。

Part 3では **Entity Framework Core（EF Core）+ SQLite** を導入してデータを永続化します。

- EF Coreのパッケージ導入とDbContextの設計
- マイグレーションでデータベースを作成
- 起動時のデータ読み込み
- 追加・削除の非同期CRUD実装

---

## EF Core とは

**Entity Framework Core** はMicrosoftが提供するO/Rマッパーです。SQLを直接書かずに、C#のクラスでデータベース操作を記述できます。

```csharp
// SQLを書く代わりにLINQで操作できる
var todos = await context.Todos.Where(t => !t.IsCompleted).ToListAsync();
```

対応するデータベースは接続プロバイダを差し替えるだけで変更できます。今回はSQLiteで開発し、Part 5でSQL Serverへの切り替えも確認します。

---

## NuGetパッケージのインストール

パッケージマネージャーコンソールで以下を実行します。

```
Install-Package Microsoft.EntityFrameworkCore.Sqlite
Install-Package Microsoft.EntityFrameworkCore.Tools
```

- `Sqlite` — SQLite接続プロバイダ
- `Tools` — `Add-Migration` などのコマンドを使うために必要

---

## プロジェクト構成の更新

`Data` フォルダを追加します。

```
WpfTodo/
├── Data/
│   └── TodoDbContext.cs   ← 新規追加
├── Models/
│   └── TodoItem.cs
├── ViewModels/
│   └── MainViewModel.cs
└── Views/
    └── MainWindow.xaml
```

---

## TodoItem を更新する

Part 4で期限・カテゴリ・優先度を追加するため、先にフィールドを追加しておきます。

```csharp
namespace WpfTodo.Models;

public class TodoItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Part 4で使用するフィールド（先に定義しておく）
    public DateTime? DueDate { get; set; }
    public string Category { get; set; } = string.Empty;
    public int Priority { get; set; } = 1; // 1=低 2=中 3=高
}
```

---

## DbContext を作る

`Data/TodoDbContext.cs` を作成します。

```csharp
using Microsoft.EntityFrameworkCore;
using WpfTodo.Models;

namespace WpfTodo.Data;

public class TodoDbContext : DbContext
{
    public DbSet<TodoItem> Todos { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // アプリと同じフォルダに todo.db を作成する
        var dbPath = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory,
            "todo.db"
        );
        optionsBuilder.UseSqlite($"Data Source={dbPath}");
    }
}
```

`DbSet<TodoItem>` を定義することで、EF Coreが `TodoItems` テーブルを管理対象として認識します。

---

## マイグレーションでデータベースを作成する

EF Coreの **マイグレーション** は、Modelクラスの定義からデータベーススキーマを自動生成・更新する仕組みです。

パッケージマネージャーコンソールで実行します。

```
Add-Migration InitialCreate
```

`Migrations/` フォルダが生成され、テーブル作成のコードが入ったファイルができます。中身は自動生成なので読むだけでOKです。

次に実際のデータベースファイルを作成します。

```
Update-Database
```

これでプロジェクトのビルド出力フォルダに `todo.db` が作られます。

### アプリ起動時に自動マイグレーションする

`Update-Database` を手動で実行する代わりに、アプリ起動時に自動で適用することもできます。Part 3ではこちらを採用します。ViewModelのコンストラクタで実行する方法を後述します。

---

## MainViewModel を更新する

非同期でデータベースにアクセスするよう `MainViewModel.cs` を書き換えます。

```csharp
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.EntityFrameworkCore;
using WpfTodo.Data;
using WpfTodo.Models;

namespace WpfTodo.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly TodoDbContext _context;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(AddTodoCommand))]
    private string _newTodoTitle = string.Empty;

    [ObservableProperty]
    private bool _isLoading;

    public ObservableCollection<TodoItem> Todos { get; } = new();

    public MainViewModel()
    {
        _context = new TodoDbContext();

        // 未適用のマイグレーションを自動で適用する
        _context.Database.Migrate();
    }

    // アプリ起動時にViewから呼び出す
    public async Task LoadAsync()
    {
        IsLoading = true;
        var todos = await _context.Todos
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();
        Todos.Clear();
        foreach (var todo in todos)
            Todos.Add(todo);
        IsLoading = false;
    }

    private bool CanAddTodo() => !string.IsNullOrWhiteSpace(NewTodoTitle);

    [RelayCommand(CanExecute = nameof(CanAddTodo))]
    private async Task AddTodo()
    {
        var item = new TodoItem { Title = NewTodoTitle };
        _context.Todos.Add(item);
        await _context.SaveChangesAsync();

        Todos.Add(item);
        NewTodoTitle = string.Empty;
    }

    [RelayCommand]
    private async Task DeleteTodo(TodoItem item)
    {
        _context.Todos.Remove(item);
        await _context.SaveChangesAsync();
        Todos.Remove(item);
    }

    [RelayCommand]
    private async Task ToggleComplete(TodoItem item)
    {
        // IsCompletedはXAMLのCheckBoxから直接変更されるためentityはすでに更新済み
        await _context.SaveChangesAsync();
    }
}
```

**ポイント：**

- `[RelayCommand]` は非同期メソッド（`async Task`）にも対応しており、実行中は自動で `CanExecute = false` になります（二重実行防止）
- `_context.Database.Migrate()` はコンストラクタで同期的に呼んでいます。起動時の一度だけ実行されるため問題ありません
- `ToggleComplete` は `CheckBox` の `IsChecked` バインディングが `TodoItem.IsCompleted` を直接更新するため、`SaveChangesAsync()` を呼ぶだけで保存できます

---

## View を更新する

`MainWindow.xaml` に起動時ロードと `ToggleComplete` コマンドの配線を追加します。

```xml
<Window
    x:Class="WpfTodo.Views.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:vm="clr-namespace:WpfTodo.ViewModels"
    Title="WPF Todo" Height="500" Width="400">

    <Window.DataContext>
        <vm:MainViewModel />
    </Window.DataContext>

    <Grid Margin="16">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto" />
            <RowDefinition Height="*" />
        </Grid.RowDefinitions>

        <!-- 入力エリア -->
        <Grid Grid.Row="0" Margin="0,0,0,12">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*" />
                <ColumnDefinition Width="Auto" />
            </Grid.ColumnDefinitions>

            <TextBox
                Grid.Column="0"
                Text="{Binding NewTodoTitle, UpdateSourceTrigger=PropertyChanged}"
                Margin="0,0,8,0"
                Padding="4" />

            <Button
                Grid.Column="1"
                Content="追加"
                Command="{Binding AddTodoCommand}"
                Padding="12,4" />
        </Grid>

        <!-- ローディング表示 -->
        <TextBlock
            Grid.Row="1"
            Text="読み込み中..."
            HorizontalAlignment="Center"
            VerticalAlignment="Top"
            Margin="0,16,0,0"
            Visibility="{Binding IsLoading,
                         Converter={StaticResource BoolToVisibilityConverter}}" />

        <!-- Todoリスト -->
        <ListView Grid.Row="1" ItemsSource="{Binding Todos}">
            <ListView.ItemTemplate>
                <DataTemplate>
                    <Grid>
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="Auto" />
                            <ColumnDefinition Width="*" />
                            <ColumnDefinition Width="Auto" />
                        </Grid.ColumnDefinitions>

                        <CheckBox
                            Grid.Column="0"
                            IsChecked="{Binding IsCompleted}"
                            Command="{Binding DataContext.ToggleCompleteCommand,
                                      RelativeSource={RelativeSource AncestorType=ListView}}"
                            CommandParameter="{Binding}"
                            VerticalAlignment="Center"
                            Margin="0,0,8,0" />

                        <TextBlock
                            Grid.Column="1"
                            Text="{Binding Title}"
                            VerticalAlignment="Center" />

                        <Button
                            Grid.Column="2"
                            Content="削除"
                            Command="{Binding DataContext.DeleteTodoCommand,
                                      RelativeSource={RelativeSource AncestorType=ListView}}"
                            CommandParameter="{Binding}"
                            Padding="8,2" />
                    </Grid>
                </DataTemplate>
            </ListView.ItemTemplate>
        </ListView>
    </Grid>
</Window>
```

`BoolToVisibilityConverter` は `App.xaml` のリソースに追加します。

```xml
<!-- App.xaml -->
<Application.Resources>
    <BooleanToVisibilityConverter x:Key="BoolToVisibilityConverter" />
</Application.Resources>
```

---

## コードビハインドから LoadAsync を呼ぶ

`MainWindow.xaml.cs` でウィンドウ表示後に非同期ロードを実行します。

```csharp
using WpfTodo.ViewModels;

namespace WpfTodo.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Loaded += async (_, _) =>
        {
            if (DataContext is MainViewModel vm)
                await vm.LoadAsync();
        };
    }
}
```

`Loaded` イベントで呼ぶことで、ウィンドウが表示されてからデータを取得するため、起動時に画面がブロックされません。

---

## 動作確認

アプリを実行してTodoを追加し、一度閉じて再起動します。追加したTodoが表示されれば永続化の成功です。

ビルド出力フォルダ（`bin/Debug/net10.0-windows/`）に `todo.db` が生成されているはずです。DB Browser for SQLite などのツールで中身を確認できます。

---

## まとめ

この記事では以下を実装しました。

- EF Core + SQLiteの導入とDbContextの設計
- マイグレーションによるスキーマ管理
- 起動時の自動マイグレーション
- 非同期CRUD（追加・削除・完了トグル）
- `Loaded` イベントを使ったデータの非同期ロード

次回はTodoModelを拡張して、期限・カテゴリ・優先度の入力と `ICollectionView` を使ったフィルター・並び替えを実装します。

**次回：** [WPF TodoアプリでMVVMを学ぶ Part4 — 期限・カテゴリ・フィルター・並び替え](/dotnet/wpf-todo/wpf-todo-part4/)
