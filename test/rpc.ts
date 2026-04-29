import { describe, expect, test, vi } from 'vitest';
import { Cloneable, RpcEndpoint } from '../src/worker/messaging/rpc.js';
import { SerializableEndpoint } from '../src/worker/messaging/serializable.js';
import { EndpointInitializer } from '../src/worker/messaging/types.js';

describe('Messaging', () => {
	describe('rpc', () => {
		function createEndpoints(handler1: (value: number) => number, handler2: (value: number) => number) {
			const channel = new MessageChannel();
			const endpoint1 = new RpcEndpoint(channel.port1, handler1);
			const endpoint2 = new RpcEndpoint(channel.port2, handler2);
			return { endpoint1, endpoint2 };
		}

		const fail = () => { throw new Error('not implemented'); };
		const throwNull = () => { throw null; };
		const throwNumber = () => { throw 42; };
		const add1 = (value: number) => value + 1;
		const mul2 = (value: number) => value * 2;

		test.concurrent('normal', async () => {
			const { endpoint1 } = createEndpoints(fail, mul2);
			await expect(endpoint1.request(1)).resolves.toBe(2);
		});

		test.concurrent('request many times', async () => {
			const { endpoint1 } = createEndpoints(fail, mul2);
			await expect(Promise.all([
				endpoint1.request(1),
				endpoint1.request(2),
				endpoint1.request(3),
			])).resolves.toStrictEqual([2, 4, 6]);
		});

		test.concurrent('another endpoint', async () => {
			const { endpoint1, endpoint2 } = createEndpoints(add1, mul2);
			await expect(endpoint1.request(3)).resolves.toBe(6);
			await expect(endpoint2.request(3)).resolves.toBe(4);
		});

		test.concurrent('error', async () => {
			const { endpoint1 } = createEndpoints(add1, fail);
			await expect(endpoint1.request(1)).rejects.toThrow('not implemented');
		});

		test.concurrent('throw null', async () => {
			const { endpoint1 } = createEndpoints(add1, throwNull);
			await expect(endpoint1.request(1)).rejects.toThrow(Error);
		});

		test.concurrent('throw number', async () => {
			const { endpoint1 } = createEndpoints(add1, throwNumber);
			await expect(endpoint1.request(1)).rejects.toThrow(Error);
		});

		test.concurrent('initializer', async () => {
			const channel = new MessageChannel();
			const endpoint1 = new RpcEndpoint<number>(channel.port1, fail)
			const initializer = RpcEndpoint.initializer<number>(channel.port2);
			const endpoint2 = initializer(add1);
			await expect(endpoint1.request(1)).resolves.toBe(2);
		})
	});

	describe('serializable', () => {
		const identicalSerializer = {
			serialize<T extends Cloneable>(value: T): T {
				return value;
			},

			deserialize<T extends Cloneable>(serialized: T): T {
				return serialized;
			}
		};

		test.concurrent('identical serializer, handler', async () => {
			const remoteHandler = () => expect.unreachable('remoteHandler will not be called');
			const underlyingInitializer = vi.fn<EndpointInitializer<number>>()
				.mockReturnValueOnce({ request: remoteHandler });

			const _endpoint = new SerializableEndpoint<number, number>(
				underlyingInitializer,
				identicalSerializer,
				(value) => value + 1
			);

			expect(underlyingInitializer).toHaveBeenCalledOnce();
			const [handler] = underlyingInitializer.mock.calls[0];
			await expect(handler(1)).resolves.toBe(2);
		});

		test.concurrent('identical serializer, request', async () => {
			const remoteHandler = vi.fn<(req: number) => Promise<number>>()
				.mockResolvedValueOnce(2);
			const underlyingInitializer = vi.fn<EndpointInitializer<number>>()
				.mockReturnValueOnce({ request: remoteHandler });

			const endpoint = new SerializableEndpoint<number, number>(
				underlyingInitializer,
				identicalSerializer,
				() => expect.fail('will not be called')
			);

			expect(underlyingInitializer).toHaveBeenCalledOnce();
			expect(remoteHandler).toHaveBeenCalledTimes(0);
			await expect(endpoint.request(1)).resolves.toBe(2);
			expect(remoteHandler).toHaveBeenCalledOnce();
			expect(remoteHandler).toHaveBeenCalledWith(1);
		});

		test.concurrent('initializer', async () => {
			const initializer = SerializableEndpoint.initializer<number, number>(() => ({
				request: (req) => Promise.resolve(req + 1),
			}), identicalSerializer);
			const endpoint = initializer(() => expect.fail('will not be called'));
			await expect(endpoint.request(1)).resolves.toBe(2);
		})
	})
});
