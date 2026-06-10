---
title: 'Riverpodで始めるFlutter状態管理'
description: 'Flutter の状態管理ライブラリ Riverpod の基本的な使い方を、シンプルなTodoアプリを例に解説します。Provider との違いも紹介します。'
pubDate: '2026-04-10'
heroImage: '../../../assets/blog-placeholder-1.jpg'
category: 'flutter'
---

これはダミー記事です。後で本番コンテンツに差し替えてください。

## Riverpod とは

Flutter の状態管理ライブラリです。Provider の後継として設計されており、コンパイル時の安全性とテストのしやすさが特徴です。

## インストール

```yaml
# pubspec.yaml
dependencies:
  flutter_riverpod: ^2.5.0
```

## 基本的な使い方

```dart
// Providerの定義
final counterProvider = StateProvider<int>((ref) => 0);

// WidgetでProviderを使う
class CounterPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Scaffold(
      body: Center(child: Text('$count')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => ref.read(counterProvider.notifier).state++,
        child: Icon(Icons.add),
      ),
    );
  }
}
```

## AsyncNotifier で非同期処理

```dart
final userProvider = AsyncNotifierProvider<UserNotifier, User>(() {
  return UserNotifier();
});

class UserNotifier extends AsyncNotifier<User> {
  @override
  Future<User> build() => fetchUser();
}
```

## まとめ

Riverpod は学習コストが少し高いですが、大規模アプリでの保守性が高いです。新規プロジェクトにはRiverpodを選ぶのがおすすめです。
