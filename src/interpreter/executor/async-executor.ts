import { AiScriptError, NonAiScriptError } from '../../error.js';
import { autobind } from '../../utils/mini-autobind.js';
import { assertValue, unWrapRet } from '../control.js';
import { define, defineByDefinitionNode } from '../define.js';
import { expectAny } from '../util.js';
import { ERROR, NULL } from '../value.js';
import { evalValue } from '../evaluator/value-evaluator.js';
import { evalReference } from '../evaluator/reference-evaluator.js';
import { iterateDefinitionsInNamespaces } from './namespace.js';
import type { EvaluationStartStep, InstructionArgument, InstructionResult, InstructionType } from '../evaluator/step.js';
import type { CallInfo } from '../types.js';
import type { Value, VFn } from '../value.js';
import type { Control } from '../control.js';
import type { Ast, Scope } from '../../index.js';
import type { LogObject } from '../logger.js';
import type { EventHandlerRegistry } from '../events/manager.js';

export type AsyncExecutorOptions = {
	log: (type: string, params: LogObject) => void;
	eventHandlerRegistry: EventHandlerRegistry;
	/**
	 * 評価を続ける場合はtrue、停止する場合はfalseを返す
	 */
	preEval: () => Promise<boolean>;
	handleError: (e: unknown) => void;
};

export class AsyncExecutor {
	public log: (type: string, params: LogObject) => void;
	private eventHandlerRegistry: EventHandlerRegistry;
	private preEval: () => Promise<boolean>;
	private handleError: (e: unknown) => void;

	public constructor(options: AsyncExecutorOptions) {
		this.log = options.log;
		this.eventHandlerRegistry = options.eventHandlerRegistry;
		this.preEval = options.preEval;
		this.handleError = options.handleError;
	}

	@autobind
	public async exec(script: Ast.Node[] | undefined, scope: Scope): Promise<void> {
		if (script == null || script.length === 0) return;
		try {
			await this.collectNs(script, scope);
			const result = await this.run(script, scope, []);
			assertValue(result);
			this.log('end', { val: result });
		} catch (e) {
			this.handleError(e);
		}
	}

	@autobind
	private async collectNs(script: Ast.Node[], scope: Scope): Promise<void> {
		for (const [node, nsScope] of iterateDefinitionsInNamespaces(script, scope)) {
			const value = await this.eval(node.expr, nsScope, []);
			assertValue(value);
			defineByDefinitionNode(node, nsScope, value);
		}
	}

	@autobind
	public async execFn(fn: VFn, args: Value[]): Promise<Value> {
		return await this.fn(fn, args, [])
			.catch(e => {
				this.handleError(e);
				return ERROR('func_failed');
			});
	}

	@autobind
	public async eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		try {
			if (!(await this.preEval())) return NULL;
			return await this.runEvaluationSteps(evalValue, node, scope, callStack);
		} catch (e) {
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
		}
	}

	@autobind
	public async fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Promise<Value> {
		if (fn.native) {
			const info: CallInfo = { name: '<native>', pos };
			const result = fn.native(args, {
				call: (fn, args) => this.fn(fn, args, [...callStack, info]),
				topCall: this.execFn,
				...this.eventHandlerRegistry,
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
			return unWrapRet(await this.run(fn.statements!, fnScope, [...callStack, info]));
		}
	}

	@autobind
	public async run(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		this.log('block:enter', { scope: scope.name });

		let v: Value | Control = NULL;

		for (let i = 0; i < program.length; i++) {
			const node = program[i]!;

			v = await this.eval(node, scope, callStack);
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

	private async runEvaluationSteps<R>(
		firstStep: EvaluationStartStep<Ast.Node, R>,
		node: Ast.Node,
		scope: Scope,
		callStack: readonly CallInfo[],
	): Promise<R> {
		let result = firstStep(node, scope, this.log);
		while (!result.done) {
			const input = await this.runInstructionAsync(result.instruction, callStack);
			result = result.then(input, this.log);
		}
		return result.value;
	}

	private async runInstructionAsync(
		instruction: InstructionArgument,
		callStack: readonly CallInfo[],
	): Promise<InstructionResult<InstructionType>> {
		switch (instruction.type) {
			case 'eval': return this.eval(instruction.node, instruction.scope, callStack);
			case 'evaluateReference': return this.runEvaluationSteps(evalReference, instruction.node, instruction.scope, callStack);
			case 'fn': return this.fn(instruction.fn, instruction.args, callStack, instruction.pos);
			case 'run': return this.run(instruction.program, instruction.scope, callStack);
		}
	}
}
