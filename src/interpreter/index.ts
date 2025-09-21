/**
 * AiScript interpreter
 */

import { autobind } from '../utils/mini-autobind.js';
import { AiScriptError, NonAiScriptError, AiScriptRuntimeError } from '../error.js';
import { nodeToJs } from '../utils/node-to-js.js';
import { Scope } from './scope.js';
import { std } from './lib/std.js';
import { assertString, expectAny } from './util.js';
import { NULL, FN_NATIVE, STR } from './value.js';
import { Variable } from './variable.js';
import { EventManager } from './events/manager.js';
import { IRQManager } from './irq.js';
import { AsyncEvaluator } from './evaluator/async-evaluator.js';
import { SyncEvaluator } from './evaluator/sync-evaluator.js';
import type { LogObject } from './logger.js';
import type * as Ast from '../node.js';
import type { JsValue } from './util.js';
import type { Value, VFn } from './value.js';

export class Interpreter {
	public stepCount = 0;
	public scope: Scope;
	private eventManager = new EventManager();
	private irqManager: IRQManager;
	private asyncEvaluator: AsyncEvaluator;
	private syncEvaluator: SyncEvaluator;

	constructor(
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
		const io = {
			print: FN_NATIVE(([v]) => {
				expectAny(v);
				if (this.opts.out) this.opts.out(v);
			}),
			readline: FN_NATIVE(async args => {
				const q = args[0];
				assertString(q);
				if (this.opts.in == null) return NULL;
				const a = await this.opts.in!(q.value);
				return STR(a);
			}),
		};

		const vars: Record<string, Variable> = Object.fromEntries(Object.entries({
			...consts,
			...std,
			...io,
		}).map(([k, v]) => [k, Variable.const(v)]));

		this.scope = new Scope([new Map(Object.entries(vars))]);
		this.scope.opts.log = (type, params): void => {
			switch (type) {
				case 'add': this.log('var:add', params); break;
				case 'read': this.log('var:read', params); break;
				case 'write': this.log('var:write', params); break;
				default: break;
			}
		};

		this.irqManager = new IRQManager(this.opts);

		this.asyncEvaluator = new AsyncEvaluator({
			log: this.log,
			eventHandlerRegistry: this.eventManager.handlerRegistry,
			preEval: this.preEval,
			handleError: this.handleError,
		});
		this.syncEvaluator = new SyncEvaluator({
			log: this.log,
			eventHandlerRegistry: this.eventManager.handlerRegistry,
			preEval: this.preEvalSync,
			asyncEvaluator: this.asyncEvaluator,
		});
	}

	@autobind
	public async exec(script?: Ast.Node[]): Promise<void> {
		await this.asyncEvaluator.exec(script, this.scope);
	}

	@autobind
	public execSync(script?: Ast.Node[]): Value | undefined {
		return this.syncEvaluator.exec(script, this.scope);
	}

	/**
	 * Executes AiScript Function.
	 * When it fails,
	 * (i)If error callback is registered via constructor, this.abort is called and the callback executed, then returns ERROR('func_failed').
	 * (ii)Otherwise, just throws a error.
	 *
	 * @remarks This is the same function as that passed to AiScript NATIVE functions as opts.topCall.
	 */
	@autobind
	public async execFn(fn: VFn, args: Value[]): Promise<Value> {
		return this.asyncEvaluator.execFn(fn, args);
	}

	/**
	 * Executes AiScript Function.
	 * When it fails,
	 * (i)If error callback is registered via constructor, this.abort is called and the callback executed, then returns ERROR('func_failed').
	 * (ii)Otherwise, just throws a error.
	 *
	 * @remarks This is the same function as that passed to AiScript NATIVE functions as opts.topCall.
	 */
	@autobind
	public execFnSync(fn: VFn, args: Value[]): Value {
		return this.syncEvaluator.execFn(fn, args);
	}

	/**
	 * Executes AiScript Function.
	 * Almost same as execFn but when error occurs this always throws and never calls callback.
	 *
	 * @remarks This is the same function as that passed to AiScript NATIVE functions as opts.call.
	 */
	@autobind
	public execFnSimple(fn: VFn, args: Value[]): Promise<Value> {
		return this.asyncEvaluator.fn(fn, args, []);
	}

	@autobind
	public static collectMetadata(script?: Ast.Node[]): Map<string | null, JsValue> | undefined {
		if (script == null || script.length === 0) return;

		const meta = new Map<string | null, JsValue>();

		for (const node of script) {
			switch (node.type) {
				case 'meta': {
					meta.set(node.name, nodeToJs(node.value));
					break;
				}

				default: {
					// nop
				}
			}
		}

		return meta;
	}

	@autobind
	private handleError(e: unknown): void {
		if (!this.opts.err) throw e;
		if (this.opts.abortOnError) {
			// when abortOnError is true, error handler should be called only once
			if (this.eventManager.stop) return;
			this.abort();
		}
		if (e instanceof AiScriptError) {
			this.opts.err(e);
		} else {
			this.opts.err(new NonAiScriptError(e));
		}
	}

	@autobind
	private log(type: string, params: LogObject): void {
		if (this.opts.log) this.opts.log(type, params);
	}

	@autobind
	private async preEval(): Promise<boolean> {
		if (this.eventManager.stop) return false;
		await this.eventManager.waitWhilePausing();
		await this.irqManager.sleepIfRequired(this.stepCount);
		this.increaseStep();
		return true;
	}

	@autobind
	private preEvalSync(): boolean {
		if (this.eventManager.stop) return false;
		this.increaseStep();
		return true;
	}

	@autobind
	private increaseStep(): void {
		this.stepCount++;
		if (this.opts.maxStep && this.stepCount > this.opts.maxStep) {
			throw new AiScriptRuntimeError('max step exceeded');
		}
	}

	@autobind
	public registerAbortHandler(handler: () => void): void {
		this.eventManager.handlerRegistry.registerAbortHandler(handler);
	}
	@autobind
	public registerPauseHandler(handler: () => void): void {
		this.eventManager.handlerRegistry.registerPauseHandler(handler);
	}
	@autobind
	public registerUnpauseHandler(handler: () => void): void {
		this.eventManager.handlerRegistry.registerUnpauseHandler(handler);
	}

	@autobind
	public unregisterAbortHandler(handler: () => void): void {
		this.eventManager.handlerRegistry.unregisterAbortHandler(handler);
	}
	@autobind
	public unregisterPauseHandler(handler: () => void): void {
		this.eventManager.handlerRegistry.unregisterPauseHandler(handler);
	}
	@autobind
	public unregisterUnpauseHandler(handler: () => void): void {
		this.eventManager.handlerRegistry.unregisterUnpauseHandler(handler);
	}

	@autobind
	public abort(): void {
		this.eventManager.abort();
	}

	@autobind
	public pause(): void {
		this.eventManager.pause();
	}

	@autobind
	public unpause(): void {
		this.eventManager.unpause();
	}
}
