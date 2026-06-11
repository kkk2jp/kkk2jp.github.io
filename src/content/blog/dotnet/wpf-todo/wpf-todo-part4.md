---
title: 'WPF TodoアプリでMVVMを学ぶ Part4：期限・カテゴリ・フィルター・並び替え'
description: 'TodoモデルにDueDate・Category・Priorityを追加し、DatePickerやComboBoxで入力できるようにします。ICollectionViewを使ったフィルター・並び替えの実装も解説します。'
pubDate: '2026-06-11'
heroImage: '../../../../assets/blog-placeholder-1.jpg'
category: 'dotnet'
---

## この記事について

[Part 3](/dotnet/wpf-todo/wpf-todo-part3/) でデータをSQLiteに保存できるようになりました。Part 4では機能を拡張します。

- 入力フォームに期限（DatePicker）・カテゴリ（ComboBox）・優先度（ComboBox）を追加
- EF Coreのマイグレーションでスキーマを更新
- `ICollectionView` を使ったフィルター・並び替え

---

## マイグレーションを追加する

`TodoItem` にはPart 3で `DueDate`・`Category`・`Priority` を先に定義済みです。データベーススキーマはまだ古いので、マイグレーションを追加して反映します。

```
Add-Migration AddTodoFields
Update-Database
```

これだけです。既存データはそのまま残り、新しいカラムが `NULL` / デフォルト値で追加されます。

---

## ViewModel に入力プロパティを追加する

新規Todo作成時の入力値を保持するプロパティを `MainViewModel.cs` に追加します。

```csharp
public partial class MainViewModel : ObservableObject
{
    // 既存のプロパティは省略

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(AddTodoCommand))]
    private string _newTodoTitle = string.Empty;

    [ObservableProperty]
    private DateTime? _newDueDate;

    [ObservableProperty]
    private string _newCategory = string.Empty;

    [ObservableProperty]
    private int _newPriority = 1;

    // カテゴリ選択肢（ComboBoxにバインドする）
    public IReadOnlyList<string> CategoryOptions { get; } =
        new[] { "", "仕事", "プライベート", "買い物", "その他" };

    // 優先度選択肢
    public IReadOnlyList<PriorityItem> PriorityOptions { get; } = new[]
    {
        new PriorityItem(1, "低"),
        new PriorityItem(2, "中"),
        new PriorityItem(3, "高"),
    };

    private bool CanAddTodo() => !string.IsNullOrWhiteSpace(NewTodoTitle);

    [RelayCommand(CanExecute = nameof(CanAddTodo))]
    private async Task AddTodo()
    {
        var item = new TodoItem
        {
            Title = NewTodoTitle,
            DueDate = NewDueDate,
            Category = NewCategory,
            Priority = NewPriority,
        };
        _context.Todos.Add(item);
        await _context.SaveChangesAsync();

        Todos.Add(item);
        _collectionView.Refresh(); // フィルター・並び替えを再適用
        NewTodoTitle = string.Empty;
        NewDueDate = null;
        NewCategory = string.Empty;
        NewPriority = 1;
    }
    
    // 他のメソッドは省略
}

// 優先度の表示名を持つシンプルなレコード
public record PriorityItem(int Value, string Label);
```

---

## ICollectionView でフィルター・並び替えをする

`ICollectionView` はコレクションにフィルター・並び替え・グループ化を非破壊的に適用するWPF標準の仕組みです。元の `ObservableCollection` は変更せず、**ビューとして加工した結果** をListViewに表示できます。

`MainViewModel.cs` にフィルター・並び替えのロジックを追加します。

