import { describe, expect, test } from 'vitest';
import { RpcEndpoint } from '../src/worker/messaging/rpc.js';

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
		})
	});
});
