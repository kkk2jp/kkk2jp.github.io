---
title: 'WPF TodoアプリでMVVMを学ぶ Part5：スタイリング・バリデーション・SQL Server移行'
description: '連載最終回。WPFのStyleリソースでUI外観を整え、INotifyDataErrorInfoで入力バリデーションを実装します。最後にEF CoreのSQL Server切り替えも確認し、連載を締めくくります。'
pubDate: '2026-06-11'
heroImage: '../../../../assets/blog-placeholder-2.jpg'
category: 'dotnet'
---

## この記事について

連載最終回です。[Part 4](/dotnet/wpf-todo/wpf-todo-part4/) まででTodoアプリの機能はほぼ揃いました。Part 5では仕上げとして以下を行います。

- `Style` リソースによるUI外観の整理
- `INotifyDataErrorInfo` を使った入力バリデーション
- EF CoreのプロバイダをSQLiteからSQL Serverに切り替える

---

## Style リソースでUIを整える

WPFでは `Style` を使って、同じ種類のコントロールに一括でプロパティを設定できます。コントロールごとに `Margin` や `FontSize` を個別指定する手間がなくなり、変更も一箇所で済みます。

`App.xaml` の `Application.Resources` にStyleを追加します。

```xml
<Application.Resources>
    <BooleanToVisibilityConverter x:Key="BoolToVisibilityConverter" />
    <conv:PriorityColorConverter x:Key="PriorityColorConverter"
        xmlns:conv="clr-namespace:WpfTodo.Converters" />
    <conv:NullToVisibilityConverter x:Key="NullToVisibilityConverter"
        xmlns:conv="clr-namespace:WpfTodo.Converters" />

    <!-- 色の定義 -->
    <SolidColorBrush x:Key="AccentBrush" Color="#0078D4" />
    <SolidColorBrush x:Key="DangerBrush" Color="#D32F2F" />
    <SolidColorBrush x:Key="MutedBrush"  Color="#757575" />

    <!-- TextBox の共通スタイル -->
    <Style TargetType="TextBox">
        <Setter Property="Padding" Value="6,4" />
        <Setter Property="BorderBrush" Value="#BDBDBD" />
        <Setter Property="BorderThickness" Value="1" />
        <Setter Property="VerticalContentAlignment" Value="Center" />
        <!-- バリデーションエラー時の枠線を赤にする -->
        <Style.Triggers>
            <Trigger Property="Validation.HasError" Value="True">
                <Setter Property="BorderBrush" Value="{StaticResource DangerBrush}" />
                <Setter Property="ToolTip"
                        Value="{Binding RelativeSource={RelativeSource Self},
                                        Path=(Validation.Errors)[0].ErrorContent}" />
            </Trigger>
        </Style.Triggers>
    </Style>

    <!-- Button の共通スタイル -->
    <Style TargetType="Button">
        <Setter Property="Background" Value="{StaticResource AccentBrush}" />
        <Setter Property="Foreground" Value="White" />
        <Setter Property="BorderThickness" Value="0" />
        <Setter Property="Padding" Value="12,6" />
        <Setter Property="Cursor" Value="Hand" />
        <Style.Triggers>
            <Trigger Property="IsEnabled" Value="False">
                <Setter Property="Opacity" Value="0.4" />
            </Trigger>
            <Trigger Property="IsMouseOver" Value="True">
                <Setter Property="Opacity" Value="0.85" />
            </Trigger>
        </Style.Triggers>
    </Style>

    <!-- 削除ボタンだけ色を変えるための名前付きスタイル -->
    <Style x:Key="DangerButton" TargetType="Button" BasedOn="{StaticResource {x:Type Button}}">
        <Setter Property="Background" Value="{StaticResource DangerBrush}" />
    </Style>

    <!-- ComboBox の共通スタイル -->
    <Style TargetType="ComboBox">
        <Setter Property="Padding" Value="6,4" />
        <Setter Property="BorderBrush" Value="#BDBDBD" />
    </Style>

    <!-- ListView アイテム -->
    <Style TargetType="ListViewItem">
        <Setter Property="HorizontalContentAlignment" Value="Stretch" />
        <Setter Property="Padding" Value="8,6" />
        <Style.Triggers>
            <Trigger Property="IsMouseOver" Value="True">
                <Setter Property="Background" Value="#F5F5F5" />
            </Trigger>
        </Style.Triggers>
    </Style>
</Application.Resources>
```

`TargetType` を指定したStyleは、キーなしで書くことでそのウィンドウ内の全同型コントロールに自動適用されます（**暗黙的スタイル**）。`x:Key` を付けた `DangerButton` は `Style="{StaticResource DangerButton}"` と明示的に指定したコントロールだけに適用されます。

XAMLの削除ボタンに `DangerButton` を適用します。

```xml
<Button
    Grid.Column="4"
    Content="削除"
    Style="{StaticResource DangerButton}"
    Command="{Binding DataContext.DeleteTodoCommand, ...}"
    CommandParameter="{Binding}" />
```

---

## INotifyDataErrorInfo で入力バリデーションを実装する

