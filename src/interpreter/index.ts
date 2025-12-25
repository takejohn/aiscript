/**
 * AiScript interpreter
 */

import { autobind } from '../utils/mini-autobind.js';
import { AiScriptError, NonAiScriptError, AiScriptNamespaceError, AiScriptIndexOutOfRangeError, AiScriptRuntimeError, AiScriptHostsideError } from '../error.js';
import * as Ast from '../node.js';
import { nodeToJs } from '../utils/node-to-js.js';
import { Scope } from './scope.js';
import { std } from './lib/std.js';
import { RETURN, unWrapRet, BREAK, CONTINUE, assertValue, isControl, type Control, unWrapLabeledBreak } from './control.js';
import { assertNumber, assertString, assertFunction, assertBoolean, assertObject, assertArray, eq, isObject, isArray, expectAny, reprValue, isFunction } from './util.js';
import { NULL, FN_NATIVE, BOOL, NUM, STR, ARR, OBJ, FN, ERROR } from './value.js';
import { getPrimProp } from './primitive-props.js';
import { Variable } from './variable.js';
import { Reference } from './reference.js';
import type { JsValue } from './util.js';
import type { Value, VFn, VUserFn } from './value.js';
import type { AsyncEvaluationContext, CallInfo, LogObject, SyncEvaluationContext } from './evaluation.js';
import * as evaluators from './evaluators.js';

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
	private asyncEvaluationContext: AsyncEvaluationContext = {
		define: this.define,
		log: this.log,
		_eval: this._eval,
		_evalBinaryOperation: this._evalBinaryOperation,
		_evalClause: this._evalClause,
		_fn: this._fn,
		_run: this._run,
		evalAndSetAttr: this.evalAndSetAttr,
		getReference: this.getReference,
	};
	private syncEvaluationContext: SyncEvaluationContext = {
		define: this.define,
		log: this.log,
		_evalSync: this._evalSync,
		_evalBinaryOperationSync: this._evalBinaryOperationSync,
		_evalClauseSync: this._evalClauseSync,
		_fnSync: this._fnSync,
		_runSync: this._runSync,
		evalAndSetAttrSync: this.evalAndSetAttrSync,
		getReferenceSync: this.getReferenceSync,
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

					await this.evalAndSetAttr(node.attr, value, scope, []);

					if (
						node.expr.type === 'fn'
						&& isFunction(value)
						&& !value.native
					) {
						value.name = nsScope.getNsPrefix() + node.dest.name;
					}
					this.define(nsScope, node.dest, value, node.mut);

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

					this.evalAndSetAttrSync(node.attr, value, scope, []);

					if (
						node.expr.type === 'fn'
						&& isFunction(value)
						&& !value.native
					) {
						value.name = nsScope.getNsPrefix() + node.dest.name;
					}
					this.define(nsScope, node.dest, value, node.mut);

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
				this.define(fnScope, param.dest, arg ?? param.default!, true);
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
				this.define(fnScope, param.dest, arg ?? param.default!, true);
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
	private async _evalBinaryOperation(op: string, leftExpr: Ast.Expression, rightExpr: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const callee = scope.get(op);
		assertFunction(callee);
		const left = await this._eval(leftExpr, scope, callStack);
		if (isControl(left)) {
			return left;
		}
		const right = await this._eval(rightExpr, scope, callStack);
		if (isControl(right)) {
			return right;
		}
		return this._fn(callee, [left, right], callStack);
	}

	@autobind
	private _evalBinaryOperationSync(op: string, leftExpr: Ast.Expression, rightExpr: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const callee = scope.get(op);
		assertFunction(callee);
		const left = this._evalSync(leftExpr, scope, callStack);
		if (isControl(left)) {
			return left;
		}
		const right = this._evalSync(rightExpr, scope, callStack);
		if (isControl(right)) {
			return right;
		}
		return this._fnSync(callee, [left, right], callStack);
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

		switch (node.type) {
			case 'call': return await evaluators.callEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'if': return await evaluators.ifEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'match': return await evaluators.matchEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'loop': return await evaluators.loopEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'for': return await evaluators.forEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'each': return await evaluators.eachEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'def': return await evaluators.defEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'identifier': return await evaluators.identifierEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'assign': return await evaluators.assignEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'addAssign': return await evaluators.addAssignEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'subAssign': return await evaluators.subAssignEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'null': return await evaluators.nullEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'bool': return await evaluators.boolEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'num': return await evaluators.numEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'str': return await evaluators.strEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'arr': return await evaluators.arrEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'obj': return await evaluators.objEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'prop': return await evaluators.propEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'index': return await evaluators.indexEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'plus': return await evaluators.plusEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'minus': return await evaluators.minusEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'not': return await evaluators.notEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'fn': return await evaluators.fnEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'block': return await evaluators.blockEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'exists': return await evaluators.existsEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'tmpl': return await evaluators.tmplEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'return': return await evaluators.returnEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'break': return await evaluators.breakEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'continue': return await evaluators.continueEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'ns': return await evaluators.nsEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'meta': return await evaluators.metaEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'pow': return await evaluators.powEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'mul': return await evaluators.mulEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'div': return await evaluators.divEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'rem': return await evaluators.remEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'add': return await evaluators.addEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'sub': return await evaluators.subEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'lt': return await evaluators.ltEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'lteq': return await evaluators.lteqEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'gt': return await evaluators.gtEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'gteq': return await evaluators.gteqEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'eq': return await evaluators.eqEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'neq': return await evaluators.neqEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'and': return await evaluators.andEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'or': return await evaluators.orEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			case 'namedTypeSource':
			case 'fnTypeSource':
			case 'unionTypeSource':
			case 'attr': return await evaluators.namedTypeSourceFnTypeSourceUnionTypeSourceAttrEvaluator.evalAsync(this.asyncEvaluationContext, node, scope, callStack);

			default: {
				node satisfies never;
				throw new Error('invalid node type');
			}
		}
	}
	
	@autobind
	private __evalSync(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		if (this.stop) return NULL;

		this.stepCount++;
		if (this.opts.maxStep && this.stepCount > this.opts.maxStep) {
			throw new AiScriptRuntimeError('max step exceeded');
		}

		switch (node.type) {
			case 'call': return evaluators.callEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'if': return evaluators.ifEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'match': return evaluators.matchEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'loop': return evaluators.loopEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'for': return evaluators.forEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'each': return evaluators.eachEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'def': return evaluators.defEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'identifier': return evaluators.identifierEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'assign': return evaluators.assignEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'addAssign': return evaluators.addAssignEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'subAssign': return evaluators.subAssignEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'null': return evaluators.nullEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'bool': return evaluators.boolEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'num': return evaluators.numEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'str': return evaluators.strEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'arr': return evaluators.arrEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'obj': return evaluators.objEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'prop': return evaluators.propEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'index': return evaluators.indexEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'plus': return evaluators.plusEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'minus': return evaluators.minusEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'not': return evaluators.notEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'fn': return evaluators.fnEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'block': return evaluators.blockEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'exists': return evaluators.existsEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'tmpl': return evaluators.tmplEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'return': return evaluators.returnEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'break': return evaluators.breakEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'continue': return evaluators.continueEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'ns': return evaluators.nsEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'meta': return evaluators.metaEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'pow': return evaluators.powEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'mul': return evaluators.mulEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'div': return evaluators.divEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'rem': return evaluators.remEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'add': return evaluators.addEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'sub': return evaluators.subEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'lt': return evaluators.ltEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'lteq': return evaluators.lteqEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'gt': return evaluators.gtEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'gteq': return evaluators.gteqEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'eq': return evaluators.eqEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'neq': return evaluators.neqEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'and': return evaluators.andEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'or': return evaluators.orEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			case 'namedTypeSource':
			case 'fnTypeSource':
			case 'unionTypeSource':
			case 'attr': return evaluators.namedTypeSourceFnTypeSourceUnionTypeSourceAttrEvaluator.evalSync(this.syncEvaluationContext, node, scope, callStack);

			default: {
				node satisfies never;
				throw new Error('invalid node type');
			}
		}
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
	private async evalAndSetAttr(attr: Ast.Attribute[], value: Value, scope: Scope, callStack: readonly CallInfo[]): Promise<void> {
		if (attr.length > 0) {
			const attrs: Value['attr'] = [];
			for (const nAttr of attr) {
				const value = await this._eval(nAttr.value, scope, callStack);
				assertValue(value);
				attrs.push({
					name: nAttr.name,
					value,
				});
			}
			value.attr = attrs;
		}
	}

	@autobind
	private evalAndSetAttrSync(attr: Ast.Attribute[], value: Value, scope: Scope, callStack: readonly CallInfo[]): void {
		if (attr.length > 0) {
			const attrs: Value['attr'] = [];
			for (const nAttr of attr) {
				const value = this._evalSync(nAttr.value, scope, callStack);
				assertValue(value);
				attrs.push({
					name: nAttr.name,
					value,
				});
			}
			value.attr = attrs;
		}
	}

	@autobind
	private define(scope: Scope, dest: Ast.Expression, value: Value, isMutable: boolean): void {
		switch (dest.type) {
			case 'identifier': {
				scope.add(dest.name, { isMutable, value });
				break;
			}
			case 'arr': {
				assertArray(value);
				dest.value.map(
					(item, index) => this.define(scope, item, value.value[index] ?? NULL, isMutable),
				);
				break;
			}
			case 'obj': {
				assertObject(value);
				[...dest.value].map(
					([key, item]) => this.define(scope, item, value.value.get(key) ?? NULL, isMutable),
				);
				break;
			}
			default: {
				throw new AiScriptRuntimeError('The left-hand side of an definition expression must be a variable.');
			}
		}
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
