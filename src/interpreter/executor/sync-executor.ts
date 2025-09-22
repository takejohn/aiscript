import { AiScriptHostsideError } from '../../error.js';
import { autobind } from '../../utils/mini-autobind.js';
import { assertValue, unWrapRet } from '../control.js';
import { define, defineByDefinitionNode } from '../define.js';
import { expectAny } from '../util.js';
import { NULL } from '../value.js';
import { evalValue } from '../evaluator/value-evaluator.js';
import { evalReference } from '../evaluator/reference-evaluator.js';
import { iterateNs } from './namespace.js';
import type { EvaluationStartStep, InstructionArgument, InstructionResult, InstructionType } from '../evaluator/step.js';
import type { Ast, Scope } from '../../index.js';
import type { Control } from '../control.js';
import type { EventHandlerRegistry } from '../events/manager.js';
import type { LogObject } from '../logger.js';
import type { CallInfo } from '../types.js';
import type { Value, VFn, VNativeFn } from '../value.js';
import type { AsyncExecutor } from './async-executor.js';

export type SyncExecutorOptions = {
	log: (type: string, params: LogObject) => void;
	eventHandlerRegistry: EventHandlerRegistry;
	/**
	 * 評価を続ける場合はtrue、停止する場合はfalseを返す
	 */
	preEval: () => boolean;
	asyncEvaluator: AsyncExecutor;
}

export class SyncExecutor {
	public log: (type: string, params: LogObject) => void;
	private preEval: () => boolean;
	private eventHandlerRegistry: EventHandlerRegistry;
	private asyncEvaluator: AsyncExecutor;

	constructor(options: SyncExecutorOptions) {
		this.log = options.log;
		this.preEval = options.preEval;
		this.eventHandlerRegistry = options.eventHandlerRegistry;
		this.asyncEvaluator = options.asyncEvaluator;
	}

	@autobind
	public exec(script: Ast.Node[] | undefined, scope: Scope): Value | undefined {
		if (script == null || script.length === 0) return;
		this.collectNs(script, scope);
		const result = this.run(script, scope, []);
		assertValue(result);
		return result;
	}

	@autobind
	public execFn(fn: VFn, args: Value[]): Value {
		return this.fn(fn, args, []);
	}

	@autobind
	private collectNs(script: Ast.Node[], scope: Scope): void {
		for (const [node, nsScope] of iterateNs(script, scope)) {
			const value = this.eval(node.expr, nsScope, []);
			assertValue(value);
			defineByDefinitionNode(node, nsScope, value);
		}
	}

	@autobind
	public eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		if (!this.preEval()) return NULL;
		return this.runEvaluationSteps(evalValue, node, scope, callStack);
	}

	@autobind
	public fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Value {
		if (fn.native) {
			const result = this.callNativeFn(fn, args, callStack, pos);
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
			return unWrapRet(this.run(fn.statements!, fnScope, [...callStack, info]));
		}
	}

	@autobind
	private callNativeFn(fn: VNativeFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Value | Promise<Value> | void {
		const info: CallInfo = { name: '<native>', pos };
		if (fn.nativeSync) {
			return fn.nativeSync(args, {
				call: (fn, args) => this.fn(fn, args, [...callStack, info]),
				topCall: this.execFn,
				...this.eventHandlerRegistry,
			});
		} else {
			return fn.native(args, {
				call: (fn, args) => this.asyncEvaluator.fn(fn, args, [...callStack, info]),
				topCall: this.asyncEvaluator.execFn,
				...this.eventHandlerRegistry,
			});
		}
	}

	@autobind
	public run(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		this.log('block:enter', { scope: scope.name });

		let v: Value | Control = NULL;

		for (let i = 0; i < program.length; i++) {
			const node = program[i]!;

			v = this.eval(node, scope, callStack);
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

	private runEvaluationSteps<R>(
		firstStep: EvaluationStartStep<Ast.Node, R>,
		node: Ast.Node,
		scope: Scope,
		callStack: readonly CallInfo[],
	): R {
		let result = firstStep(node, scope, this.log);
		while (!result.done) {
			const input = this.runInstructionAsync(result.instruction, callStack);
			result = result.then(input, this.log);
		}
		return result.value;
	}

	private runInstructionAsync(
		instruction: InstructionArgument,
		callStack: readonly CallInfo[],
	): InstructionResult<InstructionType> {
		switch (instruction.type) {
			case 'eval': return this.eval(instruction.node, instruction.scope, callStack);
			case 'evaluateReference': return this.runEvaluationSteps(evalReference, instruction.node, instruction.scope, callStack);
			case 'fn': return this.fn(instruction.fn, instruction.args, callStack, instruction.pos);
			case 'run': return this.run(instruction.program, instruction.scope, callStack);
		}
	}
}
