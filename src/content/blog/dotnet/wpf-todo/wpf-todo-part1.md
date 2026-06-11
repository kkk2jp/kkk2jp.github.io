---
title: 'WPF TodoアプリでMVVMを学ぶ Part1：最初の画面を作る'
description: 'C#初心者がWPFとMVVMパターンを学ぶ連載の第1回。プロジェクト作成からXAMLレイアウト、ViewModelとデータバインディングの基本まで、Todoアプリの土台を構築します。'
pubDate: '2026-06-11'
heroImage: '../../../../assets/blog-placeholder-3.jpg'
category: 'dotnet'
---

## この連載について

この連載では、WPFでTodoアプリを作りながら **MVVMパターン** を実践的に学びます。

全5回の構成です：

- **Part 1（本記事）** — WPFとMVVMの基礎、最初の画面を作る
- Part 2 — ObservableCollectionとコマンド
- Part 3 — Entity Framework Core + SQLiteでデータ永続化
- Part 4 — 期限・カテゴリ・フィルター・並び替え
- Part 5 — スタイリング・バリデーション・SQL Server移行

**前提知識：** C#の基本文法（クラス、プロパティ、ラムダ式）を理解していること。WPFやXAMLの経験は不要です。

**使用環境：**
- Visual Studio 2026（Community版でOK）
- .NET 10 以上
- CommunityToolkit.Mvvm（NuGetで導入）

---

## WPFとMVVMとは

**WPF（Windows Presentation Foundation）** はWindowsデスクトップアプリを作るためのUIフレームワークです。画面レイアウトをXMLベースの **XAML** で記述し、C#コードと組み合わせて動作を実装します。

**MVVM（Model-View-ViewModel）** はWPFと相性の良いアーキテクチャパターンです。

| 層 | 役割 | 例 |
|----|------|----|
| **Model** | データとビジネスロジック | `TodoItem`クラス |
| **View** | 画面表示（XAML） | `MainWindow.xaml` |
| **ViewModel** | ViewとModelをつなぐ | `MainViewModel.cs` |

ViewとViewModelは **データバインディング** で接続します。ViewModelがプロパティを更新するとViewが自動で再描画される、というのがMVVMの核心です。

---

## プロジェクトの作成

Visual Studioを起動し、「新しいプロジェクトの作成」から **WPF アプリケーション** を選択します。

- プロジェクト名：`WpfTodo`
- フレームワーク：.NET 10.0

作成後、NuGetパッケージマネージャーで **CommunityToolkit.Mvvm** をインストールします。

---

## プロジェクト構成を整える

デフォルトのプロジェクトにフォルダを追加します。

```
WpfTodo/
├── Models/
│   └── TodoItem.cs
├── ViewModels/
│   └── MainViewModel.cs
└── Views/
    └── MainWindow.xaml  ← デフォルトのものを移動
```

`MainWindow.xaml` をVisual Studio上で `Views` フォルダに移動し、以下の2か所を更新します。

**① App.xaml の StartupUri**

```xml
<!-- App.xaml -->
<Application
    x:Class="WpfTodo.App"
    StartupUri="Views/MainWindow.xaml">
```

**② MainWindow.xaml.cs の名前空間**

ファイルを `Views` フォルダに移動すると、コードビハインドの名前空間がプロジェクトルートのままになっています。`WpfTodo.Views` に変更してください。

```csharp
// 移動前
namespace WpfTodo;

// 移動後
namespace WpfTodo.Views;
```

**③ MainWindow.xaml の x:Class 属性**

XAMLファイル側の `x:Class` も同様に更新が必要です。

```xml
<!-- 移動前 -->
x:Class="WpfTodo.MainWindow"

<!-- 移動後 -->
x:Class="WpfTodo.Views.MainWindow"
```

---

## Modelを作る

`Models/TodoItem.cs` を作成します。

```csharp
namespace WpfTodo.Models;

public class TodoItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
```

Part 3でデータベースに保存するため `Id` を持たせていますが、今回はメモリ上で扱うだけです。

---

## ViewModelを作る

`ViewModels/MainViewModel.cs` を作成します。CommunityToolkit.Mvvmを使うと、定型コードが大幅に減ります。

```csharp
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WpfTodo.Models;

namespace WpfTodo.ViewModels;

// ObservableObjectを継承することでINotifyPropertyChangedが使えるようになる
public partial class MainViewModel : ObservableObject
{
    // [ObservableProperty]をつけるとプロパティとChange通知コードが自動生成される
    [ObservableProperty]
    private string _newTodoTitle = string.Empty;

    public ObservableCollection<TodoItem> Todos { get; } = new();

    [RelayCommand]
    private void AddTodo()
    {
        if (string.IsNullOrWhiteSpace(NewTodoTitle))
            return;

        Todos.Add(new TodoItem { Title = NewTodoTitle });
        NewTodoTitle = string.Empty;
    }

    [RelayCommand]
    private void DeleteTodo(TodoItem item)
    {
        Todos.Remove(item);
    }
}
```

**ポイント：**
- `[ObservableProperty]` — フィールドにつけるだけで、プロパティとChange通知コードが自動生成される
- `[RelayCommand]` — メソッドにつけるだけで、`ICommand`実装が自動生成される
- `ObservableCollection<T>` — 要素の追加・削除をViewに自動通知する特別なコレクション

---

## Viewを作る（XAML）

`Views/MainWindow.xaml` を編集します。

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

**XAMLのポイント：**
- `{Binding NewTodoTitle}` — ViewModelのプロパティと双方向で同期する
- `Command="{Binding AddTodoCommand}"` — `[RelayCommand]`が生成した`AddTodoCommand`プロパティに接続する
- 削除ボタンの`DataContext.DeleteTodoCommand`は少し複雑です。`DataTemplate`の中では`DataContext`がリストの各アイテム（`TodoItem`）になるため、`RelativeSource`で`ListView`の`DataContext`（= ViewModel）まで遡っています

---

## コードビハインドを確認する

`MainWindow.xaml.cs` はほぼ空のままです。

```csharp
namespace WpfTodo.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
```

ViewModelはXAML側の `<Window.DataContext>` で直接インスタンス化しているため、コードビハインドに何も書かなくて済みます。これがMVVMの特徴です。

---

## 動かしてみる

`F5` でデバッグ実行します。テキストボックスにタイトルを入力して「追加」ボタンをクリックすると、リストにTodoが追加されます。チェックボックスで完了状態の切り替え、削除ボタンでアイテムの削除ができるはずです。

---

## まとめ

この記事では以下を実装しました。

- WPFプロジェクトの作成とフォルダ構成
- `TodoItem` Modelの定義
- CommunityToolkit.Mvvmを使ったViewModelの実装
- XAMLによるデータバインディングとコマンドの接続

現時点ではアプリを閉じるとデータが消えます。次回は `ObservableCollection` と `ICommand` の仕組みをもう少し掘り下げてから、Part 3でデータ永続化に進みます。

**次回：** [WPF TodoアプリでMVVMを学ぶ Part2 — ObservableCollectionとコマンドの仕組みを理解する](/dotnet/wpf-todo/wpf-todo-part2/)
