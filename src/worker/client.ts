import type { AiScriptError } from '../error.js';
import type { LogObject } from '../interpreter/index.js';
import type { Value } from '../interpreter/value.js';

export class WorkerInterpreter {
	private worker: Worker;

	private constructor(worker: Worker) {
		this.worker = worker;
	}

	public static async create(
		consts: Record<string, Value>,
		opts: {
			in?(q: string): Promise<string>;
			out?(value: Value): void;
			err?(e: AiScriptError): void;
			log?(type: string, params: LogObject): void;
			maxStep?: number;
			abortOnError?: boolean;
		} = {},
	): Promise<WorkerInterpreter> {
		const url = new URL('./server.js', import.meta.url);
		const worker = new Worker(url, { type: 'module' });
		// TODO: 引数をWorkerに送信
		return new WorkerInterpreter(worker);
	}
}
