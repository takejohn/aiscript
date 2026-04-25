import { autobind } from './mini-autobind.js';

type RPCValue = { [key: string]: RPCValue } | RPCValue[] | string | number | boolean | null | undefined;

type Request = {
	method: string;
	params: RPCValue[];
	id: number;
};

type Response = ResponseOk | ResponseErr;

type ResponseOk = {
	id: number;
	ok: true;
	result: RPCValue;
}

type ResponseErr = {
	id: number;
	ok: false;
	error: ErrorDetail;
	checked: true;
} | {
	id: number;
	ok: false;
	error: UnknownErrorDetail;
	checked: false;
}

type ErrorDetail = {
	name?: string;
	message: string;
};

type UnknownErrorDetail = {
	name?: string;
	message?: string;
}

type Awaitable<T> = T | PromiseLike<Awaitable<T>>;

export type MethodsBase = {
	readonly [K in string]: (...params: never[]) => Promise<Awaitable<RPCValue>>;
};

export class RPCError<T extends ErrorDetail = ErrorDetail> extends Error {
	static {
		RPCError.prototype.name = 'RPCError';
	}

	detail: T;

	constructor(detail: T) {
		super(detail.message);
		const name = detail.name;
		if (name != null) {
			this.name = name;
		}
		this.detail = detail;
	}
}

export class RPCUnknownError extends Error {
	static {
		RPCUnknownError.prototype.name = 'RPCUnknownError';
	}

	constructor(detail: UnknownErrorDetail) {
		super(detail.message);
		const name = detail.name;
		if (name != null) {
			this.name = name;
		}
	}
}

type ProxiedMethods<Methods extends MethodsBase> = Pick<Methods, Extract<keyof Methods, string>>;

export class RPCClient<Methods extends MethodsBase> {
	private send: (request: Request) => void;
	private nextId = 0;
	private resolvers = new Map<number, (response: Response) => void>;
	/**
	 * メソッドをメソッド名でのプロパティアクセスにより取得できるProxy。
	 * in演算子などプロパティアクセス以外の操作は機能しない
	 */
	public readonly methods: ProxiedMethods<Methods>;

	constructor(sender: (request: Request) => void) {
		this.send = sender;
		this.methods = new Proxy({}, {
			get: <Method extends Extract<keyof Methods, string>>(_target: unknown, propName: Method) => 
				(...params: Parameters<Methods[Method]>): Promise<Awaited<ReturnType<Methods[Method]>>> =>
					this.invoke(propName, params),
		}) as ProxiedMethods<Methods>;
	}

	@autobind
	receive(response: Response): void {
		const id = response.id;
		const resolver = this.resolvers.get(id);
		if (resolver == null) {
			throw new RangeError(`Unknown id: ${id}`);
		}
		resolver(response);
	}

	@autobind
	private async invoke<Method extends Extract<keyof Methods, string>>(
		method: Method,
		params: Parameters<Methods[Method]>
	): Promise<Awaited<ReturnType<Methods[Method]>>> {
		const response = await new Promise<Response>((resolve) => {
			const id = this.generateId();
			this.resolvers.set(id, resolve);
			this.send({ method, params, id });
		});
		if (response.ok) {
			return response.result as Awaited<ReturnType<Methods[Method]>>;
		} else if (response.checked) {
			throw new RPCError(response.error);
		} else {
			throw new RPCUnknownError(response.error);
		}
	}

	@autobind
	private generateId(): number {
		const id = this.nextId;
		this.nextId = id + 1;
		return id;
	}
};

export class RPCServer<Methods extends MethodsBase> {
	private methods: Methods;
	private send: (response: Response) => void;

	constructor(methods: Methods, sender: (response: Response) => void) {
		this.methods = methods;
		this.send = sender;
	}

	@autobind
	async receive(request: Request): Promise<void> {
		const response = await this.wrapExecution(request);
		this.send(response);
	}

	@autobind
	private async wrapExecution(request: Request): Promise<Response> {
		if (!Object.hasOwn(this.methods, request.method)) {
			throw new TypeError(`unknown method: ${request.method}`);
		}
		const method = this.methods[request.method]!.bind(this.methods);
		const params = request.params;
		const id = request.id;
		try {
			// paramsの長さが1以上の場合、never[]は正しくはないが、methodの引数にできるようにこうキャストする
			const result = await method(...(params as never[]));
			return { id, ok: true, result };
		} catch (e) {
			if (e instanceof RPCError) {
				return { id, ok: false, error: e.detail, checked: true };
			}
			return { id, ok: false, error: { name: getErrorName(e), message: getErrorMessage(e) }, checked: false };
		}
	}
};

function getErrorName(error: unknown): string | undefined {
	if (error != null && typeof error === 'object' && 'name' in error) {
		const name = error.name;
		if (typeof name === 'string') {
			return name;
		}
	}
	return;
}

function getErrorMessage(error: unknown): string | undefined {
	if (error != null && typeof error === 'object' && 'message' in error) {
		const message = error.message;
		if (typeof message === 'string') {
			return message;
		}
	}
	return;
}