WPFの標準バリデーション機構である `INotifyDataErrorInfo` を使います。これを実装すると、バインドされたコントロールにエラー状態が自動反映されます（上のStyleの `Validation.HasError` トリガーで赤枠が出る）。

CommunityToolkit.Mvvmの `ObservableValidator` は `INotifyDataErrorInfo` を実装済みです。`ObservableObject` の代わりに継承するだけで使えます。

```csharp
// ObservableObject → ObservableValidator に変更する
public partial class MainViewModel : ObservableValidator
{
    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(AddTodoCommand))]
    [NotifyDataErrorInfo]                          // バリデーション有効化
    [Required(ErrorMessage = "タイトルを入力してください")]
    [MaxLength(100, ErrorMessage = "100文字以内で入力してください")]
    private string _newTodoTitle = string.Empty;

    [ObservableProperty]
    [NotifyDataErrorInfo]
    [CustomValidation(typeof(MainViewModel), nameof(ValidateDueDate))]
    private DateTime? _newDueDate;

    // カスタムバリデーションメソッド（staticである必要がある）
    public static ValidationResult? ValidateDueDate(DateTime? value, ValidationContext context)
    {
        if (value.HasValue && value.Value.Date < DateTime.Today)
            return new ValidationResult("期限は今日以降の日付を指定してください");
        return ValidationResult.Success;
    }

    private bool CanAddTodo()
    {
        // エラーがなくタイトルが入力済みのときだけ実行可能
        ValidateAllProperties();
        return !HasErrors && !string.IsNullOrWhiteSpace(NewTodoTitle);
    }
    
    // 他のメソッドは変更なし
}
```

**ポイント：**

- `[NotifyDataErrorInfo]` — このプロパティのバリデーション結果をバインディングエンジンに通知する
- `[Required]` / `[MaxLength]` — `System.ComponentModel.DataAnnotations` の標準アトリビュート
- `[CustomValidation]` — 独自ルールが必要なときに使う。staticメソッドを指定する
- `ValidateAllProperties()` — 全プロパティのバリデーションを即時実行する。`CanExecute` 評価時に呼ぶことでリアルタイムにボタン状態が変わる

XAML側は変更不要です。`TextBox` の `Text` バインディングに `ValidatesOnNotifyDataErrors=True` が必要なバージョンもありますが、WPF (.NET 10) では既定で有効です。

---

## SQL Server（LocalDB）に切り替える

EF Coreの接続プロバイダを差し替えるだけでSQL Serverに移行できます。

まずパッケージを追加します。

```
Install-Package Microsoft.EntityFrameworkCore.SqlServer
```

`TodoDbContext.cs` の `OnConfiguring` を書き換えます。

```csharp
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    // SQLite（元の設定）
    // var dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "todo.db");
    // optionsBuilder.UseSqlite($"Data Source={dbPath}");

    // SQL Server LocalDB（Visual Studioに付属）
    optionsBuilder.UseSqlServer(
        @"Server=(localdb)\mssqllocaldb;Database=WpfTodo;Trusted_Connection=True;"
    );
}
```

次にSQL Server用のマイグレーションを作成します。

```
Add-Migration InitialSqlServer
Update-Database
```

> **注意：** SQLiteとSQL Serverではマイグレーションの内部実装が異なるため、既存のマイグレーションファイルを使い回すことはできません。`Migrations/` フォルダを一度削除してから `Add-Migration` を実行することをお勧めします。

### 接続文字列を設定ファイルに外出しする

接続文字列をコードに直書きするのは本番では避けます。`appsettings.json` に外出しする方法が一般的です。

```
Install-Package Microsoft.Extensions.Configuration.Json
```

```json
// appsettings.json（プロジェクトに追加し「出力ディレクトリにコピー」を設定）
{
  "ConnectionStrings": {
    "Default": "Server=(localdb)\\mssqllocaldb;Database=WpfTodo;Trusted_Connection=True;"
  }
}
```

```csharp
using Microsoft.Extensions.Configuration;

protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    var config = new ConfigurationBuilder()
        .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
        .AddJsonFile("appsettings.json")
        .Build();

    optionsBuilder.UseSqlServer(config.GetConnectionString("Default"));
}
```

環境ごとに `appsettings.Development.json` / `appsettings.Production.json` を用意すれば、開発・本番で接続先を切り替えられます。

---

## 連載のまとめ

5回の連載を通じてゼロからWPF Todoアプリを構築しました。

| 回 | 習得したこと |
|----|------------|
| Part 1 | WPFプロジェクト構成、XAML、データバインディング基礎、MVVMの責務分離 |
| Part 2 | `INotifyPropertyChanged`・`ObservableCollection`・`ICommand` の仕組み、`CanExecute` |
| Part 3 | EF Core + SQLite、マイグレーション、非同期CRUD |
| Part 4 | `ICollectionView` によるフィルター・並び替え、`IValueConverter` |
| Part 5 | `Style` リソース、`INotifyDataErrorInfo` バリデーション、SQL Server移行 |

ここから発展させるなら、依存性注入（`Microsoft.Extensions.DependencyInjection`）の導入、単体テスト、あるいはWinUI 3・MAUIへの移行が次のステップです。
