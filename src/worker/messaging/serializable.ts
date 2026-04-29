import { autobind } from '../../utils/mini-autobind.js';
import { type Endpoint, type EndpointHandler, type EndpointInitializer } from './types.js';
import type { Cloneable } from './rpc.js';

export interface Serializer<T, U extends Cloneable = Cloneable> {
	serialize(value: T): U;
	deserialize(serialized: U): T;
}

export class SerializableEndpoint<T, U extends Cloneable> implements Endpoint<T> {
	private underlying: Endpoint<U>;
	private serializer: Serializer<T, U>;
	private handler: EndpointHandler<T>;

	constructor(underlying: EndpointInitializer<U>, serializer: Serializer<T, U>, handler: EndpointHandler<T>) {
		this.serializer = serializer;
		this.handler = handler;
		this.underlying = underlying(this.wrapHandler);
	}

	static initializer<T, U extends Cloneable>(underlying: EndpointInitializer<U>, serializer: Serializer<T, U>): EndpointInitializer<T> {
		return (handler) => new SerializableEndpoint(underlying, serializer, handler);
	}

	@autobind
	async request(request: T): Promise<T> {
		const serializedRequest = this.serializer.serialize(request);
		const serializedResponse = await this.underlying.request(serializedRequest);
		const response = this.serializer.deserialize(serializedResponse);
		return response;
	}

	@autobind
	private async wrapHandler(serializedRequest: U): Promise<U> {
		const request = this.serializer.deserialize(serializedRequest);
		const response = await this.handler(request);
		const serializedResponse = this.serializer.serialize(response);
		return serializedResponse;
	}
}
