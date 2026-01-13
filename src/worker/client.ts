import type { AiScriptError } from '../error.js';
import type { LogObject } from '../interpreter/index.js';
import type { Value } from '../interpreter/value.js';

export class RemoteInterpreter {
	private worker: Worker;

	private constructor(
		consts: Record<string, Value>,
		private opts: {
			in?(q: string): Promise<string>;
			out?(value: Value): void;
			err?(e: AiScriptError): void;
			log?(type: string, params: LogObject): void;
			maxStep?: number;
			abortOnError?: boolean;
			irqRate?: number;
			irqSleep?: number | (() => Promise<void>);
		} = {},
	) {
		const url = new URL('./server.js', import.meta.url);
		this.worker = new Worker(url, { type: 'module' });
	}
}
