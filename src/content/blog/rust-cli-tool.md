---
title: 'Rustで作るCLIツール入門'
description: 'Rustを使ってコマンドラインツールをゼロから作る方法を解説します。clap crateを活用した引数パースから、エラーハンドリングまで丁寧に説明します。'
pubDate: '2026-05-10'
heroImage: '../../assets/blog-placeholder-1.jpg'
category: 'テクノロジー'
---

Rustはシステムプログラミング言語として注目されていますが、CLIツール開発にも非常に向いています。この記事では、Rustを使って実用的なコマンドラインツールを作る方法を解説します。

## なぜRustでCLIを作るのか

RustでCLIツールを作るメリットは多くあります。

- **高速な実行速度**: Cに匹敵するパフォーマンスで、起動時間が短い
- **シングルバイナリ**: 依存関係なしに配布できる
- **安全性**: メモリ安全性が保証されており、クラッシュが起きにくい

## 最初のプロジェクトを作る

まずはCargoでプロジェクトを作成します。

```bash
cargo new my-cli-tool
cd my-cli-tool
```

`Cargo.toml`に依存関係を追加します。

```toml
[dependencies]
clap = { version = "4.0", features = ["derive"] }
anyhow = "1.0"
```

## 引数の定義

`clap`の`derive`機能を使うと、構造体で引数を宣言的に定義できます。

```rust
use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "my-tool", about = "便利なCLIツール")]
struct Cli {
    /// 処理するファイルのパス
    #[arg(short, long)]
    input: String,

    /// 出力先ファイルのパス
    #[arg(short, long, default_value = "output.txt")]
    output: String,

    /// 詳細ログを表示する
    #[arg(short, long)]
    verbose: bool,
}
```

## メイン処理を書く

引数をパースして処理を実行します。

```rust
use anyhow::Result;

fn main() -> Result<()> {
    let cli = Cli::parse();

    if cli.verbose {
        println!("入力ファイル: {}", cli.input);
        println!("出力先: {}", cli.output);
    }

    let content = std::fs::read_to_string(&cli.input)?;
    let processed = process_content(&content);
    std::fs::write(&cli.output, processed)?;

    println!("処理が完了しました。");
    Ok(())
}

fn process_content(content: &str) -> String {
    content.to_uppercase()
}
```

## エラーハンドリング

`anyhow`クレートを使うことで、エラーハンドリングがシンプルになります。`?`演算子でエラーを伝播させつつ、わかりやすいメッセージを付与できます。

```rust
use anyhow::{Context, Result};

fn read_config(path: &str) -> Result<String> {
    std::fs::read_to_string(path)
        .with_context(|| format!("設定ファイルを読み込めませんでした: {}", path))
}
```

## ビルドと配布

```bash
# リリースビルド
cargo build --release

# バイナリは target/release/my-cli-tool に生成される
./target/release/my-cli-tool --input data.txt --verbose
```

## まとめ

RustとClapを組み合わせることで、型安全で使いやすいCLIツールを効率よく作れます。次回は、サブコマンドの実装やプログレスバーの表示など、より高度な機能を紹介します。
