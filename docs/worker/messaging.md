# Worker間通信の階層モデル
Worker間通信の方法として、チャンネルメッセージングAPIが提供されている。
チャンネルメッセージングAPIは複製可能なオブジェクトを送信し、相手側ではイベントとして受信する。
原始的なAPIであり、複雑なやり取りが必要となるため、Worker間の通信を階層モデルにより抽象化する。
第2層以降のそれぞれの階層で定義されるポートは下の階層で定義されるポートのラッパーである。
TypeScriptのコードブロックにより各階層が提供するAPIの構想を示す。

```typescript
interface Endpoint<Req, Res = Req> {
	/**
	 * 相手が保持しているハンドラを呼び出す
	 */
	request(req: Req): Promise<Res>;

	close(): void;
}

type EndpointHandler<Req, Res = Req> = (req: Req) => Awaitable<Res>;

type Awaitable<T> = T | PromiseLike<T>;
```

## 第1層: Channel Messaging API
`MessagePort`により、複製可能オブジェクトの送受信を行う。
このAPIはWeb標準により提供される。

## 第2層: `RpcEndpoint`
リクエストとレスポンスを対応づける。
複製可能オブジェクトを受け取り、別の複製可能オブジェクトを返す関数の遠隔呼び出しを実現する。

ハンドラはエラーが発生する可能性がある場合は
`{ ok: true; value: Cloneable } | { ok: false; error: Cloneable }`
のような形でレスポンスを返すようにする必要がある。

```typescript
type RpcEndpoint = Endpoint<Cloneable>;

declare var RpcEndpoint: {
	new(port: MessagePort, handler: EndpointHandler<Cloneable>): RpcEndpoint;
};

type Cloneable = { readonly [key: string]: Cloneable } | readonly Cloneable[] | CloneablePrimitive;

type CloneablePrimitive = string | number | bigint | boolean | undefined | null;
```

## 第3層: `SerializableEndpoint`
シリアライズ可能オブジェクトを受け取り、デシリアライズ可能オブジェクトを返す関数の遠隔呼び出しを実現する。

```typescript
ype SerializableEndpoint<T> = Endpoint<Serializable<T>>;

declare var SerializableEndpoint: {
	new<T>(underlying: RpcEndpoint, serializer: Serializer<T>, handler: EndpointHandler<Serializable<T>>): SerializableEndpoint<T>;
}

type Serializable<T> = { readonly [key: string]: Serializable<T> } | readonly Serializable<T>[] | CloneablePrimitive | T;

interface Serializer<T> {
	serialize(value: T): Cloneable;
	deserialize(serialized: Cloneable): T;
}
```

## 第4層: `ReferenceEndpoint`
シリアライズ不可能なオブジェクトを参照のように扱う。

`ReferenceEndpoint`の`request`メソッドに渡した値は基本的にシリアライズ、クローンして送信される。
参照として送信したい値は`LocalRef`でラップして`request`メソッドに渡す。

`LocalRef`は自分側で持っている値のラッパー。
`LocalRef`を`request`に渡すと相手側のハンドラでは`RemoteRef`として見える。
`RemoteRef`から直接的に値を取り出すことはできず、
`request`の引数として元の所有者に渡すことで間接的に使用可能。
`RemoteRef`を`request`に渡すと相手側では`LocalRef`として見える。

内部的には、
`ReferenceEndpoint`の`request`メソッドは`LocalRef`が渡されると、
`LocalRef`にIDを割り当て、IDから`LocalRef`を取得できるように`Map`に保管する。
相手の`ReferenceEndpoint`では、`RemoteRef`からIDを取得できるように`WeakMap`で対応付ける。
`RemoteRef`が送り返されると、IDから`LocalRef`を得る。
`RemoteRef`オブジェクトが解放されると、`FinalizationRegistry`により相手の`LocalRef`が`Map`から削除される。

```typescript
type ReferenceEndpoint<T> = Endpoint<Referable<T>>;

declare var ReferenceEndpoint: {
	new<T>(underlying: SerializableEndpoint<T>, handler: EndpointHandler<Referable<T>>): ReferenceEndpoint<T>;
}

type Referable<T> = LocalRef | RemoteRef | Serializable<T>;

declare class LocalRef<T = unknown> {
	constructor(value: T): LocalRef;

	/**
	 * 公称型にするためのプライベートプロパティ
	 */
	private _brand: unknown;

	readonly value: T;
}


declare class RemoteRef<T = unknown> {
	/**
	 * 公称型にするためのプライベートプロパティ
	 */
	private _brand: unknown;
}
```

## ヘルパークラス `EndpointMethods`
`RpcEndpoint`, `SerializableEndpoint`, `ReferenceEndpoint`を使用し、TypeScriptで型安全に使用できるAPIを提供する。

```typescript
interface EndpointMethods<T, Methods extends MethodsBase<T>> {
	call<Method extends Extract<keyof Methods, string>>(
		method: Method,
		...params: SwapRef<Parameters<Methods[Method]>>
	): Promise<Awaited<SwapRef<ReturnType<Methods[Method]>>>>;

	close(): void;
}

declare var EndpointMethods: {
	create<T>(port: MessagePort, serializer: Serializer<T>, localMethods: MethodsBase<T>): EndpointMethodsUntyped<T>;
};

interface EndpointMethodsUntyped<T> {
	withRemoteType<RemoteMethods extends MethodsBase<T>>(): EndpointMethods<T, RemoteMethods>;
}

type MethodsParamOrReturn<Methods extends MethodsBase<unknown>> = Parameters<Methods[string]>[number] | ReturnType<Methods[string]> extends Referable<infer R> ? R : never;

type MethodsBase<T> = {
	readonly [K in string]: (...params: never[]) => Awaitable<Referable<T>>;
};

type SwapRef<T> =
	T extends LocalRef<infer Inner> ? RemoteRef<Inner> :
	T extends RemoteRef<infer Inner> ? LocalRef<Inner> :
	T extends readonly [] ? [] :
	T extends readonly [infer First, ...infer Rest] ? [SwapRef<First>, ...SwapRef<Rest>] :
	T extends readonly (infer Inner)[] ? (SwapRef<Inner>)[] :
	T extends { readonly [key: string]: unknown } ? { readonly [K in keyof T]: SwapRef<T[K]> } :
	T;
```
