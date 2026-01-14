import '@vitest/web-worker';
import { describe, test } from 'vitest';
import { WorkerInterpreter } from '../src';

describe('Web Worker', () => {
	test.concurrent('initialize', async () => {
		const interpreter = WorkerInterpreter.create({});
	});
});
