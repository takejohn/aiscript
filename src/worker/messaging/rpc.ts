import { autobind } from '../../utils/mini-autobind.js';
import { IdAllocator } from './allocator.js';
import type { Endpoint, EndpointHandler } from './types.js';

export type Cloneable = { readonly [key: string]: Cloneable } | readonly Cloneable[] | CloneablePrimitive;

type CloneablePrimitive = string | number | bigint | boolean | undefined | null;

type Message<T extends Cloneable> = Request<T> | Response<T>;

type Request<T extends Cloneable> = {
	type: 'request';
	payload: T;
	id: number;
};

type Response<T extends Cloneable> = ResponseOk<T> | ResponseErr;

type ResponseBase = {
	type: 'response';
	id: number;
	ok: boolean;
}

type ResponseOk<T extends Cloneable> = ResponseBase & {
	ok: true;
	result: T;
}

type ResponseErr = ResponseBase & {
	ok: false;
	error?: string;
};

export class RpcEndpoint<T extends Cloneable> implements Endpoint<T> {
	private port: MessagePort;
	private handler: EndpointHandler<T>;
	private resolvers = new IdAllocator<(response: Response<T>) => void>();

	constructor(port: MessagePort, handler: EndpointHandler<T>) {
		this.port = port;
		this.handler = handler;
		port.addEventListener('message', this.onMessage);
	}

	@autobind
	async request(req: T): Promise<T> {
		const response = await new Promise<Response<T>>((resolve) => {
			const id = this.resolvers.alloc(resolve);
			const message: Message<T> = { type: 'request', payload: req, id };
			this.port.postMessage(message);
		});
		if (response.ok) {
			return response.result;
		} else {
			throw new InternalRpcError(response.error);
		}
	}

	@autobind
	private onMessage(ev: MessageEvent<Message<T>>): void {
		const message = ev.data;
		switch (message.type) {
			case 'request': {
				this.wrapHandler(message).then((response: Message<T>) => this.port.postMessage(response));
				break;
			}
			case 'response': {
				const resolver = this.resolvers.remove(message.id);
				resolver(message);
				break;
			}
		}
	}

	@autobind
	private async wrapHandler(request: Request<T>): Promise<Response<T>> {
		const id = request.id;
		try {
			const result = await this.handler(request.payload);
			return { type: 'response', ok: true, id, result };
		} catch (e) {
			return { type: 'response', ok: false, id, error: getMessageStringProperty(e) };
		}
	}
}

class InternalRpcError extends Error {}

function getMessageStringProperty(value: unknown): string | undefined {
	if (value == null) {
		return;
	}
	switch (typeof value) {
		case 'object':
		case 'function': {
			if ('message' in value) {
				const message = value.message;
				if (typeof message === 'string') {
					return message;
				}
			}
		}
	}
	return;
}
