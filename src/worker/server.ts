import { AiScriptError, AiScriptHostsideError, NonAiScriptError } from '../error.js';
import { Interpreter } from '../interpreter/index.js';
import type { Input, Method, MethodInit, Output, Request, Response, TransferableAiScriptError } from './protocol.js';

class LazyInterpreter {
	private inner: Interpreter | undefined;

	public get value(): Interpreter {
		if (this.inner == null) {
			throw new AiScriptHostsideError('Interpreted not initialized');
		}
		return this.inner;
	}

	public init([consts, opts]: Request<MethodInit>['params']): void {
		if (this.inner != null) {
			throw new AiScriptHostsideError('Interpreter already initialized');
		}
		// TODO: constsの値を渡す
		this.inner = new Interpreter({}, {
			maxStep: opts.maxStep,
			abortOnError: opts.abortOnError,
		});
	}
}

const interpreter = new LazyInterpreter();

self.addEventListener('message', async (event: MessageEvent<Input>) => {
	const data = event.data;
	if (data.type === 'request') {
		try {
			const result = await handleRequest(data);
			const response: Response<Method> = { type: 'response', name: data.name, ok: true, result, id: data.id };
			self.postMessage(response);
		} catch (error: unknown) {
			const transferableError = errorToTransferable(error);
			const response: Response<Method> = {
				type: 'response',
				name: data.name,
				ok: false,
				error: transferableError,
				id: data.id,
			};
			self.postMessage(response);
		}
	}
});

/**
 * @throws {AiScriptError}
 */
async function handleRequest(request: Request<Method>): Promise<(Response<Method> & { ok: true })['result']> {
	switch (request.name) {
		case 'init': {
			interpreter.init(request.params);
			return;
		}
		case 'exec':
	}
}

function errorToTransferable(error: unknown): TransferableAiScriptError {
	const wrappedError = (error instanceof AiScriptError) ? error : new NonAiScriptError(error);
	return { name: wrappedError.name, info: wrappedError.info, pos: wrappedError.pos };
}
