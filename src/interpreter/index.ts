/**
 * AiScript interpreter
 */

import { autobind } from '../utils/mini-autobind.js';
import { AiScriptError, NonAiScriptError, AiScriptRuntimeError, AiScriptHostsideError } from '../error.js';
import { nodeToJs } from '../utils/node-to-js.js';
import { Scope } from './scope.js';
import { std } from './lib/std.js';
import { unWrapRet, assertValue, type Control } from './control.js';
import { assertString, expectAny } from './util.js';
import { NULL, FN_NATIVE, STR, ERROR } from './value.js';
import { Variable } from './variable.js';
import { evaluateAsync, evaluateSync } from './evaluator/value-evaluator.js';
import { define, defineByDefinitionNode } from './define.js';
import { EventManager } from './events/manager.js';
import { iterateNs } from './namespace.js';
import { IRQManager } from './irq.js';
import type { LogObject } from './logger.js';
import type * as Ast from '../node.js';
import type { CallInfo } from './types.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './evaluator/context.js';
import type { JsValue } from './util.js';
import type { Value, VFn } from './value.js';

export class Interpreter {
	public stepCount = 0;
	public scope: Scope;
	private eventManager = new EventManager();
	private irqManager: IRQManager;

	private asyncEvaluatorContext: AsyncEvaluatorContext = {
		eval: (node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> => this._eval(node, scope, callStack),
		fn: (fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Promise<Value> => this._fn(fn, args, callStack, pos),
		run: (program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> => this._run(program, scope, callStack),
		log: (type: string, params: LogObject): void => this.log(type, params),
	};

	private syncEvaluatorContext: SyncEvaluatorContext = {
		eval: (node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control => this._evalSync(node, scope, callStack),
		fn: (fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Value => this._fnSync(fn, args, callStack, pos),
		run: (program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Value | Control => this._runSync(program, scope, callStack),
		log: (type: string, params: LogObject): void => this.log(type, params),
	};

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
	}

	@autobind
	public async exec(script?: Ast.Node[]): Promise<void> {
		if (script == null || script.length === 0) return;
		try {
			await this.collectNs(script);
			const result = await this._run(script, this.scope, []);
			assertValue(result);
			this.log('end', { val: result });
		} catch (e) {
			this.handleError(e);
		}
	}

	@autobind
	public execSync(script?: Ast.Node[]): Value | undefined {
		if (script == null || script.length === 0) return;
		this.collectNsSync(script);
		const result = this._runSync(script, this.scope, []);
		assertValue(result);
		return result;
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
		return await this._fn(fn, args, [])
			.catch(e => {
				this.handleError(e);
				return ERROR('func_failed');
			});
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
		return this._fnSync(fn, args, []);
	}

	/**
	 * Executes AiScript Function.
	 * Almost same as execFn but when error occurs this always throws and never calls callback.
	 *
	 * @remarks This is the same function as that passed to AiScript NATIVE functions as opts.call.
	 */
	@autobind
	public execFnSimple(fn: VFn, args: Value[]): Promise<Value> {
		return this._fn(fn, args, []);
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
	private async collectNs(script: Ast.Node[], scope = this.scope): Promise<void> {
		for (const [node, nsScope] of iterateNs(script, scope)) {
			const value = await this._eval(node.expr, nsScope, []);
			assertValue(value);
			defineByDefinitionNode(node, nsScope, value);
		}
	}

	@autobind
	private collectNsSync(script: Ast.Node[], scope = this.scope): void {
		for (const [node, nsScope] of iterateNs(script, scope)) {
			const value = this._evalSync(node.expr, nsScope, []);
			assertValue(value);
			defineByDefinitionNode(node, nsScope, value);
		}
	}

	@autobind
	private async _fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Promise<Value> {
		if (fn.native) {
			const info: CallInfo = { name: '<native>', pos };
			const result = fn.native(args, {
				call: (fn, args) => this._fn(fn, args, [...callStack, info]),
				topCall: this.execFn,
				...this.eventManager.handlerRegistry,
			});
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			return result ?? NULL;
		} else {
			const fnScope = fn.scope!.createChildScope();
			for (const [i, param] of fn.params.entries()) {
				const arg = args[i];
				if (!param.default) expectAny(arg);
				define(fnScope, param.dest, arg ?? param.default!, true);
			}

			const info: CallInfo = { name: fn.name ?? '<anonymous>', pos };
			return unWrapRet(await this._run(fn.statements!, fnScope, [...callStack, info]));
		}
	}

	@autobind
	private _fnSync(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Value {
		if (fn.native) {
			const info: CallInfo = { name: '<native>', pos };
			const result = fn.nativeSync ? fn.nativeSync(args, {
				call: (fn, args) => this._fnSync(fn, args, [...callStack, info]),
				topCall: this.execFnSync,
				...this.eventManager.handlerRegistry,
			}) : fn.native(args, {
				call: (fn, args) => this._fn(fn, args, [...callStack, info]),
				topCall: this.execFn,
				...this.eventManager.handlerRegistry,
			});
			if (result instanceof Promise) {
				throw new AiScriptHostsideError('Native function must not return a Promise in sync mode.');
			}
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			return result ?? NULL;
		} else {
			const fnScope = fn.scope!.createChildScope();
			for (const [i, param] of fn.params.entries()) {
				const arg = args[i];
				if (!param.default) expectAny(arg);
				define(fnScope, param.dest, arg ?? param.default!, true);
			}

			const info: CallInfo = { name: fn.name ?? '<anonymous>', pos };
			return unWrapRet(this._runSync(fn.statements!, fnScope, [...callStack, info]));
		}
	}

	@autobind
	private _eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return this.__eval(node, scope, callStack).catch(e => {
			if (e.pos) throw e;
			else {
				const e2 = (e instanceof AiScriptError) ? e : new NonAiScriptError(e);
				e2.pos = node.loc.start;
				e2.message = [
					e2.message,
					...[...callStack, { pos: e2.pos }].map(({ pos }, i) => {
						const name = callStack[i - 1]?.name ?? '<root>';
						return pos
							? `  at ${name} (Line ${pos.line}, Column ${pos.column})`
							: `  at ${name}`;
					}).reverse(),
				].join('\n');
				throw e2;
			}
		});
	}

	@autobind
	private _evalSync(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return this.__evalSync(node, scope, callStack);
	}

	@autobind
	private async __eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		if (this.eventManager.stop) return NULL;
		await this.eventManager.waitWhilePausing();
		await this.irqManager.sleepIfRequired(this.stepCount);
		this.stepCount++;
		if (this.opts.maxStep && this.stepCount > this.opts.maxStep) {
			throw new AiScriptRuntimeError('max step exceeded');
		}

		return evaluateAsync(this.asyncEvaluatorContext, node, scope, callStack);
	}

	@autobind
	private __evalSync(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		if (this.eventManager.stop) return NULL;

		this.stepCount++;
		if (this.opts.maxStep && this.stepCount > this.opts.maxStep) {
			throw new AiScriptRuntimeError('max step exceeded');
		}

		return evaluateSync(this.syncEvaluatorContext, node, scope, callStack);
	}

	@autobind
	private async _run(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		this.log('block:enter', { scope: scope.name });

		let v: Value | Control = NULL;

		for (let i = 0; i < program.length; i++) {
			const node = program[i]!;

			v = await this._eval(node, scope, callStack);
			if (v.type === 'return') {
				this.log('block:return', { scope: scope.name, val: v.value });
				return v;
			} else if (v.type === 'break') {
				this.log('block:break', { scope: scope.name });
				return v;
			} else if (v.type === 'continue') {
				this.log('block:continue', { scope: scope.name });
				return v;
			}
		}

		this.log('block:leave', { scope: scope.name, val: v });
		return v;
	}

	@autobind
	private _runSync(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		this.log('block:enter', { scope: scope.name });

		let v: Value | Control = NULL;

		for (let i = 0; i < program.length; i++) {
			const node = program[i]!;

			v = this._evalSync(node, scope, callStack);
			if (v.type === 'return') {
				this.log('block:return', { scope: scope.name, val: v.value });
				return v;
			} else if (v.type === 'break') {
				this.log('block:break', { scope: scope.name });
				return v;
			} else if (v.type === 'continue') {
				this.log('block:continue', { scope: scope.name });
				return v;
			}
		}

		this.log('block:leave', { scope: scope.name, val: v });
		return v;
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
