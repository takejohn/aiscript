import { autobind } from '../../utils/mini-autobind.js';
import { IdAllocator } from './allocator.js';
import type { Endpoint, EndpointHandler, EndpointInitializer } from './types.js';

export type Cloneable = { readonly [key: string]: Cloneable } | readonly Cloneable[] | CloneablePrimitive;

type CloneablePrimitive = string | number | bigint | boolean | undefined | null;

type Message<Req extends Cloneable, Res extends Cloneable> = Request<Req> | Response<Res>;

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

export class RpcEndpoint<Req extends Cloneable, Res extends Cloneable = Req> implements Endpoint<Req, Res> {
	private port: MessagePort;
	private handler: EndpointHandler<Req, Res>;
	private resolvers = new IdAllocator<(response: Response<Res>) => void>();

	constructor(port: MessagePort, handler: EndpointHandler<Req, Res>) {
		this.port = port;
		this.handler = handler;
		port.addEventListener('message', this.onMessage);
	}

	static initializer<Req extends Cloneable, Res extends Cloneable = Req>(port: MessagePort): EndpointInitializer<Req, Res> {
		return (handler) => new RpcEndpoint(port, handler);
	}

	@autobind
	async request(req: Req): Promise<Res> {
		const response = await new Promise<Response<Res>>((resolve) => {
			const id = this.resolvers.alloc(resolve);
			const message: Message<Req, Res> = { type: 'request', payload: req, id };
			this.port.postMessage(message);
		});
		if (response.ok) {
			return response.result;
		} else {
			throw new InternalRpcError(response.error);
		}
	}

	@autobind
	private onMessage(ev: MessageEvent<Message<Req, Res>>): void {
		const message = ev.data;
		switch (message.type) {
			case 'request': {
				this.wrapHandler(message).then((response: Message<Req, Res>) => this.port.postMessage(response));
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
	private async wrapHandler(request: Request<Req>): Promise<Response<Res>> {
		const id = request.id;
		try {
			const result = await this.handler(request.payload);
			return { type: 'response', ok: true, id, result };
		} catch (e) {
			return { type: 'response', ok: false, id, error: getMessageStringProperty(e) };
		}
	}
}

class InternalRpcError extends Error {
	static {
		InternalRpcError.prototype.name = 'InternalRpcError';
	}
}

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