```csharp
using System.ComponentModel;
using System.Windows.Data;

public partial class MainViewModel : ObservableObject
{
    private readonly ICollectionView _collectionView;

    // フィルター用プロパティ
    [ObservableProperty]
    private string _filterCategory = string.Empty;

    [ObservableProperty]
    private bool _hideCompleted;

    // 並び替え用プロパティ
    [ObservableProperty]
    private string _sortKey = "CreatedAt";

    public IReadOnlyList<string> SortOptions { get; } =
        new[] { "作成日", "期限", "優先度" };

    private static readonly Dictionary<string, string> SortKeyMap = new()
    {
        ["作成日"] = nameof(TodoItem.CreatedAt),
        ["期限"]   = nameof(TodoItem.DueDate),
        ["優先度"] = nameof(TodoItem.Priority),
    };

    public MainViewModel()
    {
        _context = new TodoDbContext();
        _context.Database.Migrate();

        // CollectionViewSourceからビューを取得する
        _collectionView = CollectionViewSource.GetDefaultView(Todos);
        _collectionView.Filter = FilterTodo;

        Todos.CollectionChanged += (_, _) =>
            OnPropertyChanged(nameof(CompletedCount));
    }

    public int CompletedCount => Todos.Count(t => t.IsCompleted);

    // フィルター述語：trueを返したアイテムだけ表示される
    private bool FilterTodo(object obj)
    {
        if (obj is not TodoItem item) return false;

        if (HideCompleted && item.IsCompleted)
            return false;

        if (!string.IsNullOrEmpty(FilterCategory) && item.Category != FilterCategory)
            return false;

        return true;
    }

    // フィルタープロパティが変わったらビューを更新する
    partial void OnFilterCategoryChanged(string value) => _collectionView.Refresh();
    partial void OnHideCompletedChanged(bool value) => _collectionView.Refresh();

    // 並び替えプロパティが変わったら SortDescriptions を更新する
    partial void OnSortKeyChanged(string value)
    {
        _collectionView.SortDescriptions.Clear();

        if (SortKeyMap.TryGetValue(value, out var propertyName))
        {
            // 優先度は高い順（降順）、それ以外は昇順
            var direction = propertyName == nameof(TodoItem.Priority)
                ? ListSortDirection.Descending
                : ListSortDirection.Ascending;

            _collectionView.SortDescriptions.Add(
                new SortDescription(propertyName, direction));
        }
    }
}
```

**ポイント：**

- `CollectionViewSource.GetDefaultView(Todos)` — `ObservableCollection` に紐づくデフォルトビューを取得する。このビューをListViewにバインドする
- `Filter` — `bool` を返す述語。`true` のアイテムだけ表示される
- `SortDescriptions` — 複数のソートキーを重ねられる。クリアして追加し直すことで切り替える
- `partial void OnXxxChanged` — `[ObservableProperty]` が生成するコールバック。プロパティが変わった直後に自動で呼ばれる

---

## XAML を更新する

入力フォームとフィルター・並び替えUIを追加します。

```xml
<Window ...>
    <Window.DataContext>
        <vm:MainViewModel />
    </Window.DataContext>

    <Grid Margin="16">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto" />  <!-- 入力フォーム -->
            <RowDefinition Height="Auto" />  <!-- フィルター・並び替え -->
            <RowDefinition Height="*"    />  <!-- リスト -->
        </Grid.RowDefinitions>

        <!-- 入力フォーム -->
        <Grid Grid.Row="0" Margin="0,0,0,8">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto" />
                <RowDefinition Height="Auto" />
            </Grid.RowDefinitions>
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*" />
                <ColumnDefinition Width="120" />
                <ColumnDefinition Width="80" />
                <ColumnDefinition Width="60" />
                <ColumnDefinition Width="Auto" />
            </Grid.ColumnDefinitions>

            <!-- タイトル -->
            <TextBox
                Grid.Row="0" Grid.Column="0"
                Text="{Binding NewTodoTitle, UpdateSourceTrigger=PropertyChanged}"
                Padding="4" Margin="0,0,4,4" />

            <!-- 期限 -->
            <DatePicker
                Grid.Row="0" Grid.Column="1"
                SelectedDate="{Binding NewDueDate}"
                Margin="0,0,4,4" />

            <!-- カテゴリ -->
            <ComboBox
                Grid.Row="0" Grid.Column="2"
                ItemsSource="{Binding CategoryOptions}"
                SelectedItem="{Binding NewCategory}"
                Margin="0,0,4,4" />

            <!-- 優先度 -->
            <ComboBox
                Grid.Row="0" Grid.Column="3"
                ItemsSource="{Binding PriorityOptions}"
                SelectedItem="{Binding NewPriority,
                               Converter={StaticResource PriorityConverter}}"
                DisplayMemberPath="Label"
                Margin="0,0,4,4" />

            <!-- 追加ボタン -->
            <Button
                Grid.Row="0" Grid.Column="4"
                Content="追加"
                Command="{Binding AddTodoCommand}"
                Padding="12,4" />
        </Grid>

        <!-- フィルター・並び替えバー -->
        <Grid Grid.Row="1" Margin="0,0,0,8">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="Auto" />
                <ColumnDefinition Width="100" />
                <ColumnDefinition Width="Auto" />
                <ColumnDefinition Width="80" />
                <ColumnDefinition Width="Auto" />
                <ColumnDefinition Width="*" />
            </Grid.ColumnDefinitions>

            <TextBlock Grid.Column="0" Text="カテゴリ：" VerticalAlignment="Center" Margin="0,0,4,0" />
            <ComboBox
                Grid.Column="1"
                ItemsSource="{Binding CategoryOptions}"
                SelectedItem="{Binding FilterCategory}"
                Margin="0,0,12,0" />

            <CheckBox
                Grid.Column="2"
                Content="完了済みを隠す"
                IsChecked="{Binding HideCompleted}"
                VerticalAlignment="Center"
                Margin="0,0,12,0" />

            <TextBlock Grid.Column="3" Text="並び替え：" VerticalAlignment="Center" Margin="0,0,4,0" />
            <ComboBox
                Grid.Column="4"
                ItemsSource="{Binding SortOptions}"
                SelectedItem="{Binding SortKey}"
                Width="80" />

            <!-- 完了件数 -->
            <TextBlock
                Grid.Column="5"
                Text="{Binding CompletedCount, StringFormat=完了: {0}件}"
                HorizontalAlignment="Right"
                VerticalAlignment="Center" />
        </Grid>

        <!-- Todoリスト -->
        <ListView Grid.Row="2" ItemsSource="{Binding Todos}">
            <ListView.ItemTemplate>
                <DataTemplate>
                    <Grid>
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="Auto" />
                            <ColumnDefinition Width="*" />
                            <ColumnDefinition Width="60" />
                            <ColumnDefinition Width="30" />
                            <ColumnDefinition Width="Auto" />
                        </Grid.ColumnDefinitions>

                        <CheckBox
                            Grid.Column="0"
                            IsChecked="{Binding IsCompleted}"
                            Command="{Binding DataContext.ToggleCompleteCommand,
                                      RelativeSource={RelativeSource AncestorType=ListView}}"
                            CommandParameter="{Binding}"
                            VerticalAlignment="Center" Margin="0,0,8,0" />

                        <StackPanel Grid.Column="1" VerticalAlignment="Center">
                            <TextBlock Text="{Binding Title}" />
                            <TextBlock
                                Text="{Binding DueDate, StringFormat=期限: {0:MM/dd}}"
                                FontSize="11"
                                Foreground="Gray"
                                Visibility="{Binding DueDate,
                                             Converter={StaticResource NullToVisibilityConverter}}" />
                        </StackPanel>

                        <TextBlock
                            Grid.Column="2"
                            Text="{Binding Category}"
                            VerticalAlignment="Center"
                            FontSize="11"
                            Foreground="DimGray" />

                        <!-- 優先度インジケーター（● の色で表現） -->
                        <TextBlock
                            Grid.Column="3"
                            Text="●"
                            VerticalAlignment="Center"
                            Foreground="{Binding Priority,
                                         Converter={StaticResource PriorityColorConverter}}" />

                        <Button
                            Grid.Column="4"
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

---

## Converter を実装する

優先度の色表示と、`null` のとき `Collapsed` にするConverterを追加します。`Converters/` フォルダを作り、それぞれ実装します。

```csharp
// Converters/PriorityColorConverter.cs
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace WpfTodo.Converters;

