---
title: 'Flutterで作る初めてのモバイルアプリ'
description: 'Flutter入門として、カウンターアプリを題材にWidgetの基本概念・状態管理・レイアウト構築の方法を丁寧に解説します。'
pubDate: '2026-04-20'
heroImage: '../../../assets/blog-placeholder-5.jpg'
category: 'flutter'
---

これはダミー記事です。後で本番コンテンツに差し替えてください。

## Flutter とは

Google が開発したクロスプラットフォームフレームワークです。1つのコードベースからiOS・Android・Web・Desktopに対応したアプリを作れます。

## 環境構築

```bash
# Flutter SDKのインストール後
flutter doctor
flutter create my_app
cd my_app
flutter run
```

## 基本的なWidget

```dart
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Hello Flutter')),
        body: Center(
          child: Text(
            'Hello, World!',
            style: TextStyle(fontSize: 24),
          ),
        ),
      ),
    );
  }
}
```

## StatefulWidget で状態管理

```dart
class Counter extends StatefulWidget {
  @override
  _CounterState createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$_count'),
        ElevatedButton(
          onPressed: () => setState(() => _count++),
          child: Text('Increment'),
        ),
      ],
    );
  }
}
```

## まとめ

FlutterはWidgetツリーの考え方を理解するとすぐに書けるようになります。次回はRiverpodを使った状態管理を紹介します。
