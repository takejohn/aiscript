import type { Awaitable, Endpoint, EndpointInitializer } from './types.js';
import type { Cloneable } from './rpc.js';

export type RpcMethods = {
	[key: string]: (...args: never[]) => Awaitable<Cloneable>;
}

type WrapMethods<Methods extends RpcMethods> = UnionToIntersection<{
	[K in Extract<keyof Methods, string>]: (method: K, ...args: WrapParams<Parameters<Methods[K]>>) => WrapReturn<ReturnType<Methods[K]>>;
}[Extract<keyof Methods, string>]>;

type WrapParams<T extends unknown[]> = T extends [] ? [] :
	T extends [infer First, ...infer Rest] ? [Extract<First, Cloneable>, ...WrapParams<Rest>] :
	T extends (infer Item)[] ? (Extract<Item, Cloneable>)[] :
	never;

type WrapReturn<T extends Cloneable> = Promise<Awaited<T>>;

type UnionToIntersection<T> = (T extends unknown ? (k: T) => unknown : never) extends (k: infer U) => unknown ? U : never;

type Request = {
	method: string;
	params: Cloneable[];
};

type Response = Cloneable;

export class TypedRpcEndpoint<RemoteMethods extends RpcMethods> {
	private rpcEndpoint: Endpoint<Request, Response>;

	constructor(rpcEndpointInitializer: EndpointInitializer<Request, Response>, methods: RpcMethods) {
		const handler = methodsToHandler(methods);
		this.rpcEndpoint = rpcEndpointInitializer(handler);
	}

	request: WrapMethods<RemoteMethods> = ((method: string, ...params: Cloneable[]) => {
		return this.rpcEndpoint.request({ method, params });
	}) as WrapMethods<RemoteMethods>;
}

function methodsToHandler(methods: RpcMethods): (req: Request) => Awaitable<Response> {
	return (req: Request): Awaitable<Response> => {
		const methodName = req.method;
		if (!Object.hasOwn(methods, methodName)) {
			throw new TypeError(`Unknown method name: ${methodName}`);
		}
		const method = methods[methodName]!;
		return method(...req.params as Parameters<typeof method>);
	};
}
