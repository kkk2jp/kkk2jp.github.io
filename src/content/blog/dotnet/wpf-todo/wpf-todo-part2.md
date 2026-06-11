---
title: 'WPF TodoアプリでMVVMを学ぶ Part2：ObservableCollectionとコマンドの仕組み'
description: 'MVVMの核心であるINotifyPropertyChanged、ObservableCollection、ICommandの仕組みを深掘り。CanExecuteによるボタン制御も実装し、WPFのデータバインディングへの理解を固めます。'
pubDate: '2026-06-11'
heroImage: '../../../../assets/blog-placeholder-4.jpg'
category: 'dotnet'
---

## この記事について

[Part 1](/dotnet/wpf-todo/wpf-todo-part1/) でTodoアプリの土台を作りました。動くものはできましたが、「なぜ動くのか」がまだ曖昧な部分があります。

Part 2では以下の仕組みを掘り下げます。

- `INotifyPropertyChanged` と `[ObservableProperty]` の関係
- `ObservableCollection<T>` がなぜ必要なのか
- `ICommand` と `[RelayCommand]` の関係
- `CanExecute` を使ったボタンの活性・非活性制御

最後に `CanExecute` を実装してタイトルが空のとき「追加」ボタンを非活性にします。

---

## INotifyPropertyChanged とは

WPFのデータバインディングは、ViewModelのプロパティが変わったことをViewに通知する仕組みに依存しています。その通知を行うインターフェースが `INotifyPropertyChanged` です。

```csharp
public interface INotifyPropertyChanged
{
    event PropertyChangedEventHandler? PropertyChanged;
}
```

これを手書きで実装すると以下のようになります。

```csharp
public class MainViewModel : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    private string _newTodoTitle = string.Empty;
    public string NewTodoTitle
    {
        get => _newTodoTitle;
        set
        {
            if (_newTodoTitle == value) return;
            _newTodoTitle = value;
            // プロパティが変わったことをViewに通知する
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(NewTodoTitle)));
        }
    }
}
```

プロパティが増えるたびにこのパターンを繰り返すのは非常に面倒です。

### [ObservableProperty] が解決すること

CommunityToolkit.Mvvmの `[ObservableProperty]` は、このボイラープレートをソース生成で自動化します。

```csharp
// 書くのはこれだけ
[ObservableProperty]
private string _newTodoTitle = string.Empty;

// コンパイル時に上記の手書き版と等価なコードが自動生成される
```

`partial class` にしておく必要があるのは、生成されたコードが別ファイルに書き出され、それを `partial` でマージするためです。

---

## ObservableCollection とは

`List<T>` をViewModelで使った場合、要素を追加・削除しても **Viewは再描画されません**。`List<T>` には変更通知の仕組みがないからです。

```csharp
// これではリストがViewに反映されない
public List<TodoItem> Todos { get; } = new();
```

`ObservableCollection<T>` は `INotifyCollectionChanged` を実装しており、要素の追加・削除・移動を自動でViewに通知します。

```csharp
public interface INotifyCollectionChanged
{
    event NotifyCollectionChangedEventHandler? CollectionChanged;
}
```

```csharp
// これならViewが自動更新される
public ObservableCollection<TodoItem> Todos { get; } = new();
```

### まとめると

| 種類 | 変更の種類 | 通知の仕組み |
|------|-----------|------------|
| `INotifyPropertyChanged` | プロパティの値が変わった | `PropertyChanged` イベント |
| `INotifyCollectionChanged` | コレクションの要素が変わった | `CollectionChanged` イベント |

WPFのバインディングエンジンはこの2つのインターフェースを監視しています。

---

## ICommand とは

XAMLのボタンはC#のメソッドを直接呼べません。代わりに `ICommand` インターフェースを介して接続します。

```csharp
public interface ICommand
{
    // コマンドが実行可能かどうかを返す
    bool CanExecute(object? parameter);

    // コマンドを実行する
    void Execute(object? parameter);

    // CanExecuteの結果が変わったことをViewに通知するイベント
    event EventHandler? CanExecuteChanged;
}
```

これを毎回手書きするのも面倒なので、CommunityToolkit.Mvvmの `[RelayCommand]` が自動生成してくれます。

```csharp
// 書くのはこれだけ
[RelayCommand]
private void AddTodo() { ... }

// コンパイル時に AddTodoCommand プロパティが自動生成される
// XAMLでは Command="{Binding AddTodoCommand}" で接続できる
```

---

## CanExecute を実装する

`CanExecute` を使うと、ボタンを自動的に非活性にできます。`[RelayCommand]` では `CanExecute` 用のメソッドを `CanXxx` の命名規則で書くことで関連付けられます。

`MainViewModel.cs` を以下のように更新します。

```csharp
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WpfTodo.Models;

namespace WpfTodo.ViewModels;

public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(AddTodoCommand))] // ← 追加
    private string _newTodoTitle = string.Empty;

    public ObservableCollection<TodoItem> Todos { get; } = new();

    // CanExecuteメソッド：trueのとき実行可能
    private bool CanAddTodo() => !string.IsNullOrWhiteSpace(NewTodoTitle);

    [RelayCommand(CanExecute = nameof(CanAddTodo))] // ← CanExecuteを指定
    private void AddTodo()
    {
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

**変更点のポイント：**

- `[NotifyCanExecuteChangedFor(nameof(AddTodoCommand))]` — `NewTodoTitle` が変わるたびに `AddTodoCommand.CanExecute` の再評価をViewに通知する
- `CanAddTodo()` — タイトルが空でないときだけ `true` を返す
- `[RelayCommand(CanExecute = nameof(CanAddTodo))]` — このメソッドを `CanExecute` として使うよう指定する

XAML側は変更不要です。WPFが `CanExecuteChanged` イベントを受け取り、`CanExecute` が `false` のときボタンを自動的にグレーアウトします。

---

## 動作確認

アプリを実行すると、起動直後は「追加」ボタンがグレーアウトしています。テキストボックスに文字を入力するとボタンが活性化し、文字を全部消すとまたグレーアウトに戻るはずです。

---

## プロパティ変更の連鎖通知

もうひとつ便利な機能として、あるプロパティが変わったときに別のプロパティの変更通知も同時に発火させられます。

たとえば完了済みTodoの件数を表示したい場合：

```csharp
public int CompletedCount => Todos.Count(t => t.IsCompleted);
```

ただし `Todos` の要素が変わっても `CompletedCount` の `PropertyChanged` は自動では発火しません。この場合は `ObservableCollection` の `CollectionChanged` イベントを購読して手動で通知します。

```csharp
public MainViewModel()
{
    Todos.CollectionChanged += (_, _) => OnPropertyChanged(nameof(CompletedCount));
}
```

このパターンはPart 4のフィルター実装でも使います。

---

## まとめ

この記事では以下を整理しました。

- `INotifyPropertyChanged` — プロパティ変更をViewに伝える仕組み
- `[ObservableProperty]` — そのボイラープレートを自動生成するアトリビュート
- `ObservableCollection<T>` — コレクション変更をViewに伝える特別なリスト
- `ICommand` — ボタンとメソッドを接続するインターフェース
- `[RelayCommand]` + `CanExecute` — コマンドの実行可否を制御する仕組み

次回はEF CoreとSQLiteを導入してデータをファイルに保存します。アプリを閉じてもTodoが消えないようになります。

**次回：** [WPF TodoアプリでMVVMを学ぶ Part3 — Entity Framework Core + SQLiteでデータ永続化](/dotnet/wpf-todo/wpf-todo-part3/)
