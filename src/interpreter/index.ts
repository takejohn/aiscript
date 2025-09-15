/**
 * AiScript interpreter
 */

import { autobind } from '../utils/mini-autobind.js';
import { AiScriptError, NonAiScriptError, AiScriptNamespaceError, AiScriptRuntimeError, AiScriptHostsideError } from '../error.js';
import * as Ast from '../node.js';
import { nodeToJs } from '../utils/node-to-js.js';
import { Scope } from './scope.js';
import { std } from './lib/std.js';
import { unWrapRet, assertValue, isControl, type Control } from './control.js';
import { assertNumber, assertString, assertObject, isObject, isArray, expectAny, reprValue, isFunction } from './util.js';
import { NULL, FN_NATIVE, STR, ERROR } from './value.js';
import { Variable } from './variable.js';
import { Reference } from './reference.js';
import { evaluateAsync, evaluateSync } from './evaluate.js';
import { define } from './define.js';
import type { AsyncEvaluatorContext, CallInfo, LogObject, SyncEvaluatorContext } from './context.js';
import type { JsValue } from './util.js';
import type { Value, VFn } from './value.js';

export class Interpreter {
	public stepCount = 0;
	private stop = false;
	private pausing: { promise: Promise<void>, resolve: () => void } | null = null;
	public scope: Scope;
	private abortHandlers: (() => void)[] = [];
	private pauseHandlers: (() => void)[] = [];
	private unpauseHandlers: (() => void)[] = [];
	private vars: Record<string, Variable> = {};
	private irqRate: number;
	private irqSleep: () => Promise<void>;

