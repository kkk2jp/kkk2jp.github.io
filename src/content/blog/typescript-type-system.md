---
title: 'TypeScriptの型システムを深く理解する'
description: 'TypeScriptの高度な型機能——条件型、マップ型、テンプレートリテラル型——を実例とともに解説します。型安全なコードを書くための実践的な知識を身につけましょう。'
pubDate: '2026-05-20'
heroImage: '../../assets/blog-placeholder-2.jpg'
category: 'テクノロジー'
---

TypeScriptの型システムは、単純な型チェックを超えた強力な表現力を持っています。この記事では、中〜上級者向けに型の高度な機能を解説します。

## 条件型 (Conditional Types)

条件型は `T extends U ? X : Y` という構文で、型の分岐を表現します。

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
```

### `infer`キーワード

`infer`を使うと、条件の中で型を推論して取り出せます。

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function greet(name: string): string {
    return `Hello, ${name}!`;
}

type GreetReturn = ReturnType<typeof greet>;  // string
```

## マップ型 (Mapped Types)

オブジェクト型のプロパティを変換するための構文です。

```typescript
type Readonly<T> = {
    readonly [K in keyof T]: T[K];
};

type Partial<T> = {
    [K in keyof T]?: T[K];
};

// 実用例：すべてのプロパティを nullable にする
type Nullable<T> = {
    [K in keyof T]: T[K] | null;
};
```

### キーの再マッピング

TypeScript 4.1以降では、`as`を使ってキーを変換できます。

```typescript
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
    name: string;
    age: number;
}

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number; }
```

## テンプレートリテラル型

文字列型を組み合わせて新しい型を作れます。

```typescript
type EventName = 'click' | 'focus' | 'blur';
type Handler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"

type CSSProperty = 'margin' | 'padding';
type Direction = 'top' | 'right' | 'bottom' | 'left';
type CSSShorthand = `${CSSProperty}-${Direction}`;
// "margin-top" | "margin-right" | ... | "padding-left"
```

## ユーティリティ型の組み合わせ

これらの機能を組み合わせることで、実用的な型ユーティリティが作れます。

```typescript
// ネストされたオブジェクトのすべてのキーを取得
type DeepKeyOf<T> = T extends object
    ? {
          [K in keyof T]: K extends string
              ? K | `${K}.${DeepKeyOf<T[K]>}`
              : never;
      }[keyof T]
    : never;

interface Config {
    server: {
        host: string;
        port: number;
    };
    database: {
        url: string;
    };
}

type ConfigKey = DeepKeyOf<Config>;
// "server" | "database" | "server.host" | "server.port" | "database.url"
```

## まとめ

TypeScriptの型システムはチューリング完全であり、非常に複雑な型表現が可能です。ただし、過度に複雑な型は可読性を損なうため、チームの理解度に応じたバランスを保つことが重要です。基本的なユーティリティ型から段階的に学んでいくのがおすすめです。
