import { describe, expect, test } from 'vitest';
import { RCPUnknownError, RPCClient, RPCError, RPCServer } from '../src/utils/rpc.js';

describe('RPC', () => {
	const methods = {
		async add(a: number, b: number): Promise<number> {
			return a + b;
		},

		async subtract(a: number, b: number): Promise<number> {
			return a - b;
		},

		async identical<T>(x: T): Promise<T> {
			return x;
		},

		async rpcError(): Promise<never> {
			throw new RPCError({ message: 'error message' });
		},

		async rpcErrorWithName(): Promise<never> {
			throw new RPCError({ name: 'Error Name', message: 'error message' });
		},

		async error(): Promise<never> {
			throw new Error();
		},

		async throwNotError(): Promise<never> {
			throw null;
		}
	};

	const createServerClient = () => {
		const server = new RPCServer(methods, (response) => client.receive(response));
		const client = new RPCClient<typeof methods>((request) => server.receive(request));
		return { server, client };
	}

	test.concurrent('normal', async () => {
		const { client } = createServerClient();
		await expect(client.methods.add(1, 2)).resolves.toBe(3);
	});

	test.concurrent('call many times', async () => {
		const { client } = createServerClient();
		await expect(Promise.all([
			client.methods.add(1, 2),
			client.methods.subtract(3, 4),
			client.methods.add(5, 6),
		])).resolves.toStrictEqual([3, -1, 11]);
	});

	test.concurrent('generic', async () => {
		const { client } = createServerClient();
		const res: number = await client.methods.identical(42);
		expect(res).toBe(42);
	});

	test.concurrent('error', async () => {
		const { client } = createServerClient();
		await expect(client.methods.rpcError()).rejects.toStrictEqual(
			new RPCError({ message: 'error message' }),
		);
	});

	test.concurrent('error with name', async () => {
		const { client } = createServerClient();
		await expect(client.methods.rpcErrorWithName()).rejects.toStrictEqual(
			new RPCError({ name: 'Error Name', message: 'error message' }),
		);
	});

	test.concurrent('unknown error', async () => {
		const { client } = createServerClient();
		await expect(client.methods.error()).rejects.toBeInstanceOf(RCPUnknownError);
	});

	test.concurrent('thrown not error', async () => {
		const { client } = createServerClient();
		await expect(client.methods.throwNotError()).rejects.toBeInstanceOf(RCPUnknownError);
	});
});