	private asyncEvaluatorContext: AsyncEvaluatorContext = {
		eval: (node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> => this._eval(node, scope, callStack),
		evalClause: (node: Ast.Statement | Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> => this._evalClause(node, scope, callStack),
		fn: (fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Promise<Value> => this._fn(fn, args, callStack, pos),
		getReference: (dest: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Reference | Control> => this.getReference(dest, scope, callStack),
		run: (program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> => this._run(program, scope, callStack),
		log: (type: string, params: LogObject): void => this.log(type, params),
	};

	private syncEvaluatorContext: SyncEvaluatorContext = {
		eval: (node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control => this._evalSync(node, scope, callStack),
		evalClause: (node: Ast.Statement | Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Value | Control => this._evalClauseSync(node, scope, callStack),
		fn: (fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Value => this._fnSync(fn, args, callStack, pos),
		getReference: (dest: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Reference | Control => this.getReferenceSync(dest, scope, callStack),
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

		this.vars = Object.fromEntries(Object.entries({
			...consts,
			...std,
			...io,
		}).map(([k, v]) => [k, Variable.const(v)]));

		this.scope = new Scope([new Map(Object.entries(this.vars))]);
		this.scope.opts.log = (type, params): void => {
			switch (type) {
				case 'add': this.log('var:add', params); break;
				case 'read': this.log('var:read', params); break;
				case 'write': this.log('var:write', params); break;
				default: break;
			}
		};

		if (!((this.opts.irqRate ?? 300) >= 0)) {
			throw new AiScriptHostsideError(`Invalid IRQ rate (${this.opts.irqRate}): must be non-negative number`);
		}
		this.irqRate = this.opts.irqRate ?? 300;

		const sleep = (time: number) => (
			(): Promise<void> => new Promise(resolve => setTimeout(resolve, time))
		);

		if (typeof this.opts.irqSleep === 'function') {
			this.irqSleep = this.opts.irqSleep;
		} else if (this.opts.irqSleep === undefined) {
			this.irqSleep = sleep(5);
		} else if (this.opts.irqSleep >= 0) {
			this.irqSleep = sleep(this.opts.irqSleep);
		} else {
			throw new AiScriptHostsideError('irqSleep must be a function or a positive number.');
		}
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
			if (this.stop) return;
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
		for (const node of script) {
			switch (node.type) {
				case 'ns': {
					await this.collectNsMember(node, scope);
					break;
				}

				default: {
					// nop
				}
			}
		}
	}

	@autobind
	private collectNsSync(script: Ast.Node[], scope = this.scope): void {
		for (const node of script) {
			switch (node.type) {
				case 'ns': {
					this.collectNsMemberSync(node, scope);
					break;
				}

				default: {
					// nop
				}
			}
		}
	}

	@autobind
	private async collectNsMember(ns: Ast.Namespace, scope = this.scope): Promise<void> {
		const nsScope = scope.createChildNamespaceScope(ns.name);

		await this.collectNs(ns.members, nsScope);

		for (const node of ns.members) {
			switch (node.type) {
				case 'def': {
					if (node.dest.type !== 'identifier') {
						throw new AiScriptNamespaceError('Destructuring assignment is invalid in namespace declarations.', node.loc.start);
					}
					if (node.mut) {
						throw new AiScriptNamespaceError('No "var" in namespace declaration: ' + node.dest.name, node.loc.start);
					}

					const value = await this._eval(node.expr, nsScope, []);
					assertValue(value);
					if (
						node.expr.type === 'fn'
						&& isFunction(value)
						&& !value.native
					) {
						value.name = nsScope.getNsPrefix() + node.dest.name;
					}
					define(nsScope, node.dest, value, node.mut);

					break;
				}

				case 'ns': {
					break; // nop
				}

				default: {
					// exhaustiveness check
					const n: never = node;
					const nd = n as Ast.Node;
					throw new AiScriptNamespaceError('invalid ns member type: ' + nd.type, nd.loc.start);
				}
			}
		}
	}

	@autobind
	private collectNsMemberSync(ns: Ast.Namespace, scope = this.scope): void {
		const nsScope = scope.createChildNamespaceScope(ns.name);

		this.collectNsSync(ns.members, nsScope);

		for (const node of ns.members) {
			switch (node.type) {
				case 'def': {
					if (node.dest.type !== 'identifier') {
						throw new AiScriptNamespaceError('Destructuring assignment is invalid in namespace declarations.', node.loc.start);
					}
					if (node.mut) {
						throw new AiScriptNamespaceError('No "var" in namespace declaration: ' + node.dest.name, node.loc.start);
					}

					const value = this._evalSync(node.expr, nsScope, []);
					assertValue(value);
					if (
						node.expr.type === 'fn'
						&& isFunction(value)
						&& !value.native
					) {
						value.name = nsScope.getNsPrefix() + node.dest.name;
					}
					define(nsScope, node.dest, value, node.mut);

					break;
				}

				case 'ns': {
					break; // nop
				}

				default: {
					// exhaustiveness check
					const n: never = node;
					const nd = n as Ast.Node;
					throw new AiScriptNamespaceError('invalid ns member type: ' + nd.type, nd.loc.start);
				}
			}
		}
	}

	@autobind
	private async _fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Promise<Value> {
		if (fn.native) {
			const info: CallInfo = { name: '<native>', pos };
			const result = fn.native(args, {
				call: (fn, args) => this._fn(fn, args, [...callStack, info]),
				topCall: this.execFn,
				registerAbortHandler: this.registerAbortHandler,
				registerPauseHandler: this.registerPauseHandler,
				registerUnpauseHandler: this.registerUnpauseHandler,
				unregisterAbortHandler: this.unregisterAbortHandler,
				unregisterPauseHandler: this.unregisterPauseHandler,
				unregisterUnpauseHandler: this.unregisterUnpauseHandler,
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
				registerAbortHandler: this.registerAbortHandler,
				registerPauseHandler: this.registerPauseHandler,
				registerUnpauseHandler: this.registerUnpauseHandler,
				unregisterAbortHandler: this.unregisterAbortHandler,
				unregisterPauseHandler: this.unregisterPauseHandler,
				unregisterUnpauseHandler: this.unregisterUnpauseHandler,
			}) : fn.native(args, {
				call: (fn, args) => this._fn(fn, args, [...callStack, info]),
				topCall: this.execFn,
				registerAbortHandler: this.registerAbortHandler,
				registerPauseHandler: this.registerPauseHandler,
				registerUnpauseHandler: this.registerUnpauseHandler,
				unregisterAbortHandler: this.unregisterAbortHandler,
				unregisterPauseHandler: this.unregisterPauseHandler,
				unregisterUnpauseHandler: this.unregisterUnpauseHandler,
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
	private _evalClause(node: Ast.Statement | Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return this._eval(node, Ast.isStatement(node) ? scope.createChildScope() : scope, callStack);
	}

	@autobind
	private _evalClauseSync(node: Ast.Statement | Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return this._evalSync(node, Ast.isStatement(node) ? scope.createChildScope() : scope, callStack);
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
		if (this.stop) return NULL;
		if (this.pausing) await this.pausing.promise;
		// irqRateが小数の場合は不等間隔になる
		if (this.irqRate !== 0 && this.stepCount % this.irqRate >= this.irqRate - 1) {
			await this.irqSleep();
		}
		this.stepCount++;
		if (this.opts.maxStep && this.stepCount > this.opts.maxStep) {
			throw new AiScriptRuntimeError('max step exceeded');
		}

		return evaluateAsync(this.asyncEvaluatorContext, node, scope, callStack);
	}

	@autobind
	private __evalSync(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		if (this.stop) return NULL;

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
		this.abortHandlers.push(handler);
	}
	@autobind
	public registerPauseHandler(handler: () => void): void {
		this.pauseHandlers.push(handler);
	}
	@autobind
	public registerUnpauseHandler(handler: () => void): void {
		this.unpauseHandlers.push(handler);
	}

	@autobind
	public unregisterAbortHandler(handler: () => void): void {
		this.abortHandlers = this.abortHandlers.filter(h => h !== handler);
	}
	@autobind
	public unregisterPauseHandler(handler: () => void): void {
		this.pauseHandlers = this.pauseHandlers.filter(h => h !== handler);
	}
	@autobind
	public unregisterUnpauseHandler(handler: () => void): void {
		this.unpauseHandlers = this.unpauseHandlers.filter(h => h !== handler);
	}

	@autobind
	public abort(): void {
		this.stop = true;
		for (const handler of this.abortHandlers) {
			handler();
		}
		this.abortHandlers = [];
	}

	@autobind
	public pause(): void {
		if (this.pausing) return;
		let resolve: () => void;
		const promise = new Promise<void>(r => { resolve = () => r(); });
		this.pausing = { promise, resolve: resolve! };
		for (const handler of this.pauseHandlers) {
			handler();
		}
		this.pauseHandlers = [];
	}

	@autobind
	public unpause(): void {
		if (!this.pausing) return;
		this.pausing.resolve();
		this.pausing = null;
		for (const handler of this.unpauseHandlers) {
			handler();
		}
		this.unpauseHandlers = [];
	}

	@autobind
	private async getReference(dest: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Reference | Control> {
		switch (dest.type) {
			case 'identifier': {
				return Reference.variable(dest.name, scope);
			}
			case 'index': {
				const assignee = await this._eval(dest.target, scope, callStack);
				if (isControl(assignee)) {
					return assignee;
				}
				const i = await this._eval(dest.index, scope, callStack);
				if (isControl(i)) {
					return i;
				}
				if (isArray(assignee)) {
					assertNumber(i);
					return Reference.index(assignee, i.value);
				} else if (isObject(assignee)) {
					assertString(i);
					return Reference.prop(assignee, i.value);
				} else {
					throw new AiScriptRuntimeError(`Cannot read prop (${reprValue(i)}) of ${assignee.type}.`);
				}
			}
			case 'prop': {
				const assignee = await this._eval(dest.target, scope, callStack);
				if (isControl(assignee)) {
					return assignee;
				}
				assertObject(assignee);

				return Reference.prop(assignee, dest.name);
			}
			case 'arr': {
				const items: Reference[] = [];
				for (const item of dest.value) {
					const ref = await this.getReference(item, scope, callStack);
					if (isControl(ref)) {
						return ref;
					}
					items.push(ref);
				}
				return Reference.arr(items);
			}
			case 'obj': {
				const entries = new Map<string, Reference>();
				for (const [key, item] of dest.value.entries()) {
					const ref = await this.getReference(item, scope, callStack);
					if (isControl(ref)) {
						return ref;
					}
					entries.set(key, ref);
				}
				return Reference.obj(entries);
			}
			default: {
				throw new AiScriptRuntimeError('The left-hand side of an assignment expression must be a variable or a property/index access.');
			}
		}
	}

	@autobind
	private getReferenceSync(dest: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Reference | Control {
		switch (dest.type) {
			case 'identifier': {
				return Reference.variable(dest.name, scope);
			}
			case 'index': {
				const assignee = this._evalSync(dest.target, scope, callStack);
				if (isControl(assignee)) {
					return assignee;
				}
				const i = this._evalSync(dest.index, scope, callStack);
				if (isControl(i)) {
					return i;
				}
				if (isArray(assignee)) {
					assertNumber(i);
					return Reference.index(assignee, i.value);
				} else if (isObject(assignee)) {
					assertString(i);
					return Reference.prop(assignee, i.value);
				} else {
					throw new AiScriptRuntimeError(`Cannot read prop (${reprValue(i)}) of ${assignee.type}.`);
				}
			}
			case 'prop': {
				const assignee = this._evalSync(dest.target, scope, callStack);
				if (isControl(assignee)) {
					return assignee;
				}
				assertObject(assignee);

				return Reference.prop(assignee, dest.name);
			}
			case 'arr': {
				const items: Reference[] = [];
				for (const item of dest.value) {
					const ref = this.getReferenceSync(item, scope, callStack);
					if (isControl(ref)) {
						return ref;
					}
					items.push(ref);
				}
				return Reference.arr(items);
			}
			case 'obj': {
				const entries = new Map<string, Reference>();
				for (const [key, item] of dest.value.entries()) {
					const ref = this.getReferenceSync(item, scope, callStack);
					if (isControl(ref)) {
						return ref;
					}
					entries.set(key, ref);
				}
				return Reference.obj(entries);
			}
			default: {
				throw new AiScriptRuntimeError('The left-hand side of an assignment expression must be a variable or a property/index access.');
			}
		}
	}
}