public class PriorityColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return (int)value switch
        {
            3 => Brushes.Red,
            2 => Brushes.Orange,
            _ => Brushes.LightGray,
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotImplementedException();
}
```

```csharp
// Converters/NullToVisibilityConverter.cs
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace WpfTodo.Converters;

public class NullToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => value is null ? Visibility.Collapsed : Visibility.Visible;

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotImplementedException();
}
```

`App.xaml` のリソースに追加します。

```xml
<Application.Resources>
    <BooleanToVisibilityConverter x:Key="BoolToVisibilityConverter" />
    <conv:PriorityColorConverter x:Key="PriorityColorConverter"
        xmlns:conv="clr-namespace:WpfTodo.Converters" />
    <conv:NullToVisibilityConverter x:Key="NullToVisibilityConverter"
        xmlns:conv="clr-namespace:WpfTodo.Converters" />
</Application.Resources>
```

---

## 動作確認

- カテゴリ・期限・優先度を入力してTodoを追加できる
- カテゴリフィルターでリストが絞り込まれる
- 「完了済みを隠す」チェックで完了アイテムが消える
- 並び替えで表示順が変わる
- 優先度に応じて●の色が変わる（赤・オレンジ・グレー）

---

## まとめ

この記事では以下を実装しました。

- `DueDate`・`Category`・`Priority` の入力フォーム（DatePicker・ComboBox）
- EF Coreの追加マイグレーションによるスキーマ更新
- `ICollectionView` を使った非破壊フィルター・並び替え
- `partial void OnXxxChanged` を使ったリアクティブなビュー更新
- `IValueConverter` による優先度色表示と `null` 制御

次回（最終回）ではStyleリソースによるUI整理、入力バリデーション、そしてSQLite接続をSQL Serverに切り替える方法を解説します。

**次回：** [WPF TodoアプリでMVVMを学ぶ Part5 — スタイリング・バリデーション・SQL Server移行](/dotnet/wpf-todo/wpf-todo-part5/)
